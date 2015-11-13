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
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  setup(function() {
    app = new Gallery(client);
  });

  suite('Gallery app delete single image', function() {
    setup(function() {
      // Remove all files in temp device storage.
      client.fileManager.removeAllFiles();
      // Add file into the pictures directory
      client.fileManager.add([
        {type: 'pictures',filePath: 'apps/gallery/test/images/01.jpg'},
        {type: 'pictures',filePath: 'apps/gallery/test/images/02.png'},
        {type: 'pictures',filePath: 'apps/gallery/test/images/03.gif'}
      ]);
    });

    suite('Select and delete single image', function() {
      setup(function() {
        app.launch();
      });

      test('should let you select images', function() {
        // Use the 'selection' button and select the test image.
        // Selected images should have an border/highlight.
        app.switchToSelectView();
        app.thumbnail.click();
        app.isThumbnailSelected(0);
      });

      test('should let you delete single image', function() {
        app.switchToSelectView();
        app.thumbnail.click();

        // Check number of selected images
        assert.ok(app.thumbnailsNumberSelected.text() == '1 selected');
        app.thumbnailsDeleteButton.click();
        app.confirmButton.click();

        // Check select header text is reset to default text
        assert.ok(app.thumbnailsNumberSelected.text() == 'Select');
        // Check 2 files still exist
        assert.ok(app.thumbnails.length == '2');
      });
    });
  });

  suite('Gallery app delete multiple images', function() {
    setup(function() {
      // Remove all files in temp device storage.
      client.fileManager.removeAllFiles();
      // Add file into the pictures directory
      client.fileManager.add([
        {type: 'pictures',filePath: 'apps/gallery/test/images/01.jpg'},
        {type: 'pictures',filePath: 'apps/gallery/test/images/02.png'},
        {type: 'pictures',filePath: 'apps/gallery/test/images/03.gif'}
      ]);
    });

    suite('Select and delete multiple images', function() {
      setup(function() {
        app.launch();
      });

      test('should let you select images', function() {
        // Use the 'selection' button and select the test images.
        // Selected images should have an border/highlight.
        app.switchToSelectView();
        app.tapThumbnail(0);
        app.tapThumbnail(1);
        app.tapThumbnail(2);

        app.isThumbnailSelected(0);
        app.isThumbnailSelected(1);
        app.isThumbnailSelected(2);

        assert.ok(app.thumbnailsNumberSelected.text() == '3 selected');

      });

      test('should let you cancel delete images', function() {
        // Use the 'selection' button and select the test images.
        // Selected images should have an border/highlight.
        app.switchToSelectView();
        app.tapThumbnail(0);
        app.tapThumbnail(1);
        app.tapThumbnail(2);
        // Check number of selected images
        assert.ok(app.thumbnailsNumberSelected.text() == '3 selected');
        app.thumbnailsDeleteButton.click();
        // Cancel delete of images
        app.confirmCancelButton.click();

        // Check files still exist
        assert.ok(app.thumbnails.length == '3');
        assert.ok(app.thumbnailsNumberSelected.text() == '3 selected');
      });

      test('should let you delete images', function() {
        // This test deletes the test image.
        app.switchToSelectView();
        app.tapThumbnail(0);
        app.tapThumbnail(1);
        app.tapThumbnail(2);

        app.thumbnailsDeleteButton.click();
        app.confirmButton.click();

        // Wait for the overlay with 'No photos or videos' message.
        var overlayView = app.overlayView;
        client.helper.waitForElement(overlayView);
        assert.ok(overlayView.displayed());

        assert.ok(app.thumbnails.length == '0');
      });
    });
  });

});
