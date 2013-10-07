/*jshint node: true */
/*global marionette, setup, test */

var Email = require('./lib/email');
var EmailSync = require('./lib/email_sync');
var assert = require('assert');
var Notification = require('./lib/notification');
var serverHelper = require('./lib/server_helper');

marionette('email notifications, foreground', function() {
  var app, sync, notification,
      client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false
        }
      }),
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

    for (var i = 0; i < messageCount; i++)
      sendEmail(server1);

    // Now set up second account, to confirm system notifications
    // are only triggered in certain situations.
    app.tapFolderListButton();
    app.tapSettingsButton();
    app.tapAddAccountButton();
    app.manualSetupImapEmail(server2);
  }

  setup(function() {
    app = new Email(client);
    notification = new Notification(client);
    sync = new EmailSync(client);
    sync.setup();

    app.launch();
  });

  test('should have 1 message notification in the different account',
  function() {
    configureAndSend(1);

    sync.triggerSync();

    // Go back to system app
    client.switchToFrame();

    // Make sure notification container is visible
    assert(notification
           .getFirstIconUrl().indexOf('type=message_reader') !== -1);
  });

  test('should have bulk message notification in the different account',
  function() {
    configureAndSend(2);

    sync.triggerSync();

    // Go back to system app
    client.switchToFrame();

    // Make sure notification container is visible
    assert(notification
           .getFirstIconUrl().indexOf('type=message_list') !== -1);
  });

  test('should not get a notification for same account', function() {
    configureAndSend(1);

    // Switch back to testy1 account in the UI
    app.tapFolderListButton();
    app.tapAccountListButton();
    // switch to the testy1 account
    app.switchAccount(1);
    // hide the folder list page
    app.tapFolderListCloseButton();

    // Now sync
    sync.triggerSync();

    // Go back to system app
    client.switchToFrame();

    notification.assertNoNotification();
  });
});
