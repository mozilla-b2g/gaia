'use strict';

var FakeLoopApp = require('./lib/fakeloopapp.js');
var UtilityTray = require('./lib/utility_tray.js');

marionette('AttentionWindow interactions', function() {
  var apps = {};
  apps[FakeLoopApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakeloopapp';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var system, fakeLoop, utilityTray;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    utilityTray = new UtilityTray(client);

    fakeLoop = new FakeLoopApp(client);
    fakeLoop.launch();
    fakeLoop.waitForTitleShown(true);
    client.switchToFrame();
    client.helper.waitForElement('#permission-yes').click();
    client.waitFor(function() {
      return fakeLoop.mainWindow.displayed();
    });
  });

  test('clicking on the toaster should go to the attention screen', function() {
    system.goHome();
    fakeLoop.toaster.click();
    client.waitFor(function() {
      return fakeLoop.mainWindow.displayed();
    });
  });

  test('the utility tray should be actionable', function() {
    utilityTray.swipeDown();
    utilityTray.waitForOpened();
  });

});
