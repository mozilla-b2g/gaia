/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var assert = require('assert');

var Messages = require('./lib/messages.js');

marionette('Thread Panel Tests', function() {
  var apps = {};

  var client = marionette.client({
    settings: {
      'lockscreen.enabled': false,
      'ftu.manifestURL': null
    },

    apps: apps
  });

  var messagesApp;

  setup(function() {
    messagesApp = Messages.create(client);

    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_icc_manager.js'
    );
    client.contentScript.inject(
      __dirname + '/mocks/mock_navigator_moz_mobile_message.js'
    );
  });

  suite('Forward message', function() {
    setup(function() {
      messagesApp.launch();
      messagesApp.ThreadList.navigateToComposer();

      // Create new thread from the scratch
      messagesApp.addRecipient('+1');
      messagesApp.Composer.messageInput.sendKeys('message');
      messagesApp.send();
    });

    test('Header should be updated accordingly', function() {
      client.helper.waitForElement(messagesApp.Thread.message);

      assert.equal(
        messagesApp.Thread.headerTitle.text(),
        '+1',
        'Header title should display contact phone number'
      );

      // Forward message
      messagesApp.contextMenu(messagesApp.Thread.message);
      messagesApp.selectAppMenuOption('Forward');
      // Wait for message to be forwarded to fill out composer fields
      client.waitFor(function() {
        return messagesApp.Composer.messageInput.text() === 'message';
      });

      assert.equal(
        messagesApp.Thread.headerTitle.text(),
        'New message',
        'Header title should indicate that we are composing new message'
      );
    });
  });
});
