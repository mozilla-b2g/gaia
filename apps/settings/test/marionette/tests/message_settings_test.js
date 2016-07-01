'use strict';

var Settings = require('../app/app');
var assert = require('assert');

marionette('message settings', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var settingsApp;
  var messagePanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    messagePanel = settingsApp.messagePanel;
  });

  suite('click on all menuItems', function() {
    setup(function() {
      messagePanel.initialMessagingSettings();
      messagePanel.toggleMenuItem('requestDeliveryReport', true);
      messagePanel.toggleMenuItem('requestReadReport', true);
      messagePanel.toggleMenuItem('sendReadReport', true);
      messagePanel.toggleMenuItem('wapPush', true);
      messagePanel.toggleMenuItem('cellBroadcast', true);
      messagePanel.toggleMenuItem('emergencyAlert', true);

      // select specific option
      messagePanel.chooseRetrieveMethod('On with roaming');
    });

    test('we would reflect status on related stuffs', function() {
      assert.equal(
        messagePanel.isChecked('requestDeliveryReportCheckbox'), true);
      assert.equal(messagePanel.isChecked('requestReadReportCheckbox'), true);
      assert.equal(messagePanel.isChecked('sendReadReportCheckbox'), true);
      assert.equal(messagePanel.isChecked('wapPushCheckbox'), true);
      assert.equal(messagePanel.isComponentChecked('cellBroadcastCheckbox'),
        true);
      assert.equal(messagePanel.isComponentChecked('emergencyAlertCheckbox'),
        true);
      assert.equal(
        client.settings.get('ril.sms.requestStatusReport.enabled'), true);
      assert.equal(
        client.settings.get('ril.mms.requestReadReport.enabled'), true);
      assert.equal(
        client.settings.get('messages.mms.sendReadReport.enabled'), true);
      assert.equal(
        client.settings.get('wap.push.enabled'), true);
      assert.equal(
        client.settings.get('ril.cellbroadcast.disabled'), false);
      assert.equal(
        client.settings.get('cmas.enabled')[0], true);

      // we will keep its value as `automatic`
      assert.equal(messagePanel.getSelectedRetrieveMethod(), 'automatic');
    });
  });

  suite('check Cell Broadcast and CMAS dependency', function() {
    setup(function() {
      messagePanel.initialMessagingSettings();
      messagePanel.toggleMenuItem('emergencyAlert', true);
      messagePanel.toggleMenuItem('cellBroadcast', false);
    });

    test('when CB off, CMAS is also off and disabled', function() {
      assert.equal(
        client.settings.get('ril.cellbroadcast.disabled'), true);
      assert.equal(
        client.settings.get('cmas.enabled')[0], false);
      assert.equal(messagePanel.isEmergencyAlertCheckboxEnabled, false);
    });
  });
});
