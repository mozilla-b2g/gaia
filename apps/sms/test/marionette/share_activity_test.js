/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');

marionette('Messages as share target', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var messagesApp,
      activityCallerApp;

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.loader.getMockManager('sms').inject([
      'navigator_moz_icc_manager',
      'navigator_moz_mobile_message'
    ]);
  });

  suite('Share via Messages', function() {
    suite('Activity close button', function() {
      setup(function() {
        activityCallerApp.launch();
        activityCallerApp.shareImage();

        messagesApp.switchTo();
      });

      test('Should close activity if in NewMessage view', function() {
        assert.equal(
          messagesApp.NewMessage.header.getAttribute('action'), 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });

      test('Should close activity if in Conversation view', function() {
        // Send message to be forwarded to Conversation panel afterwards
        messagesApp.addRecipient('+1');
        messagesApp.send();

        assert.equal(
          messagesApp.NewMessage.header.getAttribute('action'), 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });

      test('Should return to Conversation view if in Report view', function() {
        // Send message to be forwarded to Conversation panel afterwards
        messagesApp.addRecipient('+1');
        messagesApp.send();

        // Go to the Report panel
        messagesApp.contextMenu(messagesApp.Conversation.message);
        messagesApp.Menu.selectAppMenuOption('View message report');
        messagesApp.Report.waitToAppear();

        assert.equal(
          messagesApp.Report.header.getAttribute('action'), 'close',
          'Close activity button should be visible'
        );

        // Close report panel
        messagesApp.performReportHeaderAction();
        client.helper.waitForElement(messagesApp.Conversation.message);

        assert.equal(
          messagesApp.NewMessage.header.getAttribute('action'), 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });

      // Temporarily skip due to intermittent failures - Participants view is
      // not opened after tapping on the conversation header.
      test.skip('Should return to Conversation panel if in Participants panel',
      function() {
        // Send group MMS message
        messagesApp.addRecipient('+1');
        messagesApp.addRecipient('+2');

        // TODO: This should be moved to the appropriate test case in:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1043903
        messagesApp.Composer.messageInput.sendKeys(
          'very_very_very_very_very_very_long_message_i_can_ever_imagine'
        );

        messagesApp.send();

        // Go to Participants panel
        messagesApp.Conversation.headerTitle.tap();
        messagesApp.Participants.waitToAppear();

        assert.equal(
          messagesApp.Participants.header.getAttribute('action'), 'back',
          'Close activity button should be visible'
        );

        // Go back to Conversation panel
        messagesApp.performGroupHeaderAction();
        client.helper.waitForElement(messagesApp.Conversation.message);

        assert.equal(
          messagesApp.NewMessage.header.getAttribute('action'), 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });
    });
  });
});
