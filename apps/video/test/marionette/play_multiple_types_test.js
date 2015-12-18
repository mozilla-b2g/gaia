'use strict';

var assert = require('assert'),
    Marionette = require('marionette-client'),
    Video = require('./lib/video');

marionette('play various types of videos', function() {

  var app, client, actions;

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
    app = new Video(client);
    actions = new Marionette.Actions(client);
  });

  test ('test various videos', function() {
    var types = ['mp4', 'ogg', 'ogv', 'webm'];

    types.forEach(function(type) {
      var filename = 'test_' + type + '_video.' + type;

      client.fileManager.add({
        type: 'videos',
        filePath: 'apps/video/test/videos/' + filename
      });
    });

    app.launch();
    app.waitForThumbnails(types.length);
    var thumbnails = app.getThumbnails();
    for (var i = 0; i < thumbnails.length; i++) {

      app.tapThumbnail(i);
      app.waitForVideoToStartPlaying();

      // Add some context to the output in case of test failure.
      console.log('playing video:', app.videoTitle());

      // Verify the video has begun playing and the
      // title has been read properly.
      assert(app.getElapsedTimeSeconds() > 0);

      var expectedTitle = 'Test ' + types[i] + ' video';
      assert(app.videoTitle(), expectedTitle);

      // Go back to the thumbnail view.
      app.back();

      // Scroll the thumbnails a bit after each video is played
      // to ensure the thumbnails are displayed when they are
      // 'tapped'.
      actions.flick(thumbnails[i], 0, 0, 0, -30).perform();
    }
  });
});
