'use strict';

var Email = require('./lib/email');
var assert = require('assert');
var serverHelper = require('./lib/server_helper');

marionette('email message list edit mode', function() {
  var app;

  var client = marionette.client({
    settings: {
      // disable keyboard ftu because it blocks our display
      'keyboard.ftu.enabled': false
    }
  });

  var server = serverHelper.use(null, this);

  setup(function() {
    app = new Email(client);
    app.launch();
    app.manualSetupImapEmail(server);
    app.sendAndReceiveMessages([
      { to: 'testy@localhost', subject: 'Only One Lonely', body: 'Fish' }
    ]);
  });

  test('tapping trash with no selected messages should exit', function() {
    assert.ok(true);
    app.editMode();
    app.editModeTrash();

    var checkboxes = app.editModeCheckboxes();
    assert.ok(!checkboxes[0].displayed());
  });

});
