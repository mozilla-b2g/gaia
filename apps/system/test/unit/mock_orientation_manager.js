var MockOrientationManager = {
  globalOrientation: null,

  // Fetch the default orientation once the module is loaded.
  defaultOrientation: 'portrait-primary',

  _isOnRealDevice: undefined,

  isOnRealDevice: function sl_isOnRealDevice() {
  },

  fetchDefaultOrientation: function sl_fetchDefaultOrientation() {
  },

  fetchCurrentOrientation: function sl_fetchDefaultOrientation() {
  },

  mTeardown: function mom_mTeardown() {
    this.globalOrientation = null;
    this.defaultOrientation = 'portrait-primary';
  }
};
