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
    deviceMemory: undefined,

    _start: function() {
      this._getDeviceType();
      this._getDeviceMemory();
    },

    _stop: function() {
      this.deviceType = null;
      this.deviceMemory = undefined;
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
      var promise = Promise.resolve(); 
      if ('getFeature' in navigator) {
        promise = navigator.getFeature('hardware.memory').then(mem => {
          this.deviceMemory = mem;
	  return mem;
        }, () => {
          this.error('Failed to retrieve total memory of the device.');
        });

	return promise;
      }
    },
    getDeviceMemory: function() {
      if (this.deviceMemory === undefined) {
	return this._getDeviceMemory();
      }

      return Promise.resolve(this.deviceMemory);
    }
  });
}(window));
