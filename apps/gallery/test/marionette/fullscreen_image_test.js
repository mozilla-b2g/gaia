'use strict';

var Gallery = require('./lib/gallery.js'),
    Fullscreen_View = require('./lib/fullscreen_view.js'),
    Marionette = require('marionette-client'),
    assert = require('assert');

marionette('the gallery', function() {

  var app, client, actions, fullscreen_view;

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
    fullscreen_view = new Fullscreen_View(client);
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
    app.tapFirstThumbnail();
    assert.ok(fullscreen_view.displayed);

    fullscreen_view.fullscreenBackButton.click();
    assert.ok(app.thumbnailsView.displayed());
  });

  test('should flick through images in fullscreen mode', function() {
    // Acquire a duplicate of an image by launching the editing
    // mode and saving it.
    app.tapFirstThumbnail();
    client.waitFor(function() {
      return fullscreen_view.displayed;
    });
    fullscreen_view.editButton.click();
    fullscreen_view.waitForImageEditor();
    fullscreen_view.waitForAutoEnhanceButtonOff();
    fullscreen_view.editEnhanceButton.click();
    fullscreen_view.waitForAutoEnhanceButtonOn();
    client.waitFor(function() {
      return fullscreen_view.editSaveButton.enabled();
    });
    fullscreen_view.editSaveButton.click();
    client.waitFor(function() {
      return app.thumbnails.length == 2;
    });
    assert.ok(fullscreen_view.displayed);    
    
    // go back to the thumbnail view, and click the first thumbnail
    fullscreen_view.fullscreenBackButton.click();
    client.waitFor(function() {
      return app.thumbnailsView.displayed();
    });
    app.tapFirstThumbnail();
    client.waitFor(function() {
      return fullscreen_view.displayed;
    });

    // You should be able to swipe between the two in fullscreen mode.
    var translateX = fullscreen_view.getFrameTranslation(
      fullscreen_view.fullscreenFrame2);
    assert.strictEqual(translateX, 0);

    var size = fullscreen_view.fullscreenView.size();
    var centerX = size.width / 2;
    var centerY = size.height / 2;

    actions.flick(fullscreen_view.fullscreenFrame2, centerX + 100,
                   centerY, centerX - 100, centerY).perform();

    //Swiping centers the fullscreen view on the second frame.
    translateX = fullscreen_view.getFrameTranslation(
      fullscreen_view.fullscreenFrame3);
    assert.strictEqual(translateX, 0);
  });
});
