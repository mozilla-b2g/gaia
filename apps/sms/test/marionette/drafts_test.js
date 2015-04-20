/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');

marionette('Messages Drafts', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },

    apps: apps
  });

  var messagesApp, activityCallerApp;

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Messages Drafts Test Suite', function() {

    setup(function() {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
    });

    test('Drafts are correctly saved', function() {
      var composer = messagesApp.Composer;

      composer.messageInput.tap();
      composer.messageInput.sendKeys('some message');

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      messagesApp.selectSystemMenuOption('Messages Activity Caller');

      activityCallerApp.switchTo();
      activityCallerApp.pickImage();

      messagesApp.switchTo();
      messagesApp.performHeaderAction();

      messagesApp.selectAppMenuOption('Save as Draft');
      var firstConversation = messagesApp.Inbox.firstConversation;
      assert.ok(
        firstConversation.getAttribute('class').indexOf('draft') !== -1
      );
      firstConversation.tap();

      assert.ok(composer.attachment);
    });
  });
});
