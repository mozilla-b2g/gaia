'use strict';

marionette('Fullscreen layout status bar visibility >', function() {
  var assert = require('assert');

  var FULLSCREEN_LAYOUT_APP = 'app://fullscreen_layout.gaiamobile.org';

  var client = marionette.client({
    profile: {
      apps: {
        'fullscreen_layout.gaiamobile.org':
          __dirname + '/../apps/fullscreen_layout'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
  });

  setup(function() {
    system.waitForFullyLoaded();
    system.waitForLaunch(FULLSCREEN_LAYOUT_APP);
  });

  test('Status bar visibility in fullscreen layout app', function() {
    assert(!system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is invisible');
    assert(!system.statusbarMinimizedWrapper.displayed(),
      'The status bar minimized wrapper is invisible');
  });
});
