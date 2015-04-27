'use strict';

var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert');

marionette('editing an image', function() {

  var app, actions, client;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true,
      'webgl.force-enabled': true
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

  test('should have crop options', function() {
    app.enterMainEditScreen();
    app.editCropButton.click();
    assert.ok(app.cropOptions.displayed());

  });

  test('should have exposure options', function() {
    app.enterMainEditScreen();
    app.editExposureButton.click();
    assert.ok(app.exposureOptions.displayed());

  });

  test('should have effect options', function() {
    app.enterMainEditScreen();
    app.editEffectButton.click();
    assert.ok(app.effectOptions.displayed());
  });

  test('should change exposure', function() {
    // Changing the exposure of an image creates a new modified
    // version of original.
    app.enterMainEditScreen();
    app.editExposureButton.click();

    //Change Exposure and get the updated value
    actions.flick(app.exposureSlider, 0, 0, 50, 0).perform();
    var current = app.getExposureSliderPosition();
    assert.ok(
      current == 0.8125,
      'Exposure slider is at updated position'
    );
  });

  test('should crop image', function() {
    // Croping an image creates a new modified version of original.
    app.enterMainEditScreen();
    app.editCropButton.click();

    //Choose crop aspect portrait crop option
    app.editCropAspectPortraitButton.click();
    app.applyEditToolOptions();

    // Enter Crop edit tool to check selected crop option
    app.editCropButton.click();
    // Check crop aspect portrait is selected
    app.waitForCropAspectPortraitSelected();
  });

  test('should apply effect', function() {
    app.enterMainEditScreen();
    app.editEffectButton.click();

    // Choose sepia effect edit option
    app.editEffectSepiaButton.click();
    app.applyEditToolOptions();

    // Enter effect edit tool to check selected effect
    app.editEffectButton.click();
    // Check Sepia Effect is selected
    app.waitForSepiaEffectSelected();
  });

  test('check default enhance', function() {
    app.enterMainEditScreen();
    // Check auto enhance is turned off
    app.waitForAutoEnhanceButtonOff();
  });
});
