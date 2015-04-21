marionette('Hud', function() {
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

  test('toggle cameras', function() {
    if (camera.frontCamera) {
      camera.waitForHudReady();
      camera.tapCameraToggle();
      camera.waitForViewfinderDisabled();
      camera.waitForViewfinderEnabled();
    }
  });

  test('tap flash', function() {
    if (camera.flash) {
      camera.waitForHudReady();
      camera.tapFlash();
      camera.waitForNotification();
    }
  });

  test('open settings menu', function() {
    camera.waitForHudReady();
    camera.tapSettings();
    camera.waitForSettingsPanel();
  });

});