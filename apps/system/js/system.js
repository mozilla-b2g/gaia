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
      'wifi': navigator.wifiManager,
      'settings': navigator.mozSettings
    },

    create: function(constructor, properties, prototype) {
      constructor.prototype = Object.create(BaseModule.prototype, properties);
      constructor.prototype.constructor = constructor;
      if (prototype) {
        BaseModule.mixin(constructor.prototype, prototype);
      }
      return constructor;
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
      return (window.appWindowManager &&
              !window.appWindowManager.getActiveApp().loaded);
    },

    get screenOn() {
      return window.systemApp &&
             window.systemApp.screenManager &&
             window.systemApp.screenManager.screenEnabled;
    },

    /**
     * Get the running app window instance by the origin/manifestURL provided.
     * @param {String} origin The url to be matched.
     * @param {String} [manifestURL] The manifestURL to be matched.
     */
    getRunningApp: function(origin, manifestURL) {
      return window.appWindowManager ?
             window.appWindowManager.getApp(origin, manifestURL) : null;
    },

    /**
     * Get the lists of running app window instances.
     */
    getRunningApps: function() {
      return window.appWindowManager ?
             window.appWindowManager.getApps() : [];
    },

    isBTProfileConnected: function(profile) {
      return window.bluetoothHandler &&
             window.bluetoothHandler.isProfileConnected(profile);
    },

    get bluetoothConnected() {
      return window.bluetoothHandler &&
             window.bluetoothHandler.connected;
    },

    get headphonesActive() {
      return StatusBar && StatusBar.headphonesActive;
    },

    get keyboardHeight() {
      return systemApp &&
             systemApp.keyboardManager && systemApp.keyboardManager.getHeight();
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

    get topMostAppWindow() {
      if ('undefined' === typeof window.appWindowManager) {
        return null;
      } else {
        return window.appWindowManager.getActiveApp();
      }
    },

    /**
     * Detect there is fullscreen content or fullscreen app running.
     */
    get fullscreenMode() {
      if (document.mozFullScreen) {
        return true;
      } else if ('undefined' === typeof window.appWindowManager ||
                 !appWindowManager.getActiveApp()) {
        return false;
      } else {
        return window.appWindowManager.getActiveApp().isFullScreen();
      }
    },

    get runningFTU() {
      if ('undefined' === typeof window.ftuLauncher) {
        return false;
      } else {
        return window.ftuLauncher.isFtuRunning();
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
    }
  };
}(this));
