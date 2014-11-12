'use strict';

marionette('Fullscreen status bar visibility >', function() {
  var assert = require('assert');
  var System = require('./lib/system.js');

  var FULLSCREEN_APP = 'app://fullscreen-app.gaiamobile.org';

  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'fullscreen-app.gaiamobile.org': __dirname + '/fullscreen-app'
    }
  });

  var system = new System(client);

  setup(function() {
    system.waitForStartup();
    assert(system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is visible');
    system.waitForLaunch(FULLSCREEN_APP);
  });

  test('Status bar visibility in fullscreen app', function() {
    assert(!system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is invisible');
    assert(!system.statusbarMinimizedWrapper.displayed(),
      'The status bar minimized wrapper is invisible');
  });
});
