/* global LazyLoader */
'use strict';

(function(window) {
  var DEBUG = false;
  /**
   * Shared some global property.
   * @type {Object}
   * @module  System
   */
  window.System = {
    'API': {
      'nfc': navigator.mozNFC,
      'bluetooth': navigator.mozBluetooth,
      'apps': navigator.mozApps,
      'telephony': navigator.mozTelephony,
      'mobileConnections': navigator.mozMobileConnections,
      'wifi': navigator.wifiManager
    },

    getAPI: function(name) {
      return this.API[name];
    },

    /**
     * Create a module based on base module and give properties.
     * @param  {Function} constructor The constructor function.
     * @param  {Object} properties
     *                  The property object which includes getter/setter.
     * @param  {Object} prototype
     *                  The prototype which will be injected into the class.
     */
    create: function(constructor, properties, prototype) {
      constructor.prototype = Object.create(BaseModule.prototype, properties);
      constructor.prototype.constructor = constructor;
      if (prototype) {
        BaseModule.mixin(constructor.prototype, prototype);
      }
      return constructor;
    },

    request: function() {

    },

    lazyLoad: function(array, callback) {
      var fileList = [];
      array.forEach(function(module) {
        fileList.push(this.object2fileName(module));
      }, this);
      LazyLoader.load(fileList, callback);
    },

    lowerCapital: function(str) {
      return str.charAt(0).toLowerCase() + str.slice(1);
    },

    object2fileName: function(strings) {
      var i = 0;
      var ch = '';
      while (i <= strings.length) {
        var character = strings.charAt(i);
        if (character !== character.toLowerCase()) {
          if (ch === '') {
            ch += character.toLowerCase();
          } else {
            ch += '_' + character.toLowerCase();
          }
        } else {
          ch += character;
        }
        i++;
      }
      return '/js/' + ch + '.js';
    },

    get applicationReady() {
      return window.applications && window.applications.ready;
    },

    /**
     * Indicates the system is busy doing something.
     * Now it stands for the foreground app is not loaded yet.
     */
    isBusyLoading: function() {
      var app = window.AppWindowManager.getActiveApp();
      return app && !app.loaded;
    },

    /**
     * Record the start time of the system for later debugging usage.
     * @access private
     * @type {Number}
     * @memberOf module:System
     */
    _start: new Date().getTime() / 1000,

    /**
     * Get current time offset from the start.
     * @return {Number} The time offset.
     * @memberOf module:System
     */
    currentTime: function() {
      return (new Date().getTime() / 1000 - this._start).toFixed(3);
    },

    /**
     * Enable slow transition or not for debugging.
     * Note: Turn on this would make app opening/closing durations become 3s.
     * @type {Boolean}
     * @memberOf module:System
     */
    slowTransition: false,

    debug: function sys_debug() {
      if (DEBUG) {
        console.log('[System]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    },

    forceDebug: function sys_debug() {
      console.log('[System]' +
        '[' + System.currentTime() + ']' +
        Array.slice(arguments).concat());
    },

    _dump: function sys__dump() {
      try {
        throw new Error('dump');
      } catch (e) {
        console.log(e.stack);
      }
    },

    publish: function sys_publish(eventName, detail) {
      var evt = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: false,
        detail: detail
      });
      window.dispatchEvent(evt);
    },

    handleEvent: function(evt) {
      if (evt.type == 'settings-core-started') {
        this._observer_to_add &&
        this._observer_to_add.forEach(function(observer) {
          window.settingsCore.addObserver(observer.name, observer.context);
        });
        this._observer_to_remove &&
        this._observer_to_remove.forEach(function(observer) {
          window.settingsCore.removeObserver(observer.name, observer.context);
        });
        this._observer_to_notify &&
        this._observer_to_notify.forEach(function(notifier) {
          window.settingsCore.notifyObserver(notifier);
        });
        this._observer_to_add = [];
        this._observer_to_remove = [];
        this._observer_to_notify = [];
      }
    },

    notifyObserver: function(notifier) {
      if (window.settingsCore) {
        window.settingsCore.notifyObserver(notifier);
      } else {
        if (!this._observer_to_notify) {
          this._observer_to_notify = [];
        }
        this._observer_to_notify.push(notifier);
        window.addEventListener('settings-core-started', this);
      }
    },

    addObserver: function(name, context) {
      if (window.settingsCore) {
        window.settingsCore.addObserver(name, context);
      } else {
        if (!this._observer_to_add) {
          this._observer_to_add = [];
        }
        this._observer_to_add.push({
          name: name,
          context: context
        });
        window.addEventListener('settings-core-started', this);
      }
    },

    removeObserver: function(key, context) {
      if (window.settingsCore) {
        window.settingsCore.removeObserver(key, callback);
      } else {
        if (!this._observer_to_remove) {
          this._observer_to_remove = [];
        }
        this._observer_to_remove.push({
          name: key,
          context: context
        });
        window.addEventListener('settings-core-started', this);
      }
    },

    get runningFTU() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuRunning();
      }
    },

    get isUpgrading() {
      if ('undefined' === typeof window.FtuLauncher) {
        return false;
      } else {
        return window.FtuLauncher.isFtuUpgrading();
      }
    },

    get locked() {
      // Someone ask this state too early.
      if ('undefined' === typeof window.lockScreenWindowManager) {
        return false;
      } else {
        return window.lockScreenWindowManager.states.active;
      }
    },

    get manifestURL() {
      return window.location.href.replace('index.html', 'manifest.webapp');
    },

    isMultiSIM: function() {
      if (window.SIMSlotManager) {
        return window.SIMSlotManager.isMultiSIM();
      } else {
        if (this.getAPI('mobileConnections')) {
          return (this.getAPI('mobileConnections').length > 1);
        } else {
          return false;
        }
      }
    }
  };
}(this));
