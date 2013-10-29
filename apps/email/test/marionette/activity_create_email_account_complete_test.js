/*jshint node: true */
/*global marionette */
'use strict';
var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('activity create email account', function() {
  var app,
      client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false
        }
      }),
      server = serverHelper.use({
        credentials: {
          username: 'testy1',
          password: 'testy1'
        }
      }, this);

  setup(function() {
    app = new Email(client);

    client.contentScript.inject(__dirname +
      '/lib/mocks/mock_navigator_moz_set_message_handler_activity.js');

    app.launch();
  });


  test('should complete activity after creating account', function() {

    client.waitFor(function() {
      return client.executeScript(function() {
        var req = window.wrappedJSObject.require;
        return req.defined('mail_common');
      });
    });

    client.executeScript(function() {
      window.wrappedJSObject.fireMessageHandler({
        source: {
          name: 'new',
          data: {
            type: 'mail',
            URI: 'mailto:testy@localhost'
          }
        }
      });
    });

    app.confirmWantAccount();
    app.manualSetupImapEmail(server, 'waitForCompose');

  });
});


