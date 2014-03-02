'use strict';

marionette('modal dialog under mozFullScreen', function() {
  var assert = require('assert'),
      FullscreenApp = require('./lib/fullscreen_app');

  var FULLSCREEN_APP_ORIGIN = 'fullscreen-app.gaiamobile.org';
  var apps = {};
  apps[FULLSCREEN_APP_ORIGIN] = __dirname + '/fullscreen-app';

  var app, client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: apps
  });

  setup(function() {
    app = new FullscreenApp(client, 'app://' + FULLSCREEN_APP_ORIGIN);
    app.launch();
  });

  // The test does work on local 'make test-integration',
  // but always fails on travis.
  // Our testing framework has problem to locate a dynamic created
  // element for now.
  test.skip('alert is shown', function() {
    client.switchToFrame();
    client.helper.wait(10000);
    var alert = client.helper.waitForElement('.modal-dialog');
    assert(alert.displayed(), 'alert dialog is visible');
  });
});
