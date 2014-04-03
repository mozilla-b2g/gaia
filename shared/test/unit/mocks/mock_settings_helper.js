'use strict';

function MockSettingsHelper(aSetting, defaultValue) {

  var setting = aSetting;

  if (MockSettingsHelper.instances[setting] !== undefined) {
    MockSettingsHelper.instances[setting].defaultValue = defaultValue;
  } else {
    MockSettingsHelper.instances[setting] = {'defaultValue': defaultValue};
  }

  return {
    get: function (callback) {
      var value = MockSettingsHelper.instances[setting].value !== undefined ?
        MockSettingsHelper.instances[setting].value :
        MockSettingsHelper.instances[setting].defaultValue;
      callback && callback(value);
    },
    set: function (value, callback) {
      MockSettingsHelper.instances[setting].value = value;
      callback && callback();
    }
  };
}

MockSettingsHelper.instances = {};

MockSettingsHelper.mSetup = function() {
  MockSettingsHelper.instances = {};
};

MockSettingsHelper.mTeardown = function() {
  MockSettingsHelper.instances = {};
};
