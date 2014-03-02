/*jshint node: true */
/*global marionette, setup, test */

var Email = require('./lib/email');
var EmailData = require('./lib/email_data');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('email notifications, set interval', function() {
  var app,
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
                }, this);

  function getAlarms(client) {
    var alarms;
    client.waitFor(function() {
      alarms = client.executeScript(function() {
        var alarms = window.wrappedJSObject.navigator.__mozFakeAlarms;
        if (alarms && alarms.length) {
            return alarms;
        }
       });
      return alarms;
    });
    return alarms;
  }

  setup(function() {
    app = new Email(client);

    client.contentScript.inject(__dirname +
      '/lib/mocks/mock_navigator_mozalarms.js');
    app.launch();
  });

  test('should change sync interval from manual to 1 hour',
  function() {
    app.manualSetupImapEmail(server1);

    // Open settings and change the sync interval value.
    app.tapFolderListButton();
    app.tapSettingsButton();
    app.tapSettingsAccountIndex(0);
    app.setSyncIntervalSelectValue(3600000);

    // Wait for the account to report that it has the syncInterval
    // change.
    var emailData = new EmailData(client);
    emailData.waitForCurrentAccountUpdate('syncInterval', 3600000);

    // Make sure an alarm was set.
    var alarms = getAlarms(client);
    assert(alarms.length === 1, 'have one alarm');
    var alarm = alarms[0];
    assert(alarm.interval === 3600000, 'has correct interval value');

    // Close the app, relaunch and make sure syncInterval was
    // persisted correctly
    app.close();
    app.launch();
    var account = emailData.getCurrentAccount();
    assert(account.syncInterval === 3600000, 'sync interval is correct');
  });
});
