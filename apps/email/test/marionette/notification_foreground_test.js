/*jshint node: true */
/*global marionette, window, setup, test */

var Email = require('./email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('email notifications, foreground', function() {
  var app,
      notificationContainer,
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

  function triggerSync() {
    client.setScriptTimeout(200000);
    // trigger sync in Email App
    client.executeScript(function() {
      var interval = 1000;
      var date = new Date(Date.now() + interval).getTime();
      var alarm = {
        data: {
          type: 'sync',
          accountIds: ['0', '1'],
          interval: interval,
          timestamp: date
        }
      };
      return window.wrappedJSObject.fireMessageHandler(alarm);
    });

    client.helper.wait(2000);
  }

  setup(function() {
    app = new Email(client);

    client.contentScript.inject(__dirname +
      '/lib/mocks/mock_navigator_moz_set_message_handler.js');
    app.launch();
  });

  test('should have 1 message notification in the different account',
  function() {
    configureAndSend(1);

    triggerSync();

    // Go back to system app
    client.switchToFrame();

    // Make sure notification container is visible
    notificationContainer =
      client.findElement('#desktop-notifications-container');

    var img = notificationContainer.findElement('img');
    assert(img.getAttribute('src').indexOf('type=message_reader') !== -1);
    // ------ THIS A HACK WE NEED TO USE SYSTEM APPS HELPER ---
  });

  test('should have bulk message notification in the different account',
  function() {
    configureAndSend(2);

    triggerSync();

    // Go back to system app
    client.switchToFrame();

    // Make sure notification container is visible
    notificationContainer =
      client.findElement('#desktop-notifications-container');

    var img = notificationContainer.findElement('img');
    assert(img.getAttribute('src').indexOf('type=message_list') !== -1);
    // ------ THIS A HACK WE NEED TO USE SYSTEM APPS HELPER ---');
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
    triggerSync();

    client.findElement('#desktop-notifications-container', function(error) {
      assert.ok(!!error);
    });
  });
});
