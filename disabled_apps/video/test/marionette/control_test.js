'use strict';

var Video = require('./lib/video'),
    assert = require('assert');
    
marionette('video player view test', function() {
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
  var app, selectors, initialTime, nextTime;

  setup(function() {
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    
    // Add file into the videos directory
    client.fileManager.add({
      type: 'videos',
      filePath: 'test_media/samples/Movies/meetthecubs.webm'
    });

    selectors = Video.Selector;
    app = new Video(client);
  });

  test('open video and check FF, REW, Play/Pause feature', function() {
    // tap thumbnail to open video
    app.launch();
    app.waitForThumbnails(1);
    app.tapThumbnail(0);
    app.waitForVideoToStartPlaying();
    
    // pause, then tap forward and check the counter 
    // that it was increased by 10 seconds
    assert.ok(app.pausePlayback());
    initialTime = app.getElapsedTimeSeconds();
    app.tapForward();
    nextTime = app.getElapsedTimeSeconds();
    assert.ok(nextTime == (initialTime + 10));
    initialTime = nextTime;
    app.tapForward();
    nextTime = app.getElapsedTimeSeconds();
    assert.ok(nextTime == (initialTime + 10));
    initialTime = nextTime;

    // tap rewind and check the counter
    app.tapRewind();
    nextTime = app.getElapsedTimeSeconds();
    assert.ok(nextTime == (initialTime - 10));
    initialTime = nextTime;
    app.tapRewind();
    nextTime = app.getElapsedTimeSeconds();
    assert.ok(nextTime == (initialTime - 10));

    // resume play and check it's progressing
    initialTime = nextTime;
    assert.ok(app.startPlayback());
  });
});