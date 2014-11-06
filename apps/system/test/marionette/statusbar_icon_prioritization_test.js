'use strict';

var System = require('./lib/system');
var StatusBar = require('./lib/statusbar');
var assert = require('assert');
var SETTINGS_APP = 'app://settings.gaiamobile.org';

marionette('Status Bar icons - Prioritization', function() {

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

  setup(function() {
    system = new System(client);
    statusBar = new StatusBar(client);
    system.waitForStartup();
  });

  test('should display important icons first', function() {
    system.waitForLaunch(SETTINGS_APP);

    var hasHiddenIcon = false;

    // Let's show all the icons.
    StatusBar.Icons.forEach(function(iconName) {
      statusBar[iconName].show();
    });

    // Force the reprioritization all the icons.
    statusBar.networkActivity.hide();
    statusBar.dispatchEvent('moznetworkupload');

    StatusBar.Icons.forEach(function(iconName) {
      if (iconName === 'label') {
        // Label is a special case, so ignoring for now.
        return;
      }

      var icon = statusBar[iconName].icon;
      var hidden = (icon.cssProperty('display') === 'none');

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
