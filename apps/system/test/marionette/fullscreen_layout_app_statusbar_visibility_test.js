'use strict';

marionette('Fullscreen layout status bar visibility >', function() {
  var assert = require('assert');
  var System = require('./lib/system.js');

  var FULLSCREEN_LAYOUT_APP = 'app://fullscreen_layout.gaiamobile.org';

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'fullscreen_layout.gaiamobile.org': __dirname + '/fullscreen_layout'
    }
  });

  var system = new System(client);

  setup(function() {
    system.waitForStartup();
    assert(system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is visible');
    system.waitForLaunch(FULLSCREEN_LAYOUT_APP);
  });

  test('Status bar visibility in fullscreen layout app', function() {
    assert(!system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is invisible');
    assert(!system.statusbarMinimizedWrapper.displayed(),
      'The status bar minimized wrapper is invisible');
  });
});
