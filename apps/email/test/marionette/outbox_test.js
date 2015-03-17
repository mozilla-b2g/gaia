'use strict';
var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

/**
 * Other tests cover simple sending and receiving. Thus these outbox
 * tests focus on handling of the outbox itself -- messages pending in
 * the queue, refreshing them, etc.
 */
marionette('outbox', function() {
  var client = marionette.client();

  var INVALID_EMAIL = 'invalid@@';
  var app;
  var server = serverHelper.use(null, this);

  suite('bad recipient', function() {
    setup(function() {
      app = new Email(client);
      app.launch();
      app.manualSetupImapEmail(server);
      for (var i = 0; i < 2; i++) {
        app.tapCompose();
        app.typeTo(INVALID_EMAIL);
        app.tapSend();
        app.waitForToaster();
      }

      // Navigate to the outbox.
      app.tapFolderListButton();
      app.tapOutboxItem();
    });

    test('a failed message should end up in the outbox', function() {
      app.getHeaderAtIndex(0).tap();
      // This should take us to the compose screen, where we see the
      // outbox message, along with a warning telling us why the send
      // failed.
      assert.equal(app.getComposeTo(), INVALID_EMAIL);
      assert(app.getComposeErrorMessage().length > 0);
    });

    test('refresh the outbox, message still fails', function() {
      assert.equal(app.getOutboxItemSyncIconForIndex(0), 'error');
      app.tapRefreshButton();
      // It should then finish syncing at some point; do to test timing
      // it would be unwise to try to test for the 'syncing' icon's
      // presence while refreshing, but we can at least check to ensure
      // the sync happened.
      client.waitFor(function() {
        return /just now/.test(app.getLastSyncText());
      });
      assert.equal(app.getOutboxItemSyncIconForIndex(0), 'error');
    });
  });

});
