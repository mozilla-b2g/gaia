'use strict';

var Gallery = require('./lib/gallery.js'),
    Fullscreen_View = require('./lib/fullscreen_view.js'),
    GalleryInfoView = require('./lib/gallery_info_view.js'),
    assert = require('assert');

marionette('Gallery Info View tests', function() {

  var app, client, fullscreen_view, info_view;

  client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
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
    info_view = new GalleryInfoView(client);
    app.launch();
  });

  test('check displayed information of image', function() {
    assert.strictEqual(app.thumbnails.length, 1);
    app.tapFirstThumbnail();
    assert.ok(fullscreen_view.displayed);
    fullscreen_view.infoButton.click();
    assert.equal(info_view.waitForInfoViewDisplayed(), true);
    
    // check displayed values on info view
    assert.equal(info_view.displayedName, 'firefoxOS.png');
    assert.equal(info_view.displayedSize, '51 KB');
    assert.equal(info_view.displayedType, 'image/png');
    var today = new Date();
    assert.equal(info_view.displayedDate, today.getMonth() + 1 + 
      '/' + today.getDate() + '/' + today.getFullYear());
    assert.equal(info_view.displayedResolution, '252x240');
    
    // tap close, go back to the player view, check it still shows the file
    info_view.tapClose();
    assert.ok(fullscreen_view.displayed);
  });
});
