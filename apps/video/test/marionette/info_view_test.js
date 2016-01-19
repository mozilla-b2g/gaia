'use strict';

var Video = require('./lib/video'),
    assert = require('assert'),
    VideoOptionsView = require('./lib/video_options_view.js'),
    VideoInfoView = require('./lib/video_info_view.js');

marionette('video info view', function() {
  var client = marionette.client({
    profile: {
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true,
        'device.storage.prompt.testing': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var app, selectors, optionsView, infoView;

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    
    // Add file into the videos directory
    client.fileManager.add({
      type: 'videos',
      filePath: 'test_media/Movies/elephants-dream.webm'
    });

    selectors = Video.Selector;
    app = new Video(client);
    optionsView = new VideoOptionsView(client);
    infoView = new VideoInfoView(client);
  });

  test('open video and check video info', function() {
    // tap thumbnail to open video
    app.launch();
    app.waitForThumbnails(1);
    app.tapThumbnail(0);
    app.waitForVideoToStartPlaying();
    
    // tap screen to show menu, then tap option
    app.tapOption();
    assert.equal(optionsView.waitForOptionsViewDisplayed(), true);
    
    // tap more info from options menu
    optionsView.tapMoreInfo();
    assert.equal(infoView.waitForInfoViewDisplayed(), true);
    
    // check displayed values
    assert.equal(infoView.displayedName, 'Elephants-dream');
    assert.equal(infoView.displayedLength, '01:58');
    assert.equal(infoView.displayedSize, '8.2 MB');
    assert.equal(infoView.displayedType, 'webm');
    var today = new Date();
    assert.equal(infoView.displayedDate, today.getMonth() + 1 + 
      '/' + today.getDate() + '/' + today.getFullYear());
    assert.equal(infoView.displayedResolution, '540x360');
    
    // tap close, go back to the player view, check it still shows the file
    infoView.tapClose();
    assert.equal(app.waitForControls(), true);
    assert.equal(app.videoTitle(),'Elephants-dream');
  });
});
