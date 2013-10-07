var Video = require('./lib/video'),
    assert = require('assert');

marionette('played video', function() {

  var app, client;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });

  function getActivityData(client) {
    return client.executeScript(function() {
      return window.wrappedJSObject.getMozActivityData();
    });
  }

  setup(function() {
    // inject MozActivity to get activity details
    client.contentScript.inject(__dirname +
                                '/lib/mocks/mock_window_mozactivity.js');
    // Remove all files in temp device storage.
    client.fileManager.removeAllFiles();
    // Add file into the videos directory
    client.fileManager.add({
      type: 'videos',
      filePath: 'test_media/Movies/elephants-dream.webm'
    });
    app = new Video(client);
    app.launch();
  });

  test('should play video and go on video info', function() {
    // Click on first video to go to player
    app.playVideoFromGalleryView(0);
    // Click on info icon to view video info
    app.thumbnailsSingleInfo.click();
    client.helper.waitForElement(app.infoView);
    assert.ok(app.infoView.displayed());
  });

  test('should play video and share', function() {
    // Click on first video to go to player
    app.playVideoFromGalleryView(0);
    // Click on share icon
    app.thumbnailsSingleShare.click();
    var activityObj = getActivityData(client);
    assert.equal(
      activityObj.name,
      'share',
      'the activity name should be share.'
    );
    assert.equal(activityObj.data.type,
      'video/*',
      'type data in share activity is video/*.'
    );
  });

  test('should play video and delete', function() {
    // Click on first video to go to player
    app.playVideoFromGalleryView(0);
    // Click on delete icon
    app.thumbnailsSingleDelete.click();
    // Click ok to delete the file
    app.confirmOk.click();
    // Check if number of video files is 0
    assert.equal(
      app.getThumbnails().length,
      0,
      'the list is empty'
    );
  });
});
