var Video = require('./video.js'),
    assert = require('assert'),
    TestCommon = require('./test_common');

marionette('Video info of played video# ', function() {

  var app, client, actions;

  client = marionette.client({
    prefs: {
      'device.storage.enabled': true,
      'device.storage.testing': true,
      'device.storage.prompt.testing': true
    }
  });

  setup(function(done) {
    TestCommon.prepareTestSuite('videos', client, function(err) {
      if (TestCommon.
        mediaExistsSync(
          '/tmp/device-storage-testing/videos/test_video.ogv')) {
        console.log('Test:Media File Exist before opening App');
      } else {
        console.log('Test:Media File does not exist before opening App');
      }
      app = new Video(client);
      app.launch();
      done(err);
    });
  });

  test('should play video and go on video info', function() {
    // You should be able to click on an video to go to player
    // and click on info icon to view video info
    app.thumbnail.click();
    assert.ok(app.fullscreenView.displayed());
    //click fullscreen to display video controls
    app.fullscreenView.click();

    app.thumbnailsSingleInfoButton.click();
    client.helper.waitForElement(app.infoView);
    assert.ok(app.infoView.displayed());
  });
});
