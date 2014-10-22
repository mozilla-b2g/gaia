'use strict';

var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert');

marionette('launch gallery', function() {

  var app, client, actions;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true,
      'webgl.force-enabled': true
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    // Add file into the pictures directory
    client.fileManager.add({
      type: 'pictures',
      filePath: 'apps/gallery/test/images/09.png'
    });
    app = new Gallery(client);
    actions = new Marionette.Actions(client);
  });

  test('Check gallery app launches successfully', function() {
    // There should only be a single test image in the gallery
    // after running the test suite setup.
    // This tests if gallery app doesn't crash while loading
    // apps/gallery/test/images/09.png. See Bug 1080090
    app.launch();
    assert.strictEqual(app.thumbnails.length, 1);
  });
});
