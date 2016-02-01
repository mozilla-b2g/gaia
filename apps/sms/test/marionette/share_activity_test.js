/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');
const NewMessageView = require('./lib/views/new-message/view');

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
      let newMessageView;

      setup(function() {
        activityCallerApp.launch();
        activityCallerApp.shareImage();

        messagesApp.switchTo();

        newMessageView = new NewMessageView(client);
      });

      teardown(function() {
        // Verify that Messages is dismissed.
        messagesApp.waitForAppToDisappear();
      });

      test('Should close activity if in NewMessage view', function() {
        assert.equal(
          newMessageView.headerAction,
          'close',
          'Close activity button should be visible'
        );

        newMessageView.back();
      });

      test('Should close activity if in Conversation view', function() {
        // Send message to be forwarded to Conversation panel afterwards
        newMessageView.addNewRecipient('+1');
        let conversationView = newMessageView.send();

        assert.equal(
          conversationView.headerAction,
          'close',
          'Close activity button should be visible'
        );

        newMessageView.back();
      });

      test('Should return to Conversation view if in Report view', function() {
        // Send message to be forwarded to Conversation panel afterwards
        newMessageView.addNewRecipient('+1');
        let conversationView = newMessageView.send();

        let reportView = conversationView.openReport(
          conversationView.messages()[0].id
        );

        assert.equal(
          reportView.headerAction,
          'close',
          'Close activity button should be visible'
        );

        // Close report panel
        reportView.back();

        assert.equal(
          conversationView.headerAction,
          'close',
          'Close activity button should be visible'
        );

        conversationView.back();
      });

      test('Should return to Conversation panel if in Participants panel',
      function() {
        // Send group MMS message
        newMessageView.addNewRecipient('+1');
        newMessageView.addNewRecipient('+2');

        // TODO: This should be moved to the appropriate test case in:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1043903
        newMessageView.typeMessage(
          'very_very_very_very_very_very_long_message_i_can_ever_imagine'
        );

        let conversationView = newMessageView.send();

        // Go to Participants panel
        let participantsView = conversationView.openParticipants();

        assert.equal(
          participantsView.headerAction,
          'back',
          'Close activity button should be visible'
        );

        // Go back to Conversation panel
        participantsView.back();

        assert.equal(
          conversationView.headerAction,
          'close',
          'Close activity button should be visible'
        );

        conversationView.back();
      });
    });
  });
});
