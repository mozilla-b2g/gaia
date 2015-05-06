/*jshint node: true */
/*global marionette, setup, test */
'use strict';

var Email = require('./lib/email');
var EmailSync = require('./lib/email_sync');
var NotificationLib = require('./lib/notification');
var serverHelper = require('./lib/server_helper');

marionette('email notifications, click', function() {
  var app, sync, notification,
      client = marionette.client(),
      server1 = serverHelper.use({
                  credentials: {
                    username: 'testy1',
                    password: 'testy1'
                  }
                }, this),
      server2 = serverHelper.use({
                  credentials: {
                    username: 'testy2',
                    password: 'testy2'
                  }
                }, this);

  function sendEmail(server) {
    var email = server.imap.username + '@' + server.imap.hostname;
    app.tapCompose();
    app.typeTo(email);
    app.typeSubject('test email');
    app.typeBody('I still have a dream.');
    app.tapSend();
  }

  function configureAndSend(messageCount) {

    // Set up testy1, send email to testy1, since smtp fakserver
    // is paired with the imap fakserver for that account. So,
    // no cross sending of email across fakeserver instances.
    app.manualSetupImapEmail(server1);

    for (var i = 0; i < messageCount; i++) {
      sendEmail(server1);
    }

    // Now set up second account, to confirm system notifications
    // are only triggered in certain situations.
    app.tapFolderListButton();
    app.tapSettingsButton();
    app.tapAddAccountButton();
    app.manualSetupImapEmail(server2);
  }

  setup(function() {
    app = new Email(client);
    notification = new NotificationLib(client);
    sync = new EmailSync(client);
    sync.setup();

    app.launch();
  });

  test('show message_reader for 1 message notification', function() {
    configureAndSend(1);

    sync.triggerSync();

    notification.triggerFirstNotification();

    // Since a single message notification, should go to message_reader.
    app.waitForMessageReader();
  });

  test('show message_list for multiple message notification',
  function() {
    configureAndSend(2);

    sync.triggerSync();

    notification.triggerFirstNotification();

    // Since a single message notification, should go to message_reader.
    app.waitForMessageList();
  });
});
