/* global Service */

'use strict';

(function(exports) {
  var GlobalOverlayWindowManager = function() {};
  GlobalOverlayWindowManager.prototype = {
    DEBUG: false,
    TRACE: false,
    CLASS_NAME: 'GlobalOverlayWindowManager',
    EVENT_PREFIX: 'globaloverlaywindowmanager',

    // We only allow one GlobalOverlayWindow instance at a time.
    // Allowing multiple global overlay windows would lead us to weird UIs.
    _instance: null,

    publish: function(eventName, detail) {
      this.debug('publishing: ', eventName);
      var evt = new CustomEvent(this.EVENT_PREFIX + eventName, {
        detail: detail
      });
      window.dispatchEvent(evt);
    },

    debug: function() {
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + Service.currentTime() + '] ' +
          Array.slice(arguments).concat());
        if (this.TRACE) {
          console.trace();
        }
      }
    },

    screen: document.getElementById('screen'),

    start: function owm_start() {
      window.addEventListener('globaloverlaycreated', this);
      window.addEventListener('globaloverlayrequestopen', this);
      window.addEventListener('globaloverlayopening', this);
      window.addEventListener('globaloverlayopened', this);
      window.addEventListener('globaloverlayrequestclose', this);
      window.addEventListener('globaloverlayclosing', this);
      window.addEventListener('globaloverlayclosed', this);
      window.addEventListener('globaloverlayterminated', this);

      window.addEventListener('system-resize', this);

      Service.request('registerHierarchy', this);
    },

    stop: function owm_stop() {
      this._instance = null;

      window.removeEventListener('globaloverlaycreated', this);
      window.removeEventListener('globaloverlayrequestopen', this);
      window.removeEventListener('globaloverlayopening', this);
      window.removeEventListener('globaloverlayopened', this);
      window.removeEventListener('globaloverlayrequestclose', this);
      window.removeEventListener('globaloverlayclosing', this);
      window.removeEventListener('globaloverlayclosed', this);
      window.removeEventListener('globaloverlayterminated', this);

      window.removeEventListener('system-resize', this);

      Service.request('unregisterHierarchy', this);
    },

    handleEvent: function owm_handleEvent(evt) {
      this.debug('handling ' + evt.type);

      var overlay = evt.detail;

      if (!this._instance && evt.type != 'globaloverlaycreated') {
        return;
      }

      switch (evt.type) {
        case 'globaloverlaycreated':
          if (this._instance) {
            console.error('We can only have one global overlay at a time');
            overlay.kill();
            return;
          }
          this._instance = overlay;
          break;

        case 'globaloverlayopening':
        case 'globaloverlayopened':
          if (this._instance == overlay) {
            this.publish('-activated');
          }
          break;

        case 'globaloverlayrequestopen':
          if (this._instance != overlay) {
            return;
          }
          this._instance.ready(function() {
            this._instance.setVisible(true);
            this._instance.open();
          }.bind(this));
          break;

        case 'globaloverlayrequestclose':
          if (this._instance == overlay) {
            this._instance.close();
          }
          break;

        case 'globaloverlayclosing':
        case 'globaloverlayclosed':
          if (this._instance == overlay) {
            this.publish('-deactivated');
          }
          break;

        case 'globaloverlayterminated':
          if (this._instance == overlay) {
            this._instance = null;
          }
          break;

        case 'system-resize':
          if (!this._instance) {
            return;
          }
          var p = this._instance.resize();
          if (typeof evt.detail.waitUntil === 'function') {
            evt.detail.waitUntil(p);
          }
          break;
      }
    },

    isActive: function owm_isActive() {
      return this._instance != null;
    },

    getActiveWindow: function owm_getActiveWindow() {
      return this.getTopMostWindow();
    },

    getTopMostWindow: function owm_getTopMostWindow() {
      return this._instance;
    },
  };

  exports.GlobalOverlayWindowManager = GlobalOverlayWindowManager;

}(window));
