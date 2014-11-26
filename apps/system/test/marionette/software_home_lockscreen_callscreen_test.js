'use strict';

var assert = require('assert');
var System = require('./lib/system');
var FakeDialerApp = require('./lib/fakedialerapp.js');

marionette('Software Home Button - Lockscreen Appearance', function() {
  var apps = {};
  apps[FakeDialerApp.DEFAULT_ORIGIN] = __dirname + '/fakedialerapp';

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    },
    apps: apps
  });
  var system;
  var fakedialer;

  setup(function() {
    system = new System(client);
    system.waitForStartup();

    fakedialer = new FakeDialerApp(client);
  });

  test('Call screen should be full height', function() {
    fakedialer.launch();
    fakedialer.waitForTitleShown(true);
    client.switchToFrame();

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var attentionWindow =
        client.helper.waitForElement('.attentionWindow.active');
      var attentionWindowRect = attentionWindow.scriptWith(rect);

      return winHeight === attentionWindowRect.height;
    });
  });

  test('Does not appear on lockscreen with an incoming call', function() {
    var buttons = [
      'softwareHome', 'softwareHomeFullscreen', 'softwareHomeFullscreenLayout'
    ];
    buttons.forEach(function(buttonName) {
      assert.ok(!system[buttonName].displayed());
    });
  });
});
