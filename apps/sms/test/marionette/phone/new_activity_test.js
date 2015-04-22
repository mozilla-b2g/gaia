/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('chai').assert;

var Messages = require('../lib/messages.js');
var MessagesActivityCaller = require('../lib/messages_activity_caller.js');

marionette('Messages as "new" activity target', function() {
  var apps = {};

  apps[MessagesActivityCaller.ORIGIN] = __dirname + '/../apps/activitycaller';

  var client = marionette.client({
    apps: apps
  });

  var messagesApp,
      activityCallerApp;

  setup(function() {
    messagesApp = Messages.create(client);
    activityCallerApp = MessagesActivityCaller.create(client);

    client.contentScript.inject(
      __dirname + '/../mocks/mock_navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/../mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Send new message', function() {
    suite('Using activity.data.body and activity.data.number', function() {
      var number = '+1234567';
      var content = 'Let\'s rock - http://mozilla.org' +
                    '<img src="/" onerror="delete window.Compose;" />';

      setup(function() {
        activityCallerApp.launch();
        activityCallerApp.sendMessage(number, content);

        messagesApp.switchTo();
      });

      test('Correctly initializes message content and recipients', function() {
        // Verify that xss wasn't successful for composer case
        assert.isTrue(client.executeScript(function() {
          return !!window.wrappedJSObject.Compose;
        }), 'XSS should not be performed');

        assert.equal(messagesApp.Composer.messageInput.text(), content);

        assert.equal(messagesApp.Composer.recipients.length, 1);
        assert.equal(messagesApp.Composer.recipients[0].text(), number);

        assert.isTrue(messagesApp.Composer.sendButton.enabled());

        messagesApp.send();

        // Verify that everything is fine with rendered message content
        var message = messagesApp.Thread.message;
        assert.equal(
          messagesApp.Thread.getMessageContent(message).text(),
          content
        );

        // Verify that xss wasn't successful for thread case
        assert.isTrue(client.executeScript(function() {
          return !!window.wrappedJSObject.Compose;
        }), 'XSS should not be performed');
      });
    });
  });
});
