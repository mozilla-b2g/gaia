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
    client.fileManager.add([
      { type: 'pictures', dirPath: 'apps/gallery/test/images' }
    ]);
    app = new Gallery(client);
    actions = new Marionette.Actions(client);
  });

  test('Check gallery app launches successfully', function() {
    // There should be 66 test images in the gallery app
    // after running the test suite setup.
    // 65 valid images + x07.jpg that loads in b2g desktop
    app.launch();
    // Make sure the gallery is done scanning for images.
    app.waitForScanEnd();
    assert.strictEqual(app.thumbnails.length, 66);
  });
});
