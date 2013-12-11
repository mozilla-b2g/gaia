var __gallery__ = '../../../gallery/test/marionette/';
var Video = require('./lib/video.js'),
    assert = require('assert'),
    testCommon = require(__gallery__ + 'lib/test_common');

marionette('Video info of played video# ', function() {

  var app, client, actions;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });

  setup(function() {
    // Add file into the videos directory.
    /*client.fileManager.add([
      { type: 'videos', filePath: 'test_media/Movies/elephants-dream.webm',
        filename: 'elephants-dream.webm' }
    ]);*/
    testCommon.prepareTestSuite('videos', client);

    app = new Video(client);
    app.launch();
  });

  teardown(function() {
    client = {};
  });


  test('> should play video and go on video info', function() {
    // Click on a video to go to player and then
    // click on info icon to view video info
    app.clickThumbnail(0);

    // click fullscreenView and wait until we see videoControls
    client.waitFor(function() {
      app.fullscreenView.click();
      return app.videoControls.displayed();
    });

    app.clickInfoButton();
    client.helper.waitForElement(app.infoView);
    assert.ok(app.infoView.displayed());

     // Remove all files in device storage.
    //client.fileManager.removeAllFiles();
  });
});
