'use strict';

var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate browsing privacy settings', function() {
  var client = marionette.client();
  var settingsApp;
  var browsingPrivacyPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the Browsing Privacy menu
    browsingPrivacyPanel = settingsApp.browsingPrivacyPanel;
  });

  test('check private browsing initial state and toggle', function() {
    assert.ok(
      !browsingPrivacyPanel.isPrivateBrowsingEnabled,
      'private browsing disabled by default'
    );
    browsingPrivacyPanel.enablePrivateBrowsing();
    assert.ok(
      browsingPrivacyPanel.isPrivateBrowsingEnabled,
      'private browsing has been enabled'
    );
  });

  test('check tracking protection initial state and toggle', function() {
    assert.ok(
      !browsingPrivacyPanel.isTrackingProtectionEnabled,
      'tracking protection disabled by default'
    );
    browsingPrivacyPanel.enableTrackingProtection();
    assert.ok(
      browsingPrivacyPanel.isTrackingProtectionEnabled,
      'tracking protection has been enabled'
    );
  });

  test('check clear history button, confirm dialog will show' +
       'click cancel, and click submit', function() {
    browsingPrivacyPanel.clickClearHistoryButton();
    assert.ok(
      browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is shown'
    );
    browsingPrivacyPanel.clickConfirmDialogCancel();
    assert.ok(
      !browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is hidden'
    );
    browsingPrivacyPanel.clickClearHistoryButton();
    assert.ok(
      browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is shown'
    );
    browsingPrivacyPanel.clickConfirmDialogSubmit();
    assert.ok(
      !browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is hidden'
    );
  });

  test('check private data button, confirm dialog will show' +
       'click cancel, and click submit', function() {
    browsingPrivacyPanel.clickClearPrivateDataButton();
    assert.ok(
      browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is shown'
    );
    browsingPrivacyPanel.clickConfirmDialogCancel();
    assert.ok(
      !browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is hidden'
    );
    browsingPrivacyPanel.clickClearPrivateDataButton();
    assert.ok(
      browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is shown'
    );
    browsingPrivacyPanel.clickConfirmDialogSubmit();
    assert.ok(
      !browsingPrivacyPanel.confirmDialogShown,
      'confirm dialog is hidden'
    );
  });
});
