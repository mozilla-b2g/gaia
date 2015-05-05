'use strict';

var StatusBar = require('./lib/statusbar');
var assert = require('assert');
var SETTINGS_APP = 'app://settings.gaiamobile.org';

marionette('Status Bar icons - Prioritization', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
  }, undefined, { 'raisesAccessibilityExceptions': true });

  var system;
  var statusBar;

  setup(function() {
    system = client.loader.getAppClass('system');
    statusBar = new StatusBar(client);
    system.waitForStartup();
  });

  test('should display important icons first', function() {
    system.waitForLaunch(SETTINGS_APP);

    var hasHiddenIcon = false;

    // Let's show all the icons.
    statusBar.showAllRunningIcons();

    // Force the reprioritization all the icons.
    system.request('NetworkActivityIcon:hide');
    system.request('NetworkActivityIcon:show');

    StatusBar.Icons.forEach(function(iconName) {
      if (iconName === 'operator') {
        // Label is a special case, so ignoring for now.
        return;
      }

      var iconElement = statusBar.minimised[iconName].icon;
      // The icon is not running.
      if (iconElement.getAttribute('class').indexOf('active') < 0) {
        return;
      }
      var hidden = (iconElement.cssProperty('display') === 'none');

      if (hasHiddenIcon) {
        assert.equal(hidden, true, 'The `' + iconName +
        '` icon should be hidden');
        return;
      }

      if (hidden) {
        hasHiddenIcon = true;
        // From now on, all icons should be hidden.
      }
    });

    assert.equal(hasHiddenIcon, true);
  });
});
