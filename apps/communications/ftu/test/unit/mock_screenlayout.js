'use strict';

var MockScreenLayout = {};
MockScreenLayout._currentDevice = 'tiny';
MockScreenLayout.setDevice = function(deviceType) {
  this._currentDevice = deviceType.toLowerCase() || 'tiny';
};
MockScreenLayout.getCurrentLayout = function() {
  return this._currentDevice;
};
