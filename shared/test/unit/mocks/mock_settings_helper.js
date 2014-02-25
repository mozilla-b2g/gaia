/* exported MockSettingsHelper, MockSettingsHelperInstance */
'use strict';
(function() {
  var MockSettingsHelperInstance = {
    set: function() {},
    get: function() {}
  };

  var MockSettingsHelper = function(key, defaultValue) {
    return MockSettingsHelperInstance;
  };

  window.MockSettingsHelper = MockSettingsHelper;
  window.MockSettingsHelperInstance = MockSettingsHelperInstance;
})();
