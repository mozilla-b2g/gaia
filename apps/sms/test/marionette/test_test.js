/* global require, marionette, setup, suite, test, __dirname */
'use strict';

var Lib = require('./lib/test.js');

marionette('Share target test', function() {
  var apps = {};

  apps[Lib.ONE.ORIGIN] = __dirname + '/apps/one';
  apps[Lib.TWO.ORIGIN] = __dirname + '/apps/two';

  var client = marionette.client({
    profile: {
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var oneApp,
      anotherApp;

  setup(function() {
    oneApp = Lib.ONE.create(client);
    anotherApp = Lib.TWO.create(client);
  });

  suite('Activity Test', function() {
    setup(function() {
      anotherApp.launch();
      anotherApp.shareImage();

      oneApp.switchTo();
    });

    test('System message should be received', function() {
      client.waitFor(function() {
        return oneApp.status.text() === 'GOT_SYSTEM_MESSAGE';
      });

      oneApp.waitForAppToDisappear();
    });

    test('System message should be received', function() {
      client.waitFor(function() {
        return oneApp.status.text() === 'GOT_SYSTEM_MESSAGE';
      });

      oneApp.waitForAppToDisappear();
    });

    test('System message should be received', function() {
      client.waitFor(function() {
        return oneApp.status.text() === 'GOT_SYSTEM_MESSAGE';
      });

      oneApp.waitForAppToDisappear();
    });
  });
});
