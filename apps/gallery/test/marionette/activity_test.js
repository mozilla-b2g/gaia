/* global require, marionette, setup, __dirname */
'use strict';

var Gallery = require('./lib/gallery.js'),
    Fullscreen_View = require('./lib/fullscreen_view.js'),
    GalleryActivityTester = require('./lib/galleryactivitytester.js'),
    System = require('./lib/system.js'),
    assert = require('assert');

marionette('Gallery Activity Tests', function() {

  var fullscreenView, client, apps = {};

  apps[GalleryActivityTester.ORIGIN] =
    __dirname + '/apps/galleryactivitytester';

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      },
      apps: apps
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var galleryApp, activityTesterApp, system;
  var imageInfo = {
      name: 'pictures/firefoxOS.png',
      type: 'image/png',
      size: '52458'
    };

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    // Add file into the pictures directory
    client.fileManager.add([
      {type: 'pictures',filePath: 'test_media/Pictures/firefoxOS.png'},
      {type: 'pictures',
       filePath: 'test_media/Pictures/firefoxOS.png',
       filename: 'firefoxOS_2.png'}
    ]);
    galleryApp = new Gallery(client);
    fullscreenView = new Fullscreen_View(client);
    activityTesterApp = GalleryActivityTester.create(client);
    system = new System(client);
  });

  test('pick and open image using gallery pick and open activity', function() {
    activityTesterApp.launch();
    // Initiate pick activity by clicking pick image button
    activityTesterApp.tapPickImageButton();

    // Tap Gallery button from Systm app Action Menu
    system.menuOptionButton('Gallery').tap();

    // We've switched to the system app, and we're calling
    // switchToApp that waits for gallery app and then switch to gallery app
    client.apps.switchToApp(Gallery.ORIGIN);

    // Check number of images loaded in gallery App
    assert.ok(galleryApp.thumbnails.length == '2');
    // Get image name of first thumbnail
    var selectedImageName = galleryApp.getThumbnailFileName(0);
    // Select first image from thumbnail list in gallery app
    galleryApp.tapThumbnail(0);

    client.waitFor(function(){
      return fullscreenView.editCropCanvas.displayed();
    });

    fullscreenView.cropDoneButton.click();
    system.switchToApp(GalleryActivityTester.ORIGIN);

    client.waitFor(function(){
      return activityTesterApp.pickedImageName.displayed();
    });

    // Compare returned blob name, type and size with the
    // first image loaded in gallery app
    var pickedImageName = activityTesterApp.pickedImageName.text();
    assert.strictEqual(pickedImageName, selectedImageName);

    var pickedImageType = activityTesterApp.pickedImageType.text();
    assert.strictEqual(pickedImageType, imageInfo.type);

    var pickedImageSize = activityTesterApp.pickedImageSize.text();
    assert.strictEqual(pickedImageSize, imageInfo.size);

    // Open the picked image using open activity
    // with allowSave option as true. Tap picked
    // image and invoke gallery open activity
    activityTesterApp.tapPickedImage();
    system.switchToApp(Gallery.ORIGIN);

    // Check if the filename displayed in titlebar matches
    // data sent by the initiating app
    var title = fullscreenView.openActivityImageTitle.text();
    assert.strictEqual(title, 'firefoxOS.png');

    // Check if save button is displayed
    client.helper.waitForElement(fullscreenView.openActivitySaveButton);
    assert.ok(fullscreenView.openActivitySaveButton.displayed());

    client.waitFor(function(){
      return fullscreenView.openActivityImage.displayed();
    });

    // Check if displayed image src is set with blob url
    assert.ok(fullscreenView.hasSrcImageBlobURL(Gallery.ORIGIN,
      fullscreenView.openActivityImage));
  });

  test('FullScreenView > share image using share activity ', function() {
    galleryApp.launch();

    // Check number of images loaded in gallery App
    assert.ok(galleryApp.thumbnails.length == '2');
    // Get image name of first thumbnail
    var selectedImageName = galleryApp.getThumbnailFileName(0);
    // Select first image from thumbnail list in gallery app
    galleryApp.tapThumbnail(0);
    fullscreenView.shareButton.tap();

    system.menuOptionButton('Gallery Activity Tester').tap();
    system.switchToApp(GalleryActivityTester.ORIGIN);

    client.waitFor(function(){
      return activityTesterApp.sharedImageName.displayed();
    });

    // Compare shared blob name, type and size with the
    // first image loaded in gallery app
    var sharedImageName = activityTesterApp.sharedImageName.text();
    assert.strictEqual(sharedImageName, selectedImageName);

    var sharedImageType = activityTesterApp.sharedImageType.text();
    assert.strictEqual(sharedImageType, imageInfo.type);

    var sharedImageSize = activityTesterApp.sharedImageSize.text();
    assert.strictEqual(sharedImageSize, imageInfo.size);
  });

  test('open memory backed blob using gallery open activity', function() {
    activityTesterApp.launch();
    // Initiate open activity by clicking open image button.
    // This will generate memory backed blob using canvas
    // and trigger open activity to view the blob
    activityTesterApp.tapOpenImageButton();

    system.switchToApp(Gallery.ORIGIN);

    // Check there is no filename in title bar
    var title = fullscreenView.openActivityImageTitle.text();
    assert.strictEqual(title, '');

    // Check save button is not displayed
    assert.ok(!fullscreenView.openActivitySaveButton.displayed(),
      'Save button is not displayed');

    client.waitFor(function(){
      return fullscreenView.openActivityImage.displayed();
    });

    // Check if displayed image src is set with blob url
    assert.ok(fullscreenView.hasSrcImageBlobURL(Gallery.ORIGIN,
      fullscreenView.openActivityImage));
   });

  test('SelectView > share image using share activity ', function() {
    galleryApp.launch();
    galleryApp.switchToSelectView();

    // Check number of files that exist
    assert.ok(galleryApp.thumbnails.length == '2');
    galleryApp.tapThumbnail(0);
    // Get image name of selected thumbnail
    var selectedImageName = galleryApp.getThumbnailFileName(0);

    galleryApp.thumbnailsShareButton.tap();
    system.menuOptionButton('Gallery Activity Tester').tap();
    system.switchToApp(GalleryActivityTester.ORIGIN);

    // Check that image is shared and displayed in
    // Gallery Activity Tester App
    client.waitFor(function(){
      return activityTesterApp.sharedImage.displayed();
    });
    // Compare shared blob name, type and size with the
    // first image loaded in gallery app
    var sharedImageName = activityTesterApp.sharedImageName.text();
    assert.strictEqual(sharedImageName, selectedImageName);

    var sharedImageType = activityTesterApp.sharedImageType.text();
    assert.strictEqual(sharedImageType, imageInfo.type);

    var sharedImageSize = activityTesterApp.sharedImageSize.text();
    assert.strictEqual(sharedImageSize, imageInfo.size);
  });

});
