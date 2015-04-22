marionette('Capture', function() {
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

  test('capture a picture', function() {
    camera.tapCapture();
    camera.waitForThumbnail();
  });

  test('capture a video', function(done) {
    camera.tapModeSwitch();
    camera.waitForPreviewReady();
    camera.tapCapture();
    camera.waitForRecordingTimer();
    // It records a 3 seconds video
    setTimeout(function(){
      camera.tapCapture();
      camera.waitForThumbnail();
      done();
    }, 3000);
  });

});
