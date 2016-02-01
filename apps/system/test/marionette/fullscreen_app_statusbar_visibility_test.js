'use strict';

marionette('Fullscreen status bar visibility >', function() {
  var assert = require('assert');

  var FULLSCREEN_APP = 'app://fullscreen-app.gaiamobile.org';

  var client = marionette.client({
    profile: {
      apps: {
        'fullscreen-app.gaiamobile.org': __dirname + '/../apps/fullscreen-app'
      }
    }
  });

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
  });

  setup(function() {
    system.waitForFullyLoaded();
    system.waitForLaunch(FULLSCREEN_APP);
  });

  test('Status bar visibility in fullscreen app', function() {
    assert(system.statusbarIcons.location().y === -30);
    assert(!system.pinDialog.displayed(), 'Pin dialog is invisible');
  });
});
