'use strict';

var FxA = require('./lib/fxa');

marionette('Firefox Accounts Launch Tests', function() {
  var app,
      selectors,
      client = marionette.client({
        profile: {
          prefs: {
            'focusmanager.testmode': true
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
      app = new FxA(client);
      selectors = FxA.Selectors;
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

    // This is an old version which uses the IAC API.
    // TODO: INTERMITTENT failures?
    test.skip('test-fxa-client app', function () {
      app.launch(FxA.TEST_FXA_CLIENT_ORIGIN);
      app.runFxAClientTestMenu();
      app.enterEmailNew();
    });
  });
});
