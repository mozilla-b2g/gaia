marionette('Zoom', function() {
  'use strict';

  teardown(function() {
    camera.close();
  });

  var assert = require('assert');
  var client = marionette.client();
  var camera = new (require('../lib/camera'))(client);

  setup(function() {
    camera.launch();
  });

  test('pinch to zoom', function() {
    camera.pinch('body', {
      x: 100,
      y: 100,
      distance: 10
    });
    camera.waitForZoomBarEnabled();
    camera.waitForZoomBarDisabled();
  });

});
