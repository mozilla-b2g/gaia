/* exported MockSettings */
/* global MockNavigatorSettings */
'use strict';
requireApp('settings/test/unit/mock_navigator_settings.js');

var MockSettings = {
  currentPanel: '',
  mSuiteSetup: function() {
    this.mozSettings = MockNavigatorSettings;
  },
  mSetup: function() {
    this.currentPanel = '';
  }
};
