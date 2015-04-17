/* global require, marionette, setup, __dirname */
'use strict';

var Gallery = require('./lib/gallery.js'),
    GalleryActivityCaller = require('./lib/fakeactivitycaller.js'),
    assert = require('assert');

marionette('Gallery Pick and Share Activity', function() {

  var client, apps = {};

  apps[GalleryActivityCaller.ORIGIN] = __dirname + '/apps/fakeactivitycaller';

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    },

    apps: apps
  });

  var galleryApp, activityCallerApp;
  var imageInfo = {
      name: 'pictures/firefoxOS.png',
      type: 'image/png'
    };

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    // Add file into the pictures directory
    client.fileManager.add({
      type: 'pictures',
      filePath: 'test_media/Pictures/firefoxOS.png'
    });
    galleryApp = new Gallery(client);
    activityCallerApp = GalleryActivityCaller.create(client);
  });

  test('pick image using gallery pick activity', function() {
    activityCallerApp.launch();
    // Initiate pick activity by clicking pick image button
    activityCallerApp.pickImage();

    // Select image from thumbnail list in gallery app
    galleryApp.selectImage();

    client.waitFor(function(){
      return galleryApp.editCropCanvas.displayed();
    });

    galleryApp.cropDoneButton.click();
    activityCallerApp.switchTo();

    client.waitFor(function(){
      return activityCallerApp.pickedImageName.displayed();
    });

    // Compare returned blob name and type with the
    // image loaded in gallery app
    var pickedImageName = activityCallerApp.pickedImageName.text();
    assert.strictEqual(pickedImageName, imageInfo.name);

    var pickedImageType = activityCallerApp.pickedImageType.text();
    assert.strictEqual(pickedImageType, imageInfo.type);

  });

  test('share image using gallery share activity', function() {
    galleryApp.launch();
    galleryApp.tapFirstThumbnail();
    galleryApp.shareImage('Fake Gallery Activity Caller');
    activityCallerApp.switchTo();

    client.waitFor(function(){
      return activityCallerApp.sharedImageName.displayed();
    });

    // Compare shared blob name and type with the
    // image loaded in gallery app

    var sharedImageName = activityCallerApp.sharedImageName.text();
    assert.strictEqual(sharedImageName, imageInfo.name);

    var sharedImageType = activityCallerApp.sharedImageType.text();
    assert.strictEqual(sharedImageType, imageInfo.type);
  });


  test('open image using gallery open activity', function() {
    activityCallerApp.launch();
    // Initiate pick activity by clicking pick image button
    activityCallerApp.pickImage();

    // Select image from thumbnail list in gallery app
    galleryApp.selectImage();

    client.waitFor(function(){
      return galleryApp.editCropCanvas.displayed();
    });

    galleryApp.cropDoneButton.click();
    activityCallerApp.switchTo();

    client.waitFor(function(){
      return activityCallerApp.pickedImageName.displayed();
    });

    // Tap picked image to view image using gallery open activity
    activityCallerApp.tapPickedImage();
    galleryApp.switchTo();

    // Check if the filename displayed in titlebar matches
    // data sent by the initiating app
    var title = galleryApp.openActivityImageTitle.text();
    assert.strictEqual(title, 'firefoxOS.png');

    // Check if save button is displayed
    assert.ok(galleryApp.openActivitySaveButton.displayed());

    client.waitFor(function(){
      return galleryApp.openActivityImage.displayed();
    });

    // Check if passed blob is set as background in displayed image
    assert.ok(galleryApp.hasBackgroundImageBlobURL());
  });
});
