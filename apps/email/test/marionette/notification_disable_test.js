/*jshint node: true */
/*global marionette, setup, test */

var Email = require('./lib/email');
var EmailData = require('./lib/email_data');
var EmailSync = require('./lib/email_sync');
var Notification = require('./lib/notification');
var serverHelper = require('./lib/server_helper');

marionette('email notifications, disable', function() {
  var app, sync,
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
  }

  setup(function() {
    app = new Email(client);
    sync = new EmailSync(client);
    sync.setup();

    app.launch();
  });

  test.skip('disable notification, but still sync - intermittent bug 922746',
  function() {
    configureAndSend(1);

    // Open the prefs and turn off getting notifications.
    app.tapFolderListButton();
    app.tapSettingsButton();
    app.tapSettingsAccountIndex(0);
    app.tapNotifyEmailCheckbox();
    app.tapAccountSettingsBackButton();
    app.tapSettingsDoneButton();
    app.tapFolderListCloseButton();

    // Wait for the account to report the pref change.
    var emailData = new EmailData(client);
    emailData.waitForCurrentAccountUpdate('notifyOnNew', false);

    // Now set up second account, to confirm system notifications
    // are only triggered in certain situations.
    app.tapFolderListButton();
    app.tapSettingsButton();
    app.tapAddAccountButton();
    app.manualSetupImapEmail(server2);

    sync.triggerSync();

    // Go back to system app, make sure no notification shows up
    client.switchToFrame();

    var notification = new Notification(client);
    notification.assertNoNotification();
  });
});
