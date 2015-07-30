'use strict';
(function() {
  var assert = require('chai').assert;
  var FxASystemDialog = require('./lib/fxa_system_dialog');
  var Lockscreen = require('./lib/lockscreen');
  var CALLER_APP = 'activitycaller.gaiamobile.org';
  var FakeDialerApp = require('./lib/fakedialerapp.js');
  var ActivityCallerApp = require('./lib/activitycallerapp');

  marionette('hierarchyManager and keyboard', function() {
    var apps = {};
    apps['activitycaller.gaiamobile.org'] =
      __dirname + '/../apps/activitycaller';
    apps['activitycallee.gaiamobile.org'] =
      __dirname + '/../apps/activitycallee';
    apps[FakeDialerApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakedialerapp';
    var client = marionette.client({
      profile: {
        settings: {
          'lockscreen.enabled': true
        },
        apps: apps
      }
    });

    var getAppHeight = function(origin) {
      client.switchToFrame();
      client.apps.switchToApp(origin);
      return client.executeScript(function() {
        return window.wrappedJSObject.innerHeight;
      });
    };

    var system;
    var fxASystemDialog = new FxASystemDialog(client);
    var lockscreen = new Lockscreen();
    lockscreen.start(client);
    var fakeDialerApp = new FakeDialerApp(client);
    var activitycaller = new ActivityCallerApp(client);

    test('Focus during init logo does not invoke keyboard', function() {
      system = client.loader.getAppClass('system');
      system.waitForStartup();
      fxASystemDialog.show();
      var h1 = fxASystemDialog.getHeight();
      fxASystemDialog.focus();
      var h2 = fxASystemDialog.getHeight();
      assert.equal(h1, h2);
    });

    suite('Keyboard resize', function() {
      setup(function() {
        system = client.loader.getAppClass('system');
        system.waitForFullyLoaded();
        lockscreen.unlock();
      });

      test('App should not change its height when focusing attention',
        function() {
          fakeDialerApp.launch();
          var apph1 = getAppHeight(fakeDialerApp.origin);
          client.switchToFrame();
          var h1 = fakeDialerApp.getCallHeight();

          fakeDialerApp.focusAndWaitForResize();

          var h2 = fakeDialerApp.getCallHeight();
          var apph2 = getAppHeight(fakeDialerApp.origin);
          assert.equal(apph1, apph2);
          assert.notEqual(h1, h2);
        });

      test('App with input is focused should change height', function() {
        activitycaller.launch();
        var h1 = getAppHeight('app://' + CALLER_APP);
        activitycaller.focusTextInput();
        system.waitForKeyboard();
        var h2 = getAppHeight('app://' + CALLER_APP);
        assert.notEqual(h1, h2);

        // Ensure the height is restored.
        activitycaller.blurFocusedInput();
        system.waitForKeyboardToDisappear();
        var h3 = getAppHeight('app://' + CALLER_APP);
        assert.equal(h1, h3);
      });

      test('App height is restored instantly when activity opens', function() {
        activitycaller.launch();
        var h1 = getAppHeight('app://' + CALLER_APP);
        activitycaller.focusTextInput();
        system.waitForKeyboard();
        var h2 = getAppHeight('app://' + CALLER_APP);
        assert.notEqual(h1, h2);

        activitycaller.startActivity();

        var h3 = getAppHeight('app://' + CALLER_APP);
        assert.equal(h1, h3);
      });

      test('App should not change its height if system dialog is focused',
      function() {
        activitycaller.launch();
        var h1 = getAppHeight('app://' + CALLER_APP);
        fxASystemDialog.show();
        var systemDialogHeight1 = fxASystemDialog.getHeight();
        fxASystemDialog.focus();
        client.switchToFrame();
        system.waitForKeyboard();

        var systemDialogHeight2 = fxASystemDialog.getHeight();
        var h2 = getAppHeight('app://' + CALLER_APP);
        assert.equal(h1, h2);
        assert.notEqual(systemDialogHeight1, systemDialogHeight2);
      });
    });
  });
}());
