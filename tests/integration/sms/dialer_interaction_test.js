/* global require, marionette, setup, suite, test */
'use strict';

var assert = require('chai').assert;

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module

var fromApp = require(appRoot + '/shared/test/integration/require_from_app');
var Messages = fromApp('sms').require('lib/messages');
var InboxView = fromApp('sms').require('lib/views/inbox/view');
var ThreadGenerator = fromApp('sms').require('generators/thread');
var Storage = fromApp('sms').require('lib/storage.js');

marionette('Dialer', function() {
  var MOCKS = [
    fromApp('sms').filePath('mocks/mock_test_storages.js'),
    fromApp('sms').filePath('mocks/mock_test_blobs.js'),
    fromApp('sms').filePath('mocks/mock_navigator_moz_mobile_message.js')
  ];

  var messagesApp;

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var thread;
  var storage;

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    MOCKS.forEach(function(mock) {
      client.contentScript.inject(mock);
    });
  });

  suite('Call button', function() {
    setup(function() {
      thread = ThreadGenerator.generate();

      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);

      messagesApp.launch();
    });

    test('should go to dialer with the correct phone number', function() {
      var inbox = new InboxView(client);
      var conversation = inbox.goToConversation(thread.id);
      var dialer = conversation.callContact();
      assert.equal(dialer.phoneNumber, thread.participants[0]);
    });
  });
});
