'use strict';

var Gallery = require('./lib/gallery.js'),
    assert = require('assert');

marionette('using the gallery menu', function() {

  var app, client;

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      }
    }
  });

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    // Add file into the pictures directory
    client.fileManager.add({
      type: 'pictures',
      filePath: 'test_media/Pictures/firefoxOS.png'
    });
    app = new Gallery(client);
    app.launch();
  });

  test('should let you select images', function() {
    // Use the 'selection' button and select the test image.
    // Selected images should have an border/highlight.
    app.thumbnailsSelectButton.click();
    app.thumbnail.click();

    var outline = app.thumbnail.cssProperty('outline');
    assert.ok(outline != null);
  });

  test('should let you delete images', function() {
    // This test deletes the test image.
    app.thumbnailsSelectButton.click();
    app.thumbnail.click();
    app.thumbnailsDeleteButton.click();
    app.confirmButton.click();

    // Wait for the overlay with 'No photos or videos' message.
    var overlayView = app.overlayView;
    client.helper.waitForElement(overlayView);
    assert.ok(overlayView.displayed());
  });
});
