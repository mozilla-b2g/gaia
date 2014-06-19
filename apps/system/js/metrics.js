/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global dump */

/**
 * Send usage metrics at regular intervals
 */
(function(exports) {
  var DEBUG = true;

  var debug = DEBUG ? function(msg) {
    dump('[Metrics] ' + msg + '\n');
  } : function() {};

  var METRICS_ENABLED = 'metrics.enabled';
  var METRICS_INTERVAL = 'metrics.interval';
  var METRICS_RETRY_INTERVAL = 'metrics.retryInterval';
  var METRICS_URL = 'metrics.url';
  var METRICS_DATA = 'metrics.data';

  var DEFAULT_INTERVAL = 24 * 60 * 60 * 1000;
  var DEFAULT_RETRY_INTERVAL = 60 * 60 * 1000;
  var STATE_IDLE = 0;
  var STATE_SENDING = 1;

  function getSettings(settingKeys, callback) {
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
  }

  function Metrics() {
    var settings = window.navigator.mozSettings;
    if (!settings) {
      return;
    }

    var lock = settings.createLock();
    var req = lock.get(METRICS_ENABLED);
    req.onsuccess = function() {
      var value = req.result[METRICS_ENABLED];
      if (value === true) {
        this.startService();
      }
    };
  }

  Metrics.prototype = {
    _data: {
      startTimestamp: 0,
      stopTimestamp: 0,
      appUsage: {},
      appUninstalls: [],
    },
    _dataToSend: null,
    _deviceInfo: {},
    _enabled: false,
    _interval: DEFAULT_INTERVAL,
    _lastTick: 0,
    _resend: false,
    _retryInterval: DEFAULT_RETRY_INTERVAL,
    _retryTimer: null,
    _settingObserver: null,
    _state: STATE_IDLE,
    _tickInterval: DEFAULT_RETRY_INTERVAL,
    _timer: null,
    _timeSinceLastSend: 0,
    _url: null,

    _onSendSuccess: function(result) {
      if (result !== 'OK') {
        debug('Ping response unexpected: ' + result);
        return;
      }

      this._state = STATE_IDLE;
      this._resend = false;
      this._dataToSend = null;
    },

    _onSettingsReady: function() {
      if (!this._enabled) {
        return;
      }

      var settings = window.navigator.mozSettings;
      this._settingObserver = this._onSettingChanged.bind(this);
      settings.addObserver(METRICS_ENABLED, this._settingObserver);

      this._tickInterval = Math.min(this._interval, this._retryInterval);
      this._timer = setInterval(this._tick.bind(this), this._interval);
    },

    _onSettingChanged: function(evt) {
      switch (evt.settingName) {
        case METRICS_ENABLED:
          var enabled = evt.settingValue;
          if (!enabled && this._enabled) {
            this.stopService();
          } else if (enabled && !this._enabled) {
            this.startService();
          }
          this._enabled = enabled;
          break;
      }
    },

    _recordAppOpening: function(appUrl, time) {
      debug('App opening: ' + appUrl);
      this._updateTimestamps(time);
      var usage = this._data.appUsage[appUrl];
      if (usage === undefined) {
        usage = this._data.appUsage[appUrl] = {
          openCount: 0,
          closeCount: 0,
          crashCount: 0,
          totalTime: 0
        };
      }

      if (usage.launchTime) {
        // App closing wasn't recorded
        debug('App closing wasn\'t recorded, losing 1 session worth of data');
      }

      usage.openCount++;
      usage.launchTime = time;
      this._writeData();
    },

    _recordAppClosing: function(appUrl, time, isCrash) {
      debug('App closing: ' + appUrl);
      this._updateTimestamps(time);
      var usage = this._data.appUsage[appUrl];
      if (usage === undefined) {
        debug('App is closing but has no usage info: ' + appUrl);
        return;
      }

      var sessionTime = time - usage.launchTime;
      usage.totalTime += sessionTime;
      if (isCrash) {
        usage.crashCount++;
      } else {
        usage.closeCount++;
      }

      delete usage.launchTime;
      this._writeData();
    },

    _recordAppUninstalled: function(appUrl, time) {
      this._updateTimestamps(time);
      this._data.appUninstalls.push({ id: appUrl, time: time });
      this._writeData();
    },

    _sendMetrics: function(data) {
      this._state = STATE_SENDING;

      var url = [this._url, 'metrics', 'FirefoxOS'].join('/');
      var xhr = new XMLHttpRequest({ mozSystem: true, mozAnon: true });
      // TODO xhr.timeout = this._sendTimeout

      debug(url);
      debug(JSON.stringify(data));

      var self = this;
      function resend() {
        debug('Resending metrics');
        self._sendMetrics(data);
      }

      xhr.onload = function() {
        self._onSendSuccess(xhr.responseText);
      };

      xhr.ontimeout = function() {
        self._retryTimer = setTimeout(resend, self._retryInterval);
      };

      xhr.onerror = function() {
        self._retryTimer = setTimeout(resend, self._retryInterval);
      };

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.responseType = 'text';
      xhr.send(JSON.stringify(data));
    },

    _tick: function() {
      if (!this._enabled && this._timer) {
        clearInterval(this._timer);
        this._timer = null;
        if (this._retryTimer) {
          clearInterval(this._retryTimer);
          this._retryTimer = null;
        }
        return;
      }

      var now = Date.now();
      this._timeSinceLastSend += now - this._lastTick;
      this._lastTick = now;

      if (this._timeSinceLastSend < this._interval) {
        return;
      }

      var dataToSend = {
        appUsage: {},
        appUninstalls: this._data.appUninstalls.slice(0),
        startTimestamp: this._data.startTimestamp,
        stopTimestamp: this._data.stopTimestamp
      };

      Object.keys(this._data.appUsage).forEach(function(appUrl) {
        if (this._data.appUsage[appUrl].launchTime) {
          // Skip over currently running apps
          return;
        }

        dataToSend.appUsage[appUrl] = this._data.appUsage[appUrl];
        delete this._data.appUsage[appUrl];
      }, this);

      Object.keys(this._deviceInfo).forEach(function(key) {
        dataToSend[key] = this._deviceInfo[key];
      }, this);

      this._data.appUninstalls = [];
      this._data.startTimestamp = this._data.stopTimestamp = 0;

      this._writeData();
      this._sendMetrics(dataToSend);
    },

    _updateTimestamps: function(time) {
      if (this._data.startTimestamp === 0) {
        this._data.startTimestamp = time;
      }
      this._data.stopTimestamp = time;
    },

    _writeData: function() {
      var dataString = JSON.stringify(this._data);
      window.asyncStorage.setItem(METRICS_DATA, dataString);
    },

    isEnabled: function() {
      return this._enabled;
    },

    isRunning: function() {
      return this._timer !== null;
    },

    appLifecycle: function(appUrl, name) {
      var self = this;
      var time = Date.now();
      setTimeout(function() {
        switch (name) {
          case 'opening':
            self._recordAppOpening(appUrl, time);
            break;
          case 'closing':
            self._recordAppClosing(appUrl, time);
            break;
          case 'crashing':
            self._recordAppClosing(appUrl, time, true);
            break;
        }
      });
    },

    appOpening: function(appUrl) {
      this.appLifecycle(appUrl, 'opening');
    },

    appClosing: function(appUrl) {
      this.appLifecycle(appUrl, 'closing');
    },

    appCrashing: function(appUrl) {
      this.appLifecycle(appUrl, 'crashing');
    },

    appUninstalled: function(appUrl) {
      var self = this;
      var time = Date.now();
      setTimeout(function() {
        self._recordAppUninstalled(appUrl, time);
      });
    },

    getData: function() {
      return this._data;
    },

    getInterval: function() {
      return this._interval;
    },

    getRetryInterval: function() {
      return this._retryInterval;
    },

    getUrl: function() {
      return this._url;
    },

    reset: function() {
      this._dataToSend = null;
      this._enabled = false;
      this._interval = DEFAULT_INTERVAL;
      this._resend = false;
      this._retryInterval = DEFAULT_RETRY_INTERVAL;
      this._retryTimer = null;
      this._settingObserver = null;
      this._state = STATE_IDLE;
      this._tickInterval = DEFAULT_RETRY_INTERVAL;
      this._timer = null;
      this._timeSinceLastSend = 0;
      this._url = null;
    },

    resetData: function() {
      this._data = {
        startTimestamp: 0,
        stopTimestamp: 0,
        appUsage: {},
        appUninstalls: []
      };
      this._writeData();
    },

    startService: function(callback) {
      var self = this;
      window.asyncStorage.getItem(METRICS_DATA, function(value) {
        if (value) {
          self._data = JSON.parse(value);
        }

        var settingKeys = [METRICS_ENABLED, METRICS_INTERVAL,
                           METRICS_RETRY_INTERVAL, METRICS_URL];
        getSettings(settingKeys, function(settings) {
          self._enabled = settings[METRICS_ENABLED];
          if (self._enabled === null) {
            self._enabled = false;
          }

          if (typeof(settings[METRICS_INTERVAL]) === 'number') {
            self._interval = settings[METRICS_INTERVAL];
          }

          var retryInterval = settings[METRICS_RETRY_INTERVAL];
          if (typeof(retryInterval) === 'number') {
            self._retryInterval = retryInterval;
          }

          if (settings[METRICS_URL]) {
            self._url = settings[METRICS_URL];
          }

          var deviceInfoKeys = ['deviceinfo.update_channel',
                                'deviceinfo.platform_version',
                                'deviceinfo.platform_build_id'];
          getSettings(deviceInfoKeys, function(info) {
            self._deviceInfo = info;
            self._onSettingsReady();
            if (callback) {
              callback();
            }
          });
        });
      });
    },

    stopService: function() {
      if (this._settingObserver) {
        navigator.mozSettings.removeObserver(METRICS_ENABLED,
                                             this._settingObserver);
      }

      if (this._timer) {
        clearInterval(this._timer);
      }

      if (this._retryTimer) {
        clearInterval(this._retryTimer);
      }

      this.reset();
      this.resetData();
    }
  };

  exports.Metrics = new Metrics();
})(window);

