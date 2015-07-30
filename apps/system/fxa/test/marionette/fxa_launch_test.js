'use strict';

var fs = require('fs'),
    FxA = require('./lib/fxa'),
    FxAUser = require('./lib/fxa_user'),
    Server = require('./lib/server'),
    config = JSON.parse(fs.readFileSync(__dirname + '/lib/config.json'));

marionette('Firefox Accounts Launch Tests', function() {
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
          },
          settings: {
            'ftu.manifestURL': FxA.FTU_ORIGIN + '/manifest.webapp'
          },
          apps: {
            'test-fxa-client.gaiamobile.org': __dirname + '/test-fxa-client'
          }
        },
        desiredCapabilities: { raisesAccessibilityExceptions: true }
      });

    setup(function() {
      fxaUser= new FxAUser();
      app = new FxA(client);
      Server.create(FxA.SERVER_ARGS, function (err, _server) {
        server = _server;
      });
      selectors = FxA.Selectors;
    });

    teardown(function() {
      server.stop();
    });

  //If we can enter email on first screen, that should prove successful launch
  suite('Should launch FxA flow from FxA-consuming apps:', function () {
    test('Settings app', function () {
      app.launch(FxA.SETTINGS_ORIGIN);
      app.runSettingsMenu();
      app.enterEmailNew();
    });

    test('UITest app', function () {
      app.launch(FxA.UITEST_ORIGIN);
      app.runUITestMenu();
      app.enterEmailNew();
    });

    test('FTU menu', function () {
      app.launch(FxA.FTU_ORIGIN);
      app.runFTUMenu();
      app.enterEmailNew();
    });

    test('test-fxa-client app', function () {
      app.launch(FxA.TEST_FXA_CLIENT_ORIGIN);
      app.runFxAClientTestMenu();
      app.enterEmailNew();
    });
  });
});


