var Gallery = require('./lib/gallery.js'),
    Marionette = require('marionette-client'),
    assert = require('assert'),
    TestCommon = require('./lib/test_common');

marionette('editing an image', function() {
  suite('launch in landscape', function() {
    var app, actions, client;
    client = marionette.client({
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true
      },
      hostOptions: {
        screen: {
          width: 1280,
          height: 800
        }
      }
    });

    setup(function() {
      TestCommon.prepareTestSuite('pictures', client, 2);
      app = new Gallery(client);
      actions = new Marionette.Actions(client);
      app.launch();
    });

    test('aunch gallery and' +
         ' it will update preview screen with latest' +
         ' picture after scanend', function() {
      client.waitFor(function() {
        return app.findElement('#frame2 img').getAttribute('src') !== null;
      });
      assert.ok(true);
    });

    test('click second thumbnail and the preview screen should be different' +
         ' with the original one', function() {
      var initImageSrc;
      var frame2Img = app.findElement('#frame2 img');
      client.waitFor(function() {
        return frame2Img.getAttribute('src') !== null;
      });
      initImageSrc = frame2Img.getAttribute('src');

      var element = app.findElement('.thumbnail:nth-child(2)');
      element.click();

      client.waitFor(function() {
        return frame2Img.getAttribute('src') !== initImageSrc;
      });
      var secondImageSrc = frame2Img.getAttribute('src');
      assert.ok(secondImageSrc);
      assert.notEqual(secondImageSrc, initImageSrc);
    });

    test('click preview screen and' +
         ' go to fullscreen mode', function() {
      var element = app.findElement('.thumbnail:nth-child(2)');
      element.click();
      app.fullscreenFrame2.click();
      client.waitFor(function() {
        return app.currentView == 'fullscreenView';
      });
      assert.ok(true);
    });
  });

  suite('launch in portrait', function() {
    var app, actions, client;
    client = marionette.client({
      prefs: {
        'device.storage.enabled': true,
        'device.storage.testing': true
      },
      hostOptions: {
        screen: {
          width: 800,
          height: 1280
        }
      }
    });
    setup(function() {
      TestCommon.prepareTestSuite('pictures', client);
      app = new Gallery(client);
      actions = new Marionette.Actions(client);
      app.launch();
    });

    test('click thumbnail and' +
         ' go to fullscreen mode', function() {
      app.thumbnail.click();
      client.waitFor(function() {
        return app.currentView == 'fullscreenView';
      });
      assert.ok(true);
    });
  });
});
