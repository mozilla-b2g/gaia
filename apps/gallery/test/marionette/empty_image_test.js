'use strict';

var Gallery = require('./lib/gallery.js'),
    assert = require('assert');

marionette('run gallery without any files', function() {

  var app, client;

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true,
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();

    app = new Gallery(client);
    app.launch(true);
  });

  test('should display empty media message', function() {

    // Wait for the overlay with 'Use the Camera app to get started' message.
    var overlayView = app.overlayView;
    var overlayTitle = app.overlayTitle;
    var overlayText = app.overlayText;
    var cameraButton = app.cameraButton;
    client.helper.waitForElement(overlayView);
    assert.ok(overlayView.displayed());
    assert.ok(overlayTitle.displayed());
    assert.ok(overlayTitle.text() == 'No photos or videos');
    assert.ok(overlayText.displayed());
    assert.ok(overlayText.text() == 'Use the Camera app to get started.');
    assert.ok(cameraButton.displayed());
    assert.ok(cameraButton.text() == 'Go to Camera');
  });
});

