var Gallery = require('./lib/gallery.js'),
    Contacts = require('./lib/contacts.js'),
    Marionette = require('marionette-client'),
    assert = require('assert'),
    TestCommon = require('./lib/test_common');

marionette('Pick activity cropping behavior', function() {

  var app, client, contacts;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true,
      'webgl.force-enabled': true
    }
  });

  setup(function() {
    TestCommon.prepareTestSuite('pictures', client);
    app = new Gallery(client);
    contacts = new Contacts(client);
  });

  function selectGalleryAndDisplayPhoto() {
    console.log('finding buttons with icons');
    var buttonElementsWithIcons = app.buttonsWithIcons;
    console.log('found buttons with icons');
    for (var i = 0; i < buttonElementsWithIcons.length; i++) {
      var style = buttonElementsWithIcons[i].getAttribute('style');
      console.log('found botton with style: ' + style);
      if (style != null && style.length > 0) {
        if (style.match(/gallery/)) {
          console.log('found gallery button');
          buttonElementsWithIcons[i].click();
          client.switchToFrame('browser3');
          console.log('waiting for thumbnail element');
          client.helper.waitForElement(Gallery.Selector.thumbnail);
          console.log('found thumbnail element, clicking');
          var thumbnails = app.thumbnails;
          thumbnails[0].click();
          console.log('clicked on thumbnail element');
          break;
        }
      }
    }
  }

  test('Explicitly allow cropping', function() {

    console.log('\nlaunching contacts app');
    contacts.launch();
    console.log('launched contacts app');

    console.log('launching pick activity');

    client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg',
          allowCrop: true
        }
      });
    });

    console.log('launched pick activity');

    client.switchToFrame();

    console.log('selecting gallery and displaying photo');

    selectGalleryAndDisplayPhoto();

    console.log('waiting for edit-crop-canvas');
    client.helper.waitForElement('#edit-crop-canvas');
    console.log('found edit-crop-canvas');
    assert(client.findElement('#edit-crop-canvas') != null);
  });

  test('Explicitly disallow cropping', function() {

    console.log('\nlaunching contacts app');
    contacts.launch();
    console.log('launched contacts app');

    console.log('launching pick activity');

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

    console.log('selecting gallery and displaying photo');

    selectGalleryAndDisplayPhoto();

    console.log('waiting for edit-preview-canvas');
    client.helper.waitForElement('#edit-preview-canvas');
    console.log('found edit-preview-canvas');
    assert(client.findElement('#edit-preview-canvas') != null);
    client.setSearchTimeout(1);
    var cropCanvasFound;
    client.findElement('#edit-crop-canvas', function(err, element) {
      cropCanvasFound = false;
    });
    assert(cropCanvasFound == false);
  });

  test('Default cropping behavior (don\'t allow)', function() {

    console.log('\nlaunching contacts app');
    contacts.launch();
    console.log('launched contacts app');

    console.log('launching pick activity');

    client.executeScript(function() {
      var activity = new MozActivity({
        name: 'pick',
        data: {
          type: 'image/jpeg'
        }
      });
    });

    client.switchToFrame();

    console.log('selecting gallery and displaying photo');

    selectGalleryAndDisplayPhoto();

    console.log('waiting for edit-preview-canvas');
    client.helper.waitForElement('#edit-preview-canvas');
    console.log('found edit-preview-canvas');
    assert(client.findElement('#edit-preview-canvas') != null);
    client.setSearchTimeout(1);
    var cropCanvasFound;
    client.findElement('#edit-crop-canvas', function(err, element) {
      cropCanvasFound = false;
    });
    assert(cropCanvasFound == false);
  });
});
