'use strict';

var Gallery = require('./lib/gallery.js'),
    Fullscreen_View = require('./lib/fullscreen_view.js'),
    Marionette = require('marionette-client'),
    assert = require('assert');

marionette('editing an image', function() {

  var app, actions, fullscreen_view, client;

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true,
        'webgl.force-enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
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

  test('should have crop options', function() {
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editCropButton.click();
    assert.ok(fullscreen_view.cropOptions.displayed());

  });

  test('should have exposure options', function() {
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editExposureButton.click();
    assert.ok(fullscreen_view.exposureOptions.displayed());

  });

  test('should have effect options', function() {
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editEffectButton.click();
    assert.ok(fullscreen_view.effectOptions.displayed());
  });

  test('should change exposure', function() {
    // Changing the exposure of an image creates a new modified
    // version of original.
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editExposureButton.click();

    //Change Exposure and get the updated value
    actions.flick(fullscreen_view.exposureSlider, 0, 0, 50, 0).perform();
    var current = fullscreen_view.getExposureSliderPosition();
    assert.ok(
      current == 0.8125,
      'Exposure slider is at updated position'
    );
  });

  test('should crop image', function() {
    // Croping an image creates a new modified version of original.
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editCropButton.click();

    //Choose crop aspect portrait crop option
    fullscreen_view.editCropAspectPortraitButton.click();
    fullscreen_view.applyEditToolOptions();

    // Enter Crop edit tool to check selected crop option
    fullscreen_view.editCropButton.click();
    // Check crop aspect portrait is selected
    fullscreen_view.waitForCropAspectPortraitSelected();
  });

  test('should apply effect', function() {
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    fullscreen_view.editEffectButton.click();

    // Choose sepia effect edit option
    fullscreen_view.editEffectSepiaButton.click();
    fullscreen_view.applyEditToolOptions();

    // Enter effect edit tool to check selected effect
    fullscreen_view.editEffectButton.click();
    // Check Sepia Effect is selected
    fullscreen_view.waitForSepiaEffectSelected();
  });

  test('check default enhance', function() {
    app.tapFirstThumbnail();
    fullscreen_view.editButton.click();
    // Check auto enhance is turned off
    fullscreen_view.waitForAutoEnhanceButtonOff();
  });
});
