/*jshint node: true */
/*global marionette */
'use strict';
var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('activity create email account', function() {
  var app,
      client = marionette.client(),
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


  /**
   * XXX: Bug 907013 changes the DOM structure of window.confirm,
   * and this is causing problems in finding out the confirm dialog
   * as well as tapping the ok button.
   */
  test.skip('should complete activity after creating account', function() {

    client.waitFor(function() {
      return client.executeScript(function() {
        var req = window.wrappedJSObject.require;
        return req.defined('cards');
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


