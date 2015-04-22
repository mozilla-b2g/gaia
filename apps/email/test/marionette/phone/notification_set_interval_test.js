'use strict';
/*jshint node: true */
/*global marionette, setup, test */

var Email = require('../lib/email');
var EmailData = require('../lib/email_data');
var assert = require('assert');
var serverHelper = require('../lib/server_helper');

marionette('email notifications, set interval', function() {
  var app,
      client = marionette.client(),
      server1 = serverHelper.use({
                  credentials: {
                    username: 'testy1',
                    password: 'testy1'
                  }
                }, this);

  setup(function() {
    app = new Email(client);
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

    // Close the app, relaunch and make sure syncInterval was
    // persisted correctly
    app.close();
    app.launch();
    var account = emailData.getCurrentAccount();
    assert(account.syncInterval === 3600000, 'sync interval is correct');
  });
});
