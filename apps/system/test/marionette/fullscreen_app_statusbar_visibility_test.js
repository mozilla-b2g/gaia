'use strict';

marionette('Fullscreen status bar visibility >', function() {
  var assert = require('assert');

  var FULLSCREEN_APP = 'app://fullscreen-app.gaiamobile.org';

  var client = marionette.client({
    apps: {
      'fullscreen-app.gaiamobile.org': __dirname + '/../apps/fullscreen-app'
    }
  });

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
  });

  setup(function() {
    system.waitForStartup();
    system.waitForLaunch(FULLSCREEN_APP);
  });

  test('Status bar visibility in fullscreen app', function() {
    assert(!system.statusbarMaximizedWrapper.displayed(),
      'The status bar maximized wrapper is invisible');
    assert(!system.statusbarMinimizedWrapper.displayed(),
      'The status bar minimized wrapper is invisible');
  });
});
