'use strict';
/* exported MockOrientationManager */

var MockOrientationManager = {
  globalOrientation: 'portrait-primary',

  // Fetch the default orientation once the module is loaded.
  defaultOrientation: 'portrait-primary',

  isDefaultPortrait: function() {
    return (this.defaultOrientation == 'portrait-primary');
  },

  _isOnRealDevice: undefined,

  isOnRealDevice: function sl_isOnRealDevice() {
  },

  fetchDefaultOrientation: function sl_fetchDefaultOrientation() {
  },

  fetchCurrentOrientation: function sl_fetchDefaultOrientation() {
    return this.mCurrentOrientation || this.defaultOrientation;
  },

  mTeardown: function mom_mTeardown() {
    this.globalOrientation = 'portrait-primary';
    this.defaultOrientation = 'portrait-primary';
  }
};
