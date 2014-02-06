requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

var MockLock = {
  locks: [],
  mCallbacks: {},
  mObject: {},
  set: function set(lock) {
    for (var name in lock) {
      var object = {};
      object[name] = lock[name];
      MockNavigatorSettings.createLock().set(object);
    }
    this.locks.push(lock);
    return this.mCallbacks;
  },
  get: function get(name) {
    this.mObject[name] = {};
    return this.mObject[name];
  },
  clear: function clearLocks() {
    this.locks = [];
    this.mCallbacks = {};
  }
};

var MockSettingsListener = {
  observe: function msl_observe(name, defaultValue, cb) {
    this.mName = name;
    this.mDefaultValue = defaultValue;
    this.mCallback = cb;
    this.mCallbacks[name] = cb;
  },

  getSettingsLock: function msl_getSettingsLock() {
    return MockLock;
  },

  mName: null,
  mDefaultValue: null,
  mCallback: null,
  mCallbacks: {},
  mTriggerCallback: function msl_mTriggerCallback(name, value) {
    if (this.mCallbacks[name]) {
      this.mCallbacks[name](value);
    }
  },
  mTeardown: function teardown() {
    this.mName = null;
    this.mDefaultValue = null;
    this.mDefaultCallback = null;
  }
};
