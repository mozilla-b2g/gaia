'use strict';
var Email = require('./lib/email');
var serverHelper = require('./lib/server_helper');

marionette('Use a different outgoing password', function() {
  var app,
      client = marionette.client({
        settings: {
          // disable keyboard ftu because it blocks our display
          'keyboard.ftu.enabled': false
        }
      });

  setup(function() {
    app = new Email(client);
    app.launch();
  });

  var server = serverHelper.use({
    credentials: {
      username: 'testy',
      password: 'testy',
      outgoingPassword: 'outgoingtesty'
    }
  }, this);

  test('should be able to manually set up email', function() {
    app.manualSetupImapEmail(server);
  });
});

