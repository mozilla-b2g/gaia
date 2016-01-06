'use strict';

var assert = require('assert');
var FakeGlobalOverlayApp = require('./lib/fakeglobaloverlayapp.js');
var FakeGlobalOverlayAppNoPerms =
  require('./lib/fakeglobaloverlayapp_nopermissions.js');

marionette('GlobalOverlayWindow', function() {
  var apps = {};
  apps[FakeGlobalOverlayApp.DEFAULT_ORIGIN] =
    __dirname + '/../apps/fakeglobaloverlayapp';
  apps[FakeGlobalOverlayAppNoPerms.DEFAULT_ORIGIN] =
    __dirname + '/../apps/fakeglobaloverlayapp_nopermissions';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var system;
  var fakeGlobalOverlay;
  var fakeGlobalOverlayNoPerms;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    fakeGlobalOverlay = new FakeGlobalOverlayApp(client);
    fakeGlobalOverlayNoPerms = new FakeGlobalOverlayAppNoPerms(client);
  });

  test('The global overlay window should be opened',
  function() {
    fakeGlobalOverlay.launch();
    console.log ('launched');
    fakeGlobalOverlay.waitForTitleShown(true);
    console.log ('title shown');
    client.switchToFrame();
    console.log ('switched to frame');

    try {
    var globalOverlayWindow =
      client.helper.waitForElement('.globalOverlayWindow.active');
    } catch (e) {
      console.log(e);
    }
    console.log('waited for global overlay element');

    client.waitFor(function() {
      console.log('testing... global overlay window displayed?');
      return globalOverlayWindow.displayed();
    });

    assert(globalOverlayWindow.displayed(),
           'The global overlay window is now visible');
  });

  test('The global overlay window should not be opened',
  function() {
    fakeGlobalOverlayNoPerms.launch();
    fakeGlobalOverlayNoPerms.waitForTitleShown(true);
    client.switchToFrame();

    try {
      var globalOverlayWindow =
        client.findElement('.globalOverlayWindow.active');
    } catch(err) {
      assert(!globalOverlayWindow && (err.type == 'NoSuchElement'),
             'The global overlay window should not be displayed');
    }

  });
});
