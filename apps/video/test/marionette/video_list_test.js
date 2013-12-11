var __gallery__ = '../../../gallery/test/marionette/';
var videoApp = require('./lib/video.js');

marionette('video list', function() {
  var assert = require('assert');
  var client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });
  var app;

  setup(function() {
    // inject MozActivity to put activity information into
    // body.dataset.activity.
    client.contentScript.inject(__dirname +
                                '/lib/mocks/mock_window_mozactivity.js');

    // Add file into the videos directory.
    client.fileManager.add([
      { type: 'videos', filePath: 'test_media/Movies/elephants-dream.webm',
        filename: 'elephants-dream.webm' }
    ]);
    app = new videoApp(client);
    app.launch();
  });

  test('> check video lists', function() {
    assert.ok(app.getThumbnails().length > 0, 'the list is empty');
    assert.ok(app.getThumbnails()[0].displayed(),
              'at least one item should be shown');
  });

  test('> open camera app', function() {
    app.clickCamera();
    var body = client.findElement('body');
    console.log('Camera Data Activity :', body.getAttribute('data-activity'));
    var activityObj = JSON.parse(body.getAttribute('data-activity'));
    assert.ok(activityObj.name === 'record',
             'the activity name should be record.');
    assert.ok(activityObj.data.type === 'videos',
             'type in data should be videos.');
  });

  test('> select video', function() {
    app.enterSelectionMode();
    var firstItem = app.clickThumbnail(0);
    // Wait for firstItem is shown as selected, otherwise error
    client.waitFor(function() {
      var classList = firstItem.getAttribute('class').split(' ');
      return classList.indexOf('selected') > -1;
    });
    assert.ok(true, 'the video item should be selected');
  });

  test('> share video', function() {
    app.enterSelectionMode();
    app.clickThumbnail(0);
    app.clickShare();
    var body = client.findElement('body');
    console.log('Share Data Activity :', body.getAttribute('data-activity'));
    var activityObj = JSON.parse(body.getAttribute('data-activity'));
    assert.ok(activityObj.name === 'share',
             'the activity name should be share.');
    assert.ok(activityObj.data,
             'no data found in activity payload.');
  });

  test('> delete video', function() {
    app.enterSelectionMode();
    app.clickThumbnail(0);
    app.clickMultipleDelete();
    //Click ok to delete the file
    app.clickOkToDelete();
    //check if number of video files is 0
    assert.ok(app.getThumbnails().length == 0, 'the list is empty');

    // Remove all files in device storage.
    client.fileManager.removeAllFiles();
  });

});
