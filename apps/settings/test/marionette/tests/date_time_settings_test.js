'use strict';
var Settings = require('../app/app');

marionette('manipulate date time settings', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var settingsApp;
  var dateTimePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    dateTimePanel = settingsApp.dateTimePanel;
  });

  test('manipulate time format', function() {
    // Simply select the value in the time format to
    // ensure the menu is is populated.
    dateTimePanel.selectTimeFormat('12-hour');
  });

});
