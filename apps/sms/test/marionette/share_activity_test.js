/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');

marionette('Messages as share target', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    apps: apps
  });

  var messagesApp,
      activityCallerApp;

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Share via Messages', function() {
    suite('Activity close button', function() {
      setup(function() {
        activityCallerApp.launch();
        activityCallerApp.shareImage();

        messagesApp.switchTo();
      });

      test('Should close activity if in Composer panel', function() {
        assert.ok(
          messagesApp.Composer.header.getAttribute('action') === 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.selectAppMenuOption('Delete Draft');
        messagesApp.waitForAppToDisappear();
      });

      test('Should close activity if in Conversation panel', function() {
        // Send message to be forwarded to Conversation panel afterwards
        messagesApp.addRecipient('+1');
        messagesApp.send();

        assert.ok(
          messagesApp.Composer.header.getAttribute('action') === 'close',
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
        messagesApp.selectAppMenuOption('View message report');
        client.helper.waitForElement(messagesApp.Report.main);

        assert.ok(
          messagesApp.Report.header.getAttribute('action') === 'close',
          'Close activity button should be visible'
        );

        // Close report panel
        messagesApp.performReportHeaderAction();
        client.helper.waitForElement(messagesApp.Conversation.message);

        assert.ok(
          messagesApp.Composer.header.getAttribute('action') === 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });

      test('Should return to Conversation panel if in Participants panel',
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
        client.helper.waitForElement(messagesApp.Participants.main);

        assert.ok(
          messagesApp.Participants.header.getAttribute('action') === 'back',
          'Back activity button should be visible'
        );

        // Go back to Conversation panel
        messagesApp.performGroupHeaderAction();
        client.helper.waitForElement(messagesApp.Conversation.message);

        assert.ok(
          messagesApp.Composer.header.getAttribute('action') === 'close',
          'Close activity button should be visible'
        );

        // Exit from activity and verify that Messages is dismissed
        messagesApp.performHeaderAction();
        messagesApp.waitForAppToDisappear();
      });
    });
  });
});
