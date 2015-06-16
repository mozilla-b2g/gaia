'use strict';

var Gallery = require('./lib/gallery.js'),
	  assert = require('assert');

marionette('loading images', function() {

  var app, client;

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
    // Add invalid files into the pictures directory
    client.fileManager.add([
    	{type: 'pictures',filePath: 'apps/gallery/test/images/x01.png'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x02.gif'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x03.jpg'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x05.png'}, 
    	  {type: 'pictures',filePath: 'apps/gallery/test/images/x06.jpg'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x08.jpg'}, 
    	  {type: 'pictures',filePath: 'apps/gallery/test/images/x09.png'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x10.gif'}, 
        {type: 'pictures',filePath: 'apps/gallery/test/images/x11.bmp'} 
    ]);
    app = new Gallery(client);
    app.launch(true);
  });

  test('check invalid images are not shown in thumbnail view', function() {

    var overlayView = app.overlayView;
    var overlayTitle = app.overlayTitle;
    var overlayText = app.overlayText; 
    var cameraButton = app.cameraButton;

    client.helper.waitForElement(overlayView);
    assert.strictEqual(app.thumbnails.length, 0);
    assert.ok(overlayView.displayed());
    assert.ok(overlayTitle.displayed());
    assert.ok(overlayTitle.text() == 'No photos or videos');
    assert.ok(overlayText.displayed());
    assert.ok(overlayText.text() == 'Use the Camera app to get started.');
    assert.ok(cameraButton.displayed());
    assert.ok(cameraButton.text() == 'Go to Camera');
  });
});
