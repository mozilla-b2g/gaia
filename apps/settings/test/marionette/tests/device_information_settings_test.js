'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate device information', function() {
  var client = marionette.client();
  var settingsApp;
  var deviceInformationPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // navigate to device information panel
    deviceInformationPanel = settingsApp.deviceInformationPanel;
  });

  suite('more information page', function() {
    var moreInfoPanel;
    var rootPanel;
    setup(function() {
      // navigate to device more information panel
      moreInfoPanel = settingsApp.moreInfoPanel;
      rootPanel = settingsApp.rootPanel;
      moreInfoPanel.isRendered();
    });

    test('enable and verify developer menu visiblity', function() {
      moreInfoPanel.enableDeveloperMenu();
      moreInfoPanel.goBack();
      deviceInformationPanel.isRendered();
      deviceInformationPanel.goBack();
      assert.ok(rootPanel.isDeveloperMenuVisible,
                'developer menu is not visible');
    });
  });
});

