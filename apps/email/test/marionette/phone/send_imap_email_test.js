'use strict';

var Email = require('../lib/email');
var serverHelper = require('../lib/server_helper');

marionette('send email via IMAP', function() {
  var app,
      client = marionette.client();

  setup(function() {
    app = new Email(client);
    app.launch();
  });

  var server = serverHelper.use(null, this);

  test('should send a email', function() {
    app.manualSetupImapEmail(server);
    app.tapCompose();

    // write email to self
    app.typeTo('testy@localhost');
    app.typeSubject('test email');
    app.typeBody('I still have a dream.');
    app.tapSend();

    app.tapRefreshButton();
    app.waitForSynchronized(0);
  });
});

