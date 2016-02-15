'use strict';

var FxA = require('./lib/fxa');

marionette('Firefox Accounts Launch Tests', function() {
  var testOptions = { devices: ['tv'] };
  var app,
      system,
      selectors,
      client = marionette.client({
        profile: {
          hostOptions: {
            screen: {
              width: 1920,
              height: 1080
            }
          },
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
        // XXX: Set this to true once Accessibility is implemented in TV
        desiredCapabilities: { raisesAccessibilityExceptions: false }
      });

    setup(function() {
      system = client.loader.getAppClass('system');
      system.waitForStartup();
      system.waitForFullyLoaded();
      app = new FxA(client);
      selectors = FxA.Selectors;
    });

  //If we can enter email on first screen, that should prove successful launch
  suite('Should launch FxA flow from FxA-consuming apps:', function() {
    test('Browser app', testOptions, function() {
      var frame = system.waitForLaunch(FxA.BROWSER_ORIGIN);
      client.switchToFrame(frame);
      app.runBrowserMenu();
      app.enterEmailNew();
    });

    test('UITest app', testOptions, function() {
      var frame = system.waitForLaunch(FxA.UITEST_ORIGIN);
      client.switchToFrame(frame);
      app.runUITestMenu();
      app.enterEmailNew();
    });

    test.skip('FTU menu', testOptions, function() {
      app.launch(FxA.FTU_ORIGIN);
      app.runFTUMenu();
      app.enterEmailNew();
    });

    // This is an old version which uses the IAC API.
    // TODO: INTERMITTENT failures?
    test.skip('test-fxa-client app', testOptions, function() {
      app.launch(FxA.TEST_FXA_CLIENT_ORIGIN);
      app.runFxAClientTestMenu();
      app.enterEmailNew();
    });
  });
});
