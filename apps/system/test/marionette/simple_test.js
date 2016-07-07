'use strict';

var assert = require('chai').assert;
marionette('Simple test', function() {

  var client = marionette.client();
  var system;

  setup(function() {
    system = client.loader.getAppClass('system');
  });

  suite('Simple test', function() {
    setup(function() {
      system.waitForFullyLoaded();
      var frames = client.findElements('iframe');
      // It returns 2 frames: Homescreen and Keyboard
      client.switchToFrame(frames[0]);
    });

    test('ok', function() {
      assert.ok(true);
    });
  });

});
