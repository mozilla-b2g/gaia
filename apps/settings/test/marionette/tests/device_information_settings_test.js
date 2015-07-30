'use strict';
var Settings = require('../app/app'),
  assert = require('assert');

marionette('check device information settings', function() {
  var client = marionette.client({
    profile: {
      settings: {
        'developer.menu.enabled': false
      }
    }
  });
  var settingsApp;
  var deviceInfoPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    deviceInfoPanel = settingsApp.aboutPanel;
  });

  test('check more info panel', function() {
    deviceInfoPanel.tapOnMoreInfoButton();
    var isDevelopMenuDefaultEnabled = deviceInfoPanel.isDevelopMenuEnabled;
    deviceInfoPanel.triggerDevelopMenu();
    assert.notEqual(deviceInfoPanel.isDevelopMenuEnabled,
      isDevelopMenuDefaultEnabled);
    deviceInfoPanel.tapDeviceInfoBackBtn();
    assert.notEqual(deviceInfoPanel.isDeveloperMenuItemVisible,
      isDevelopMenuDefaultEnabled);
  });

  test('check your rights panel', function() {
    deviceInfoPanel.tapOnYourRightsButton();
  });

  test('check your privacy panel', function() {
    deviceInfoPanel.tapOnYourPrivacyButton();
    deviceInfoPanel.tapOnPrivacyBrowserButton();
  });

  test('check legal information panel', function() {
    deviceInfoPanel.tapOnLegalInfoButton();
    deviceInfoPanel.tapOnOpenSourceNoticesButton();
    deviceInfoPanel.tapOpenSourceNoticesBackBtn();
    deviceInfoPanel.tapOnObtainingSourceCodeButton();
  });

  test('check reset phone', function() {
    assert.ok(!deviceInfoPanel.isResetPhoneDialogVisible,
      'Reset phone dialog is hidden');
    deviceInfoPanel.tapOnResetPhoneButton();
    assert.ok(deviceInfoPanel.isResetPhoneDialogVisible,
      'Reset phone dialog is visible');
    deviceInfoPanel.tapOnCancelResetPhoneButton();
    assert.ok(!deviceInfoPanel.isResetPhoneDialogVisible,
      'Reset phone dialog is hidden');
  });
});
