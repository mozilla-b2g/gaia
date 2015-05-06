'use strict';

var assert = require('assert');

marionette('Software Home Button - Lockscreen Appearance', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'software-button.enabled': true,
      'lockscreen.enabled': true
    }
  });
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('Does not appear on lockscreen', function() {
    var buttons = [
      'softwareHome', 'softwareHomeFullscreen', 'softwareHomeFullscreenLayout'
    ];
    buttons.forEach(function(buttonName) {
      assert.ok(!system[buttonName].displayed());
    });
  });
});
