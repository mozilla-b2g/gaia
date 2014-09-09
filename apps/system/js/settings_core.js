/* exported SettingsCore */
/* global System */
'use strict';

(function(exports) {
  var SettingsCore = function() {
    this.settings = window.navigator.mozSettings;
  };

  System.create(SettingsCore, {}, {
    name: 'SettingsCore',
    EVENT_PREFIX: 'settings-core-',
    /* lock stores here */
    _lock: null,

    /* keep record of observers in order to remove them in the future */
    _observers: [],

    /**
     * getSettingsLock: create a lock or retrieve one that we saved.
     * mozSettings.createLock() is expensive and lock should be reused
     * whenever possible.
     */
    getSettingsLock: function sl_getSettingsLock() {
      // If there is a lock present we return that
      if (this._lock && !this._lock.closed) {
        return this._lock;
      }

      return (this._lock = this.settings.createLock());
    },

    notifyObserver: function(notifier) {
      var lock = this.getSettingsLock();
      lock.set(notifier);
    },

    addObserver: function(name, context) {
      if (context && 'observe' in context) {
        if (!this.settings) {
          window.setTimeout(function() { context.observe(name, null); });
          return;
        }

        var req = this.getSettingsLock().get(name);

        req.addEventListener('success', (function onsuccess() {
          context.observe.call(context, name, req.result[name]);
        }));

        var settingChanged = function settingChanged(evt) {
          context.observe.call(context, evt.settingName, evt.settingValue);
        };
        this.settings.addObserver(name, settingChanged);
        this._observers.push({
          name: name,
          context: context,
          observer: settingChanged
        });
      }
    },

    removeObserver: function(name, context) {
      var settings = this.settings;
      var that = this;
      this._observers.forEach(function(value, index) {
        if (value.name === name && value.context === context) {
          settings.removeObserver(name, value.observer);
          that._observers.splice(index, 1);
        }
      });
    }
  });
  exports.SettingsCore = SettingsCore;
}(window));
