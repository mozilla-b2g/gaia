'use strict';
var Settings = require('../app/app');

marionette('manipulate date time settings', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });
  var settingsApp;
  var dateTimePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    dateTimePanel = settingsApp.dateTimePanel;
  });

  test('manipulate region', function() {
    // Simply change the value in the timezone region to
    // ensure the menu is is populated.
    dateTimePanel.selectRegion('Europe');
  });

});
