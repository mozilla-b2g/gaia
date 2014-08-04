'use strict';

var Settings = require('../app/app');
var assert = require('assert');

marionette('message settings', function() {
  var client = marionette.client();
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
      messagePanel.toggleMenuItem('deliveryReport', true);
      messagePanel.toggleMenuItem('readReport', true);
      messagePanel.toggleMenuItem('wapPush', true);
      messagePanel.toggleMenuItem('cellBroadcast', true);

      // select specific option
      messagePanel.chooseRetrieveMethod('On with roaming');
    });

    test('we would reflect status on related stuffs', function() {
      assert.equal(messagePanel.isChecked('deliveryReportCheckbox'), true);
      assert.equal(messagePanel.isChecked('readReportCheckbox'), true);
      assert.equal(messagePanel.isChecked('wapPushCheckbox'), true);
      assert.equal(messagePanel.isChecked('cellBroadcastCheckbox'), true);
      assert.equal(
        client.settings.get('ril.sms.requestStatusReport.enabled'), true);
      assert.equal(
        client.settings.get('ril.mms.requestReadReport.enabled'), true);
      assert.equal(
        client.settings.get('wap.push.enabled'), true);
      assert.equal(
        client.settings.get('ril.cellbroadcast.disabled'), false);

      // we will keep its value as `automatic`
      assert.equal(messagePanel.getSelectedRetrieveMethod(), 'automatic');
    });
  });
});
