var Gallery = require('./lib/gallery.js'),
    Contacts = require('./lib/contacts.js'),
    Marionette = require('marionette-client'),
    assert = require('assert'),
    TestCommon = require('./lib/test_common');

marionette('Pick activity cropping behavior', function() {

  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true,
      'webgl.force-enabled': true
    }
  });

  var app;
  var contacts;

  setup(function() {

    TestCommon.prepareTestSuite('pictures', client);

    app = new Gallery(client);
    contacts = new Contacts(client);

    client.fileManager.add({
      type: 'images',
      filePath: 'test_media/Pictures/firefoxOS.png'
    });
  });

  function selectGalleryAndDisplayPhoto() {
    var buttonElementsWithIcons = app.buttonsWithIcons;
    for (var i = 0; i < buttonElementsWithIcons.length; i++) {
      var style = buttonElementsWithIcons[i].getAttribute('style');
      if (style != null && style.length > 0) {
        if (style.match(/gallery/)) {
          buttonElementsWithIcons[i].click();
          client.switchToFrame('browser3');
          client.helper.waitForElement(Gallery.Selector.thumbnail);
          var thumbnails = app.thumbnails;
          thumbnails[0].click();
          break;
        }
      }
    }
  }

  test('Explicitly allow cropping', function() {

    contacts.launch();

    client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg',
          allowCrop: true
        }
      });
    });

    client.switchToFrame();

    selectGalleryAndDisplayPhoto();

    client.helper.waitForElement('#edit-crop-canvas');
    assert(client.findElement('#edit-crop-canvas') != null);
  });

  test('Explicitly disallow cropping', function() {

    contacts.launch();

    client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg',
          allowCrop: false
        }
      });
    });

    client.switchToFrame();

    selectGalleryAndDisplayPhoto();

    client.helper.waitForElement('#edit-preview-canvas');
    assert(client.findElement('#edit-preview-canvas') != null);
    client.setSearchTimeout(1);
    var cropCanvasFound;
    client.findElement('#edit-crop-canvas', function(err, element) {
      cropCanvasFound = false;
    });
    assert(cropCanvasFound == false);
  });

  test('Default cropping behavior (don\'t allow)', function() {

    contacts.launch();

    client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg'
        }
      });
    });

    client.switchToFrame();

    selectGalleryAndDisplayPhoto();

    client.helper.waitForElement('#edit-preview-canvas');
    assert(client.findElement('#edit-preview-canvas') != null);
    client.setSearchTimeout(1);
    var cropCanvasFound;
    client.findElement('#edit-crop-canvas', function(err, element) {
      cropCanvasFound = false;
    });
    assert(cropCanvasFound == false);
  });
});
