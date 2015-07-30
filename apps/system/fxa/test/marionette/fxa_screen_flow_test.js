'use strict';

var fs = require('fs'),
    FxA = require('./lib/fxa'),
    FxAUser = require('./lib/fxa_user'),
    Server = require('./lib/server'),
    config = JSON.parse(fs.readFileSync(__dirname + '/lib/config.json'));

marionette('Firefox Accounts Screen Flow Test (UITest app)', function() {
  var app,
      selectors,
      server,
      fxaUser,
      client = marionette.client({
        profile: {
          prefs: {
            'identity.fxaccounts.auth.uri': 'http://' +
              config.SERVER_HOST + ':' +
              config.SERVER_PORT + '/' +
              config.SERVER_PATH
            }
        }
      });

  setup(function() {
    fxaUser= new FxAUser();
    app = new FxA(client);
    Server.create(FxA.SERVER_ARGS, function (err, _server) {
      server = _server;
    });
    selectors = FxA.Selectors;
    app.launch(FxA.UITEST_ORIGIN);
    app.runUITestMenu();
  });

  teardown(function() {
    server.stop();
  });

  test('should walk screen flow for new user', function () {
    app.enterEmailNew();
    app.clickNext();
    app.clickNext();
    app.enterPasswordNew();
    app.clickNext();
    app.clickDone();
  });

  test('should walk screen flow for existing user', function () {
    app.enterEmailExisting();
    app.clickNext();
    app.clickNext();
    app.enterPasswordExisting();
    app.clickNext();
    app.clickDone();
  });
});





