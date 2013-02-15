'use strict';
requireApp('settings/test/unit/mock_navigator_settings.js');

var MockSettings = {
  mSuiteSetup: function() {
    this.mozSettings = MockNavigatorSettings;
  }
};

