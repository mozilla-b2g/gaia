/* global BaseModule */
'use strict';

(function(exports) {
  /**
   * This is the feature detector module of the system app.
   * It is responsible to retrieve device specific information.
   */
  var FeatureDetector = function() {
  };

  FeatureDetector.SERVICES = [
    'getDeviceMemory'
  ];

  FeatureDetector.STATES = [
    'getDeviceType'
  ];

  BaseModule.create(FeatureDetector, {
    name: 'FeatureDetector',
    deviceType: 'phone',
    _deviceMemoryPromise: null,

    _start: function() {
      this._getDeviceType();
      this._getDeviceMemory();
    },

    _stop: function() {
      this.deviceType = null;
      this._deviceMemoryPromise = null;
    },

    _getDeviceType: function() {
      // `_GAIA_DEVICE_TYPE_` is a placeholder and will be replaced by real
      // device type in build time, `system/build/build.js` does the trick.
      this.deviceType = '_GAIA_DEVICE_TYPE_';
    },

    getDeviceType: function() {
      return this.deviceType;
    },

    _getDeviceMemory: function() {
      if ('getFeature' in navigator) {
        this._deviceMemoryPromise =
          navigator.getFeature('hardware.memory').catch(() => {
            this.error('Failed to retrieve total memory of the device.');

            // Return the failsafe value.
            return 0;
          });
      } else {
        this.error('navigator.getFeature is not available.');

        this._deviceMemoryPromise = Promise.resolve(0);
      }
    },

    getDeviceMemory: function() {
      return this._deviceMemoryPromise;
    }
  });
}(window));
