/* exported SettingsCore */
/* global System */
'use strict';

(function(exports) {
  var SettingsCore = function() {
    this.settings = window.navigator.mozSettings;
  };
  SettingsCore.SERVICES = [
    'get',
    'set',
    'addObserver',
    'removeObserver'
  ];
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

    get: function(name) {
      var self = this;
      return new Promise(function(resolve) {
        self.debug('reading ' + name + ' from settings db.');
        var lock = self.getSettingsLock();
        var get = lock.get(name);
        get.addEventListener('success', function() {
          resolve(get.result[name]);
        });
      });
    },

    set: function(notifier) {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.debug('writing ' + JSON.stringify(notifier) + ' to settings db.');
        var lock = self.getSettingsLock();
        var set = lock.set(notifier);
        set.addEventListener('success', function() {
          resolve();
        });
        set.addEventListener('error', function() {
          reject();
        });
      });
    },

    addObserver: function(name, context) {
      this.debug('adding observer for ' + context + ' on ' + name);
      if (context && 'observe' in context) {
        if (!this.settings) {
          window.setTimeout(function() { context.observe(name, null); });
          return;
        }
        var self = this;
        var req = this.getSettingsLock().get(name);

        req.addEventListener('success', (function onsuccess() {
          self.debug('get settings ' + name + ' as ' + req.result[name]);
          self.debug('now performing the observer in ' + context.name);
          context.observe.call(context, name, req.result[name]);
        }));

        var settingChanged = function settingChanged(evt) {
          self.debug('observing settings ' + evt.settingName +
            ' changed to ' + evt.settingValue);
          self.debug('now performing the observer in ' + context.name);
          context.observe.call(context, evt.settingName, evt.settingValue);
        };
        this.settings.addObserver(name, settingChanged);
        this._observers.push({
          name: name,
          context: context,
          observer: settingChanged
        });
      } else {
        this.warn('irregular observer ' + context.name + ', stop oberseving');
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
