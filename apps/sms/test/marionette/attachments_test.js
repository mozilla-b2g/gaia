/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('./lib/messages.js');
var MessagesActivityCaller = require('./lib/messages_activity_caller.js');

marionette('Attachment picking and sending tests', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/apps/activitycaller';

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },

      apps: apps
    }
  });

  var messagesApp, activityCallerApp;

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

  suite('Test Suite', function() {

    setup(function() {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
    });

    test('A contact can be enclosed as attachment', function() {
      messagesApp.addRecipient('+346666666');

      var composer = messagesApp.Composer;

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      messagesApp.selectSystemMenuOption('Messages Activity Caller');

      activityCallerApp.switchTo();
      activityCallerApp.pickContact();

      messagesApp.switchTo();
      messagesApp.send();

      client.helper.waitForElement(messagesApp.Selectors.Message.
                                                              vcardAttachment);
      var fileName = client.helper.waitForElement(messagesApp.Selectors.
                                                            Message.fileName);
      assert.equal(fileName.text(), 'test_file.vcf');
    });
  });
});
