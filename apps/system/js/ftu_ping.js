/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global MobileOperator, SIMSlotManager, uuid, dump, TelemetryRequest */

/**
 * A simple ping that is kicked off on first time use
 */
(function(exports) {
  var DEBUG = false;

  const FTU_PING_ACTIVATION = 'ftu.pingActivation';
  const FTU_PING_ENABLED = 'ftu.pingEnabled';
  const FTU_PING_ID = 'ftu.pingID';
  const FTU_PING_MAX_NETWORK_FAILS = 'ftu.pingMaxNetworkFails';
  const FTU_PING_NETWORK_FAIL_COUNT = 'ftu.pingNetworkFailCount';
  const FTU_PING_URL = 'ftu.pingURL';
  const FTU_PING_TIMEOUT = 'ftu.pingTimeout';
  const FTU_PING_TRY_INTERVAL = 'ftu.pingTryInterval';

  const DEFAULT_TRY_INTERVAL = 60 * 60 * 1000;
  const DEFAULT_MAX_NETWORK_FAILS = 24;
  const DEFAULT_PING_TIMEOUT = 60 * 1000;

  // Used by the telemetry server to help identify the payload format
  const TELEMETRY_VERSION = 1;
  const TELEMETRY_REASON = 'ftu';

  // Settings to observe value changes for while the ping has not been sent
  const OBSERVE_SETTINGS = ['deviceinfo.os',
                            'deviceinfo.software',
                            'deviceinfo.product_model',
                            'deviceinfo.firmware_revision',
                            'deviceinfo.hardware'];

  const URL_SETTINGS = ['deviceinfo.platform_build_id',
                        'deviceinfo.platform_version',
                        'app.update.channel'];

  function FtuPing() {
  }

  FtuPing.prototype = {
    // whether or not required properties have been loaded
    _pingReady: false,
    _pingReadyCallback: null,

    // interval timer for first time ping
    _pingTimer: null,

    // time between ping tries
    _tryInterval: DEFAULT_TRY_INTERVAL,

    // URL for first time ping
    _pingURL: null,

    // Whether or not FTU ping is enabled
    _pingEnabled: true,

    // The number of times to wait for SIM / voice network data before sending
    // the ping anyway
    _maxNetworkFails: DEFAULT_MAX_NETWORK_FAILS,

    // Number of network failures accrued
    _networkFailCount: 0,

    // Data used in ping
    _pingData: {},

    // Data used in info
    _infoData: {},

    // Timeout for ping requests
    _pingTimeout: DEFAULT_PING_TIMEOUT,
    _settingObserver: null,

    debug: function fp_debug(msg) {
      if (DEBUG) {
        dump('[FtuPing] ' + msg + '\n');
      }
    },

    reset: function fp_reset() {
      this._pingReady = false;
      this._pingReadyCallback = null;
      this._pingTimer = null;
      this._tryInterval = DEFAULT_TRY_INTERVAL;
      this._pingTimeout = DEFAULT_PING_TIMEOUT;
      this._settingObserver = null;

      this._pingURL = null;
      this._pingEnabled = true;

      this._maxNetworkFails = DEFAULT_MAX_NETWORK_FAILS;
      this._networkFailCount = 0;

      this._pingData = {};
    },

    initSettings: function fp_initSettings() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.reset();

        self._pingData.screenHeight = window.screen.height;
        self._pingData.screenWidth = window.screen.width;
        self._pingData.devicePixelRatio = window.devicePixelRatio;

        self.getAsyncStorageItems([FTU_PING_ID, FTU_PING_ACTIVATION,
                                   FTU_PING_ENABLED,
                                   FTU_PING_NETWORK_FAIL_COUNT],
                                  function(items) {

          self._pingData.pingID = items[FTU_PING_ID];
          self._pingData.activationTime = items[FTU_PING_ACTIVATION];
          self._pingEnabled = items[FTU_PING_ENABLED];

          if (!self._pingData.pingID) {
            self._pingData.pingID = uuid();
            window.asyncStorage.setItem(FTU_PING_ID, self._pingData.pingID);
          }

          if (!self._pingData.activationTime) {
            self._pingData.activationTime = Date.now();
            window.asyncStorage.setItem(FTU_PING_ACTIVATION,
                                        self._pingData.activationTime);
          }

          if (self._pingEnabled === null) {
            self._pingEnabled = true;
          }

          if (typeof(items[FTU_PING_NETWORK_FAIL_COUNT]) === 'number') {
            self._networkFailCount = items[FTU_PING_NETWORK_FAIL_COUNT];
          }

          var allSettings = [FTU_PING_URL, FTU_PING_TRY_INTERVAL,
                             FTU_PING_TIMEOUT, FTU_PING_MAX_NETWORK_FAILS].
                            concat(OBSERVE_SETTINGS);
          allSettings = allSettings.concat(URL_SETTINGS);

          self.getSettings(allSettings, function(settings) {
            self._pingURL = settings[FTU_PING_URL];
            self._tryInterval = settings[FTU_PING_TRY_INTERVAL] ||
                                self._tryInterval;
            self._pingTimeout = settings[FTU_PING_TIMEOUT] || self._pingTimeout;
            self._maxNetworkFails = settings[FTU_PING_MAX_NETWORK_FAILS] ||
                                    self._maxNetworkFails;

            var mozSettings = window.navigator.mozSettings;
            if (!self._settingObserver) {
              self._settingObserver = self.onSettingChanged.bind(self);
            }

            OBSERVE_SETTINGS.forEach(function(observeSetting) {
              self._pingData[observeSetting] = settings[observeSetting];
              mozSettings.addObserver(observeSetting, self._settingObserver);
            });

            URL_SETTINGS.forEach(function(urlSetting) {
              self._infoData[urlSetting] = settings[urlSetting];
              mozSettings.addObserver(urlSetting, self._settingObserver);
            });
            resolve();
          });
        });
      });
    },

    initPreinstalledApps: function fp_initPreinstalledApps(callback) {
      var preinstalled = this._pingData.preinstalled = {};
      var self = this;

      return new Promise(function(resolve, reject) {
        window.navigator.mozApps.mgmt.getAll().onsuccess = function(evt) {
          var apps = evt.target.result;

          apps.forEach(function(app) {
            var url;
            try {
              url = new URL(app.manifestURL);
            } catch (e) {
              // Don't die if somehow the manifestURL is invalid
            }

            // Only report non-gaia apps
            if (!url || url.hostname.indexOf('gaiamobile.org') === -1) {
              preinstalled[app.manifestURL] = app.manifest.name;
            }
          });

          self.debug(self._pingData.preinstalled);
          resolve();
        };
      });
    },

    getAsyncStorageItems: function fp_getAsyncStorageItems(itemKeys, callback) {
      var itemsLeft = itemKeys.length;
      var items = {};
      itemKeys.forEach(function(key) {
        window.asyncStorage.getItem(key, function(value) {
          itemsLeft--;
          items[key] = value;
          if (itemsLeft === 0 && callback) {
            callback(items);
          }
        });
      });
    },

    getSettings: function fp_getSettings(settingKeys, callback) {
      var settingsLeft = settingKeys.length;
      var settings = {};
      var lock = window.navigator.mozSettings.createLock();
      settingKeys.forEach(function(key) {
        var request = lock.get(key);
        request.onsuccess = function(evt) {
          var value = request.result[key];
          settingsLeft--;
          settings[key] = value;
          if (settingsLeft === 0 && callback) {
            callback(settings);
          }
        };
      });
    },

    ensurePing: function fp_ensurePing() {
      var initPromises = [this.initSettings(), this.initPreinstalledApps()];
      Promise.all(initPromises).then(this.startPing.bind(this));
    },

    onSettingChanged: function fp_onSettingChanged(evt) {
      this._pingData[evt.settingName] = evt.settingValue;
    },

    startPing: function fp_startPing() {
      if (this._pingEnabled === false) {
        this.debug('FTU ping disabled');
        return;
      }

      if (!this._pingURL) {
        this.debug('No FTU ping URL');
        return;
      }
      if (this._pingTimer !== null) {
          return;
      }

      this.debug('Starting FTU ping');
      this._pingTimer = setInterval(this.tryPing.bind(this), this._tryInterval);
    },

    maybeThrowNetworkFailure: function fp_maybeThrowNetworkFailure(message) {
        this._networkFailCount++;
        window.asyncStorage.setItem(FTU_PING_NETWORK_FAIL_COUNT,
                                    this._networkFailCount);

        if (this._networkFailCount < this._maxNetworkFails) {
          throw message + ' (' + this._networkFailCount + ' of ' +
                this._maxNetworkFails + ' failures)';
        } else {
          this.debug('Warning: ' + message);
        }
    },

    checkMobileNetwork: function fp_checkMobileNetwork() {
      // Wait until we have a valid network connection
      if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
        this.maybeThrowNetworkFailure('No SIM cards connected to a network');
      }

      var conns = window.navigator.mozMobileConnections;
      if (!conns || conns.length === 0) {
        this.maybeThrowNetworkFailure('No mobile connections');
        return;
      }

      var slots = SIMSlotManager.getSlots().filter(function(slot) {
        return !slot.isAbsent() && !slot.isLocked();
      });

      if (slots.length === 0) {
        this.maybeThrowNetworkFailure('No unlocked or active SIM cards found');
        return;
      }

      var conn = slots[0].conn;
      var iccObj = navigator.mozIccManager.getIccById(conn.iccId);
      var iccInfo = iccObj ? iccObj.iccInfo : null;
      var voiceNetwork = conn.voice ? conn.voice.network : null;

      if (!iccInfo && !voiceNetwork) {
        this.maybeThrowNetworkFailure('No voice network or ICC info');
        return;
      }

      this._pingData.network = MobileOperator.userFacingInfo(conn);
      if (voiceNetwork) {
        this._pingData.network.mnc = voiceNetwork.mnc;
        this._pingData.network.mcc = voiceNetwork.mcc;
      }

      if (iccInfo) {
        this._pingData.icc = {
          mnc: iccInfo.mnc,
          mcc: iccInfo.mcc,
          spn: iccInfo.spn
        };
      }
    },

    tryPing: function fp_tryPing() {
      try {
        this.checkMobileNetwork();
        if (this._networkFailCount >= this._maxNetworkFails) {
          this.debug('Max voice network failures reached, pinging anyway!');
          if (this._pingData.network === undefined) {
            this._pingData.network = null;
          }

          if (this._pingData.icc === undefined) {
            this._pingData.icc = null;
          }
        }

        if (!this._pingData['deviceinfo.os']) {
          this.debug('No OS information, holding off');
          return false;
        }

        this.ping();
        return true;
      } catch (e) {
        this.debug('Error while trying FTU ping: ' + e);
        return false;
      }
    },

    ping: function fp_ping() {
      var pingData = this.assemblePingData();
      var request = new TelemetryRequest({
        reason: TELEMETRY_REASON,
        deviceID: pingData.pingID,
        ver: TELEMETRY_VERSION,
        url: this._pingURL,
        appUpdateChannel: this._infoData['app.update.channel'],
        appVersion: this._infoData['deviceinfo.platform_version'],
        appBuildID: this._infoData['deviceinfo.platform_build_id']
      }, pingData);

      var self = this;
      request.send({
        timeout: this._pingTimeout,
        onload: function() {
          self.pingSuccess(this.responseText);
        },
        ontimeout: function() {
          self.pingError('Timed out');
        },
        onerror: function() {
          self.pingError(this.statusText);
        }
      });
    },

    pingSuccess: function fp_pingSuccess(result) {
      if (result !== 'OK') {
        this.debug('Ping response unexpected: ' + result);
        return;
      }

      this._pingEnabled = false;
      window.asyncStorage.setItem(FTU_PING_ENABLED, false);

      var settings = window.navigator.mozSettings;
      OBSERVE_SETTINGS.forEach(function(setting) {
        settings.removeObserver(setting, this._settingObserver);
      }, this);

      URL_SETTINGS.forEach(function(setting) {
        settings.removeObserver(setting, this._settingObserver);
      }, this);

      clearInterval(this._pingTimer);
    },

    pingError: function fp_pingError(message) {
      this.debug('Ping error: ' + message);
    },

    isEnabled: function fp_isEnabled() {
      return this._pingEnabled;
    },

    getPingURL: function fp_getPingURL() {
      return this._pingURL;
    },

    assemblePingData: function fp_assemblePingData() {
      this._pingData.pingTime = Date.now();
      this._pingData.locale = window.navigator.language;
      return this._pingData;
    },

    getInfoData: function fp_getInfoData() {
      return this._infoData;
    },

    getNetworkFailCount: function fp_getNetworkFailCount() {
      return this._networkFailCount;
    },

    getTryInterval: function fp_getTryInterval() {
      return this._tryInterval;
    },

    getPingTimeout: function fp_getPingTimeout() {
      return this._pingTimeout;
    },

    getMaxNetworkFails: function fp_getMaxNetworkFails() {
      return this._maxNetworkFails;
    }
  };

  exports.FtuPing = FtuPing;
}(window));
