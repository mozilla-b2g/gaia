'use strict';

var System = require('./lib/system');
var StatusBar = require('./lib/statusbar');
var assert = require('assert');

marionette('Status Bar icons - Geolocation', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var system;
  var statusBar;
  var icon;

  setup(function() {
    system = new System(client);
    statusBar = new StatusBar(client);
    system.waitForStartup();
    statusBar.changeDelayValue();
    statusBar.dispatchMozChromeEvent('geolocation-status', {active: true});
    icon = statusBar.geolocation.waitForIconToAppear();
  });

  test('should be visible', function() {
    // Make sure the icon is completely opaque.
    assert.equal('true', icon.getAttribute('data-active'));
  });

  test('should turn translucent after deactivation then disappear', function() {
    statusBar.dispatchMozChromeEvent('geolocation-status', {active: false});

    // First, the icon is deactivated...
    assert.equal('false', icon.getAttribute('data-active'));

    // ... then it disappears after a little while
    statusBar.geolocation.waitForIconToDisappear();
  });
});
