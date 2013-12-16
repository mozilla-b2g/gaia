var Video = require('./lib/video'),
    assert = require('assert');

marionette('video list', function() {

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

  test('check video lists', function() {
    assert.ok(app.getThumbnails().length > 0, 'the list is not empty');
    assert.ok(app.getThumbnails()[0].displayed(),
              'first item should be shown');
  });

  test('open camera app', function() {
    app.thumbnailsVideo.click();
    var activityObj = getActivityData(client);

    assert.equal(
      activityObj.name,
      'record',
      'the activity name should be record.'
    );
    assert.equal(
      activityObj.data.type,
      'videos',
      'type in data should be videos.'
    );
  });

  test('share video', function() {
    app.enterSelectionMode();
    app.selectThumbnail(0);
    app.thumbnailsShare.click();
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

  test('delete video', function() {
    app.enterSelectionMode();
    app.selectThumbnail(0);
    // Click on delete icon
    app.thumbnailsDelete.click();
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
