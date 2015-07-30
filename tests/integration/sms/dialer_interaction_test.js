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
  var messagesApp;

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true
    }
  });

  var thread;
  var storage;

  setup(function() {
    messagesApp = Messages.create(client);
    storage = Storage.create(client);

    client.contentScript.inject(
      fromApp('sms').filePath('mocks/mock_test_storages.js')
    );
    client.contentScript.inject(
      fromApp('sms').filePath('mocks/mock_navigator_moz_mobile_message.js')
    );
  });

  suite('Call button', function() {
    setup(function() {
      thread = ThreadGenerator.generate();

      messagesApp.launch();
      storage.setMessagesStorage([thread], ThreadGenerator.uniqueMessageId);
    });

    test('should go to dialer with the correct phone number', function() {
      var inbox = new InboxView(client);
      var conversation = inbox.goToFirstThread();
      var dialer = conversation.callContact();
      assert.equal(dialer.phoneNumber, thread.participants[0]);
    });
  });
});
