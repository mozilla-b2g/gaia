requireApp('costcontrol/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var MockSettingsListener = {
  observe: function msl_observe(name, defaultValue, cb) {
    this.mName = name;
    this.mDefaultValue = defaultValue;
    this.mCallback = cb;
    this.mCallbacks[name] = cb;
  },

  getSettingsLock: function msl_getSettingsLock() {
    var set = function set(settings) {
      for (var name in settings) {
        var object = {};
        object[name] = settings[name];
        MockNavigatorSettings.createLock().set(object);
      }
    };
    return {
      set: set
    };
  },

  mName: null,
  mDefaultValue: null,
  mCallback: null,
  mCallbacks: {},
  mTeardown: function teardown() {
    this.mName = null;
    this.mDefaultValue = null;
    this.mDefaultCallback = null;
  }
};
