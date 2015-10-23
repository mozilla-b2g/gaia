'use strict';

var Ftu = require('./lib/ftu');

marionette('First Time Use >', function() {
  var ftu, system;
  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'ftu.manifestURL': 'app://ftu.gaiamobile.org/manifest.webapp',
        'deviceinfo.os': '1.3.1-foo',
        'deviceinfo.previous_os': '3.0.0-bar'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  setup(function() {
    client.executeAsyncScript(function() {
      var req = navigator.mozSettings.createLock().set({
        'deviceinfo.os': '1.3.1-foo',
        'deviceinfo.previous_os': '3.0.0-bar'
      });
      req.onsuccess = function(evt) {
        window.addEventListener('starting', function onevent(evt) {
          window.wrappedJSObject.asyncStorage.setItem('ftu.enabled', false);
          marionetteScriptFinished();
        });
      };
      req.onerror = marionetteScriptFinished;
    });
    system = client.loader.getAppClass('system');
    ftu = new Ftu(client);
    system.waitForFullyLoaded();
  });

  test('FTU launches for upgrade when disabled', function() {
    client.switchToFrame();
    var isEnabled = client.executeAsyncScript(function() {
      var asyncStorage = window.wrappedJSObject.asyncStorage;
      asyncStorage.getItem('ftu.enabled', function(result) {
        return marionetteScriptFinished(result);
      });
    });
    console.log('ftu.enabled? ', isEnabled);
    client.apps.switchToApp(Ftu.URL);
    client.helper.waitForElement('#update-screen');
  });

});
