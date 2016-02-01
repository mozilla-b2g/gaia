'use strict';
(function() {
  var FxASystemDialog = require('./lib/fxa_system_dialog');
  var Lockscreen = require('./lib/lockscreen');
  var ActivityCallerApp = require('./lib/activitycallerapp');

  marionette('hierarchyManager and value sectors', function() {
    var apps = {};
    apps['activitycaller.gaiamobile.org'] =
      __dirname + '/../apps/activitycaller';
    apps['activitycallee.gaiamobile.org'] =
      __dirname + '/../apps/activitycallee';

    var client = marionette.client({
      profile: {
        settings: {
          'lockscreen.enabled': true
        },
        apps: apps
      },
      desiredCapabilities: { raisesAccessibilityExceptions: false }
    });

    var system;
    var fxASystemDialog = new FxASystemDialog(client);
    var lockscreen = new Lockscreen();
    lockscreen.start(client);
    var activitycaller = new ActivityCallerApp(client);

    suite('Value selector', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      test('Focus a <select> in an app should trigger value selector',
        function() {
          activitycaller.launch();
          activitycaller.focusSelect();

          client.helper.waitForElement('.appWindow .value-selector');
        });

      test('Focus a <input type=date> in an app should trigger value selector',
        function() {
          activitycaller.launch();
          activitycaller.focusDateInput();

          client.helper.waitForElement('.appWindow .value-selector');
        });

      test('Focus a <select> in FxA system dialog ' +
        'should trigger value selector', function() {
          activitycaller.launch();
          fxASystemDialog.show();
          fxASystemDialog.goToCOPPA();
          fxASystemDialog.focusAge();
          client.switchToFrame();
          client.helper.waitForElement('.fxa-dialog .value-selector');
        });
    });
  });
}());
