'use strict';

var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert');

marionette('the gallery', function() {

  var app, client, actions;

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true,
        'webgl.force-enabled': true
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
    actions = new Marionette.Actions(client);
    app.launch();
  });

  test('should only have one image present', function() {
    // There should only be a single test image in the gallery
    // after running the test suite setup.
    // This mainly tests if TestCommon runs smoothly.
    assert.strictEqual(app.thumbnails.length, 1);
  });

  test('should display an image fullscreen and go back', function() {
    // You should be able to click on an image to view a fullscreen
    // preview and go back by pressing the 'back' button.
    app.thumbnail.click();
    assert.ok(app.fullscreenView.displayed());

    app.fullscreenBackButton.click();
    assert.ok(app.thumbnailsView.displayed());
  });

  test.skip('should flick through images in fullscreen mode', function() {
    // Acquire a duplicate of an image by launching the editing
    // mode and saving it.
    app.thumbnail.click();
    app.editButton.click();
    app.waitForImageEditor();
    app.editSaveButton.click();
    client.waitFor(function() {
      return app.thumbnails.length == 2;
    });

    // You should be able to swipe between the two in fullscreen mode.
    app.thumbnail.click();
    var translateX = app.getFrameTranslation(app.fullscreenFrame2);
    assert.strictEqual(translateX, 0);

    var size = app.fullscreenView.size();
    var centerX = size.width / 2;
    var centerY = size.height / 2;

    actions.flick(app.fullscreenFrame2, centerX + 100,
                  centerY, centerX - 100, centerY).perform();

    //Swiping centers the fullscreen view on the second frame.
    translateX = app.getFrameTranslation(app.fullscreenFrame3);
    assert.strictEqual(translateX, 0);
  });
});
