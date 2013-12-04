'use strict';

var OrientationManager = {
  init: function om_init() {
    this.fetchDefaultOrientation();
    if (SettingsListener) {
      SettingsListener.observe('screen.orientation.lock', false,
        function(value) {
          this.globalOrientation = value ?
            this.fetchCurrentOrientation() : null;
          this.publish('globalorientationchanged');
        }.bind(this));
    }
  },

  globalOrientation: null,

  // Fetch the default orientation once the module is loaded.
  defaultOrientation: screen.mozOrientation,

  _isOnRealDevice: undefined,

  isOnRealDevice: function sl_isOnRealDevice() {
    if (typeof(this._isOnRealDevice) !== 'undefined')
      return this._isOnRealDevice;

    // XXX: A hack to know we're using real device or not
    // is to detect screen size.
    // The screen size of b2g running on real device
    // is the same as the size of system app.
    if (window.innerWidth === screen.width) {
      this._isOnRealDevice = true;
    } else {
      this._isOnRealDevice = false;
    }

    return this._isOnRealDevice;
  },

  fetchDefaultOrientation: function sl_fetchDefaultOrientation() {
    if (!this.isOnRealDevice()) {
      // Fallback to use width/height to calculate default orientation
      // if we're running on desktop browser or simulator.
      this.defaultOrientation = window.innerWidth > window.innerHeight ?
        'landscape-primary' : 'portrait-primary';
    } else {
      screen.mozLockOrientation('default');
      this.defaultOrientation = screen.mozOrientation;
    }
  },

  fetchCurrentOrientation: function sl_fetchCurrentOrientation() {
    if (!this.isOnRealDevice()) {
      // Fallback to use width/height to calculate default orientation
      // if we're running on desktop browser or simulator.
      return window.innerWidth > window.innerHeight ?
        'landscape-primary' : 'portrait-primary';
    } else {
      return screen.mozOrientation;
    }
  },

  publish: function sl_publish(eventName, detail) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(eventName, true, false, detail);
    window.dispatchEvent(evt);
  }
};

OrientationManager.init();

