/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global uuid, dump, SettingsCache */

/**
 * A simple ping that is kicked off on first time use
 */
(function(exports) {
  var DEBUG = false;

  const FTU_PING_ACTIVATION = 'ftu.pingActivation';
  const FTU_PING_ENABLED = 'ftu.pingEnabled';
  const FTU_PING_ID = 'ftu.pingID';
  // We use these two variables for ping retrying count. In phone version, we
  // use it for waiting for mobile connection.
  const FTU_PING_MAX_NETWORK_FAILS = 'ftu.pingMaxNetworkFails';
  const FTU_PING_NETWORK_FAIL_COUNT = 'ftu.pingNetworkFailCount';
  const FTU_PING_URL = 'ftu.pingURL';
  const FTU_PING_TIMEOUT = 'ftu.pingTimeout';
  const FTU_PING_TRY_INTERVAL = 'ftu.pingTryInterval';

  const DEFAULT_TRY_INTERVAL = 60 * 60 * 1000;
  const DEFAULT_MAX_NETWORK_FAILS = 24;
  const DEFAULT_PING_TIMEOUT = 60 * 1000;

  // Used by the telemetry server to help identify the payload format
  const PING_PAYLOAD_VERSION = 3;

  // Settings to observe value changes for while the ping has not been sent
  const OBSERVE_SETTINGS = ['deviceinfo.os',
                            'deviceinfo.software',
                            'deviceinfo.platform_build_id',
                            'deviceinfo.platform_version',
                            'deviceinfo.product_model',
                            'deviceinfo.firmware_revision',
                            'deviceinfo.hardware',
                            'app.update.channel'];

  function FtuPing() {
  }

  FtuPing.prototype = {
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

    // Timeout for ping requests
    _pingTimeout: DEFAULT_PING_TIMEOUT,
    _settingObserver: null,

    debug: function fp_debug(msg) {
      if (DEBUG) {
        dump('[FtuPing] ' + msg + '\n');
      }
    },

    reset: function fp_reset() {
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

    initSettings: function fp_initSettings(callback) {
      this.reset();

      this._pingData.ver = PING_PAYLOAD_VERSION;
      this._pingData.screenHeight = window.screen.height;
      this._pingData.screenWidth = window.screen.width;
      this._pingData.devicePixelRatio = window.devicePixelRatio;
      this._pingData.locale = window.navigator.language;

      var self = this;
      this.getAsyncStorageItems([FTU_PING_ID, FTU_PING_ACTIVATION,
                                 FTU_PING_ENABLED,
                                 FTU_PING_NETWORK_FAIL_COUNT], function(items) {

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

          self.getSettings(allSettings, function(settings) {
            self._pingURL = settings[FTU_PING_URL];
            self._tryInterval = settings[FTU_PING_TRY_INTERVAL] ||
                                self._tryInterval;
            self._pingTimeout = settings[FTU_PING_TIMEOUT] || self._pingTimeout;
            self._maxNetworkFails = settings[FTU_PING_MAX_NETWORK_FAILS] ||
                                    self._maxNetworkFails;

            if (!self._settingObserver) {
              self._settingObserver = self.onSettingChanged.bind(self);
            }

            OBSERVE_SETTINGS.forEach(function(observeSetting) {
              self._pingData[observeSetting] = settings[observeSetting];
              SettingsCache.observe(observeSetting, null, function(value) {
                self._settingObserver(observeSetting, value);
              });
            });

            if (callback) {
              callback();
            }
          });
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
      settingKeys.forEach(function(key) {
        SettingsCache.get(key, function(value) {
          settingsLeft--;
          settings[key] = value;
          if (settingsLeft === 0 && callback) {
            callback(settings);
          }
        });
      });
    },

    ensurePing: function fp_ensurePing() {
      this.initSettings(this.startPing.bind(this));
    },

    onSettingChanged: function fp_onSettingChanged(key, value) {
      this._pingData[key] = value;
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

    tryPing: function fp_tryPing() {
      try {
        if (this._networkFailCount >= this._maxNetworkFails) {
          this.debug('Max voice network failures reached, pinging anyway!');
          return false;
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

    generatePingURL: function fp_generatePingURL() {
      var version = this._pingData['deviceinfo.platform_version'] || 'unknown';
      var updateChannel = this._pingData['app.update.channel'] || 'unknown';
      var buildId = this._pingData['deviceinfo.platform_build_id'] || 'unknown';

      var uriParts = [
        this._pingURL,
        encodeURIComponent(this._pingData.pingID),
        'ftu',                             // 'reason'
        'FirefoxOS',                       // 'appName'
        encodeURIComponent(version),       // 'appVersion'
        encodeURIComponent(updateChannel), // 'appUpdateChannel'
        encodeURIComponent(buildId)        // 'appBuildID'
      ];

      return uriParts.join('/');
    },

    ping: function fp_ping() {
      var url = this.generatePingURL();
      this._pingData.pingTime = Date.now();

      if (DEBUG) {
        this.debug(url);
        this.debug(JSON.stringify(this._pingData));
      }

      var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
      xhr.timeout = this._pingTimeout;

      var self = this;
      xhr.onload = function() {
        self.pingSuccess(xhr.responseText);
      };

      xhr.ontimeout = function() {
        self.pingError('Timed out');
      };

      xhr.onerror = function() {
        self.pingError(xhr.statusText);
      };

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.responseType = 'text';
      xhr.send(JSON.stringify(this._pingData));
    },

    pingSuccess: function fp_pingSuccess(result) {
      if (result !== 'OK') {
        this.debug('Ping response unexpected: ' + result);
        return;
      }

      this._pingEnabled = false;
      window.asyncStorage.setItem(FTU_PING_ENABLED, false);
      // XXX: we don't have unobserve

      // var settings = window.navigator.mozSettings;
      // OBSERVE_SETTINGS.forEach(function(setting) {
      //   settings.removeObserver(setting, this._settingObserver);
      // }, this);

      clearInterval(this._pingTimer);
    },

    pingError: function fp_pingError(message) {
      this.debug('Ping error: ' + message);
      this._networkFailCount++;
      window.asyncStorage.setItem(FTU_PING_NETWORK_FAIL_COUNT,
                                  this._networkFailCount);
    },

    isEnabled: function fp_isEnabled() {
      return this._pingEnabled;
    },

    getPingURL: function fp_getPingURL() {
      return this._pingURL;
    },

    getPingData: function fp_getPingData() {
      return this._pingData;
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
