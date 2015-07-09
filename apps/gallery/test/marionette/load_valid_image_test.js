'use strict';

var Gallery = require('./lib/gallery.js'),
    Fullscreen_View = require('./lib/fullscreen_view.js'),
	Marionette = require('marionette-client'),
    assert = require('assert');

marionette('loading images', function() {

  var app, fullscreen_view, actions, client;

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
    client.fileManager.add([
    	{type: 'pictures',filePath: 'apps/gallery/test/images/01.jpg'}, 
    	{type: 'pictures',filePath: 'apps/gallery/test/images/02.png'}, 
    	{type: 'pictures',filePath: 'apps/gallery/test/images/03.gif'}, 
    	{type: 'pictures',filePath: 'apps/gallery/test/images/04.bmp'}, 
    	// Progressive JPG 
        {type: 'pictures',filePath: 'apps/gallery/test/images/05.jpg'}, 
    	// Transparent background PNG
        {type: 'pictures',filePath: 'apps/gallery/test/images/06.png'}, 
    	// Animated GIF 
        {type: 'pictures',filePath: 'apps/gallery/test/images/07.gif'}, 
    	// Animaged PNG 
        {type: 'pictures',filePath: 'apps/gallery/test/images/08.png'}  
    ]);
    app = new Gallery(client);
    fullscreen_view = new Fullscreen_View(client);
    actions = new Marionette.Actions(client);
    app.launch();
  });

  test('open valid images in fullscreen view', function() {

    for (var i = 0; i < 8; i++) {
    	app.tapThumbnail(i);
        assert.ok(fullscreen_view.displayed);

        var initial_width = fullscreen_view.width;
        var initial_height = fullscreen_view.height;
    	
    	// Checks the image blob is currently being displayed
        assert.ok(fullscreen_view.hasSrcImageBlobURL(Gallery.ORIGIN,
            fullscreen_view.displayedImage));
    	
        // Initially the image resolutions matches the frame size.  
        // if the image's original res is
        // greater than the frame, it will zoom in when the user double taps.
    	// double tap, if the image width got increased,
        // also check the displayed image height has increased (i.e. zoomed in)
    	actions.doubleTap(fullscreen_view.displayedImage).perform();
        if (initial_width < fullscreen_view.width)
            {assert.ok(initial_height < fullscreen_view.height);}
    	else
            {assert.ok(initial_height == fullscreen_view.height);}
            
        // return to the main thumbnail view
    	fullscreen_view.fullscreenBackButton.click();
        assert.ok(app.thumbnailsViewDisplayed);	    
    }

      });
});
