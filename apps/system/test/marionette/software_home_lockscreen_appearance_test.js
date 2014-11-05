'use strict';

var assert = require('assert');
var System = require('./lib/system');

marionette('Software Home Button - Lockscreen Appearance', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': true,
      'software-button.enabled': true
    }
  });
  var system;

  setup(function() {
    system = new System(client);
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
