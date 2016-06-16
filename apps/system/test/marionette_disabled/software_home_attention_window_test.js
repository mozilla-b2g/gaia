'use strict';

var assert = require('assert');
var LockScreen = require('./lib/lockscreen');
var FakeDialerApp = require('./lib/fakedialerapp');

marionette('Software Home Button - Attention window', function() {
  var apps = {};
  apps[FakeDialerApp.DEFAULT_ORIGIN] = __dirname + '/../apps/fakedialerapp';

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'lockscreen.enabled': true,
        'software-button.enabled': true
      },
      apps: apps
    }
  });
  var system;
  var lockScreen;
  var fakedialer;

  setup(function() {
    system = client.loader.getAppClass('system');
    fakedialer = new FakeDialerApp(client);
    lockScreen = (new LockScreen()).start(client);
    system.waitForFullyLoaded();
  });

  function checkHeight() {
    function rect(el) {
      return el.getBoundingClientRect();
    }

    fakedialer.launch();
    fakedialer.waitForTitleShown(true);
    client.switchToFrame();

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var attentionWindow =
        client.helper.waitForElement('.attentionWindow.active');
      var attentionWindowRect = attentionWindow.scriptWith(rect);

      return winHeight >= attentionWindowRect.height;
    });

    assert.ok(system.softwareHome.displayed());
  }

  test('should show the SHB on locked screen', function() {
    checkHeight();
  });

  test('should show the SHB on unlocked screen', function() {
    lockScreen.unlock();
    checkHeight();
  });
});
