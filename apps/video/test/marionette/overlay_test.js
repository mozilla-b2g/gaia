'use strict';

var Video = require('./lib/video');

marionette('video overlay', function() {
  var assert = require('assert');
  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var app;

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    app = new Video(client);
    app.launch();
  });

  test('check for empty overlay', function() {
    var overlay = client.helper.waitForElement(Video.Selector.overlay);
    assert.ok(overlay.displayed(), 'The list should be empty');
  });
});
