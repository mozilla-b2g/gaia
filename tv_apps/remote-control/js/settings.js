/* global SettingsListener, evt */
'use strict';

(function(exports) {
  var WATCH_SETTINGS = {
    'remote-control.enabled': false,
    'remote-control.pairing-required': false,
    'remote-control.authorized-devices': null,
    'remote-control.server-ip': ''
  };

  var Settings = evt({
    _ready: false,
    _observer: [],

    start: function() {
      for(var name in WATCH_SETTINGS) {
        this._observer[name] = this._settingHandler.bind(this, name);
        SettingsListener.observe(name, WATCH_SETTINGS[name],
          this._observer[name]);
      }
    },

    stop: function() {
      for(var name in WATCH_SETTINGS) {
        SettingsListener.unobserve(name, this._observer[name]);
        this[name] = undefined;
      }
      this._observer = [];
      this._ready = false;
    },

    save: function(settings) {
      return new Promise((resolve, reject) => {
        var validSettings = {};
        var name;

        for (name in settings) {
          if (name in WATCH_SETTINGS) {
            validSettings[name] = settings[name];
          }
        }
        if (!Object.keys(validSettings).length) {
          reject();
        }

        var req = SettingsListener.getSettingsLock().set(validSettings);
        req.onsuccess = () => {
          for (name in validSettings) {
            this._settingHandler(name, validSettings[name]);
          }
          resolve();
        };
        req.onerror = () => {
          reject();
        };
      });
    },

    _settingHandler: function(name, value) {
      if (this[name] !== value) {
        this[name] = value;
        this.fire('changed', name, value);
      }

      // Check whether all settings are retrieved.
      if (!this._ready) {
        var hasValue = (name) => {
          return this[name] !== undefined;
        };
        if (Object.keys(WATCH_SETTINGS).every(hasValue)) {
          this._ready = true;
          this.fire('ready');
        }
      }
    }
  });

  exports.Settings = Settings;
}(window));
