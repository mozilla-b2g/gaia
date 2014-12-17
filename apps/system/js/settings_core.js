/* exported SettingsCore */
/* global BaseModule */
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
  /**
   * SettingsCore is a wrapper to access navigator.mozSettings
   * and provides some API it doesn't provide.
   * *SettingsCore#addObserver(SETTING_NAME, OBSERVER_OBJECT)
   * *SettingsCore#set(SETTING_OBJECT)
   * *SettingsCore#get(SETTING_NAME)
   * @class SettingsCore
   */
  BaseModule.create(SettingsCore, {
    name: 'SettingsCore',

    /* lock stores here */
    _lock: null,

    /* keep record of observers in order to remove them in the future */
    _observers: [],

    /**
     * getSettingsLock: create a lock or retrieve one that we saved.
     * mozSettings.createLock() is expensive and lock should be reused
     * whenever possible.
     * @memberOf SettingsCore.prototype
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
      return new Promise(function(resolve, reject) {
        self.debug('reading ' + name + ' from settings db.');
        var get = self.getSettingsLock().get(name);
        get.addEventListener('success', (function() {
          self.debug('...value is ' + get.result[name]);
          resolve(get.result[name]);
        }));
        get.addEventListener('error', (function() {
          reject();
        }));
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

    /**
     * addObserver provides a "addEventListener"-like interface
     * to observe settings change.
     *
     * @example
     * var s = new SettingsCore();
     * s.start();
     * var MyModule = {
     *   init: function() {
     *     s.addObserver('lockscreen.enabled', this);
     *     s.addObserver('lockscreen.locked', this);
     *   },
     *   observe: function(name, value) {
     *     console.log('settings of ' + name + ' had changed to ' + value);
     *   }
     * };
     * MyModule.init();
     * 
     * @param {String} name    The settings name
     * @param {Object} context The object which wants to observe the settings.
     *                         It should have a method named for 'observe'.
     */
    addObserver: function(name, context) {
      this.debug('adding observer for ' + context + ' on ' + name);
      if (context) {
        if (!this.settings) {
          window.setTimeout(function() {
            if ('observe' in context) {
              context.observe.call(context, name, null);
            } else if (typeof(context) === 'function') {
              context(null);
            }
          });
          return;
        }
        var self = this;
        var req = this.getSettingsLock().get(name);

        req.addEventListener('success', (function onsuccess() {
          self.debug('get settings ' + name + ' as ' + req.result[name]);
          self.debug('now performing the observer in ' + context.name);
          if ('observe' in context) {
            context.observe.call(context, name, req.result[name]);
          } else if (typeof(context) === 'function') {
            context(req.result[name]);
          }
        }));

        var settingChanged = function settingChanged(evt) {
          self.debug('observing settings ' + evt.settingName +
            ' changed to ' + evt.settingValue);
          self.debug('now performing the observer in ' + context.name);
          if ('observe' in context) {
            context.observe.call(context, evt.settingName, evt.settingValue);
          } else if (typeof(context) === 'function') {
            context(evt.settingValue);
          }
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
}(window));
