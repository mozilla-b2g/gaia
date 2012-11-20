var MockSettingsListener = {
  observe: function msl_observe(name, defaultValue, cb) {
    this.mName = name;
    this.mDefaultValue = defaultValue;
    this.mCallback = cb;
  },

  mName: null,
  mDefaultValue: null,
  mCallback: null,
  mTeardown: function teardown() {
    this.mName = null;
    this.mDefaultValue = null;
    this.mDefaultCallback = null;
  }
};
