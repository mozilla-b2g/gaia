/*
  Media Frame unit tests.
*/
'use strict';

var Downsample = require('/shared/js/media/downsample.js');
var MediaFrame = require('/shared/js/media/media_frame.js');

suite('Media Frame Unit Tests', function() {

  var mockDeviceStorage = false;

  suiteSetup(function() {
    this.clock = sinon.useFakeTimers();

    if (!navigator.getDeviceStorage) {
      // create dummy getDeviceStorage for sinon overriding.
      navigator.getDeviceStorage = function() {};
      mockDeviceStorage = true;
    }
  });

  suiteTeardown(function() {
    this.clock.restore();

    if (mockDeviceStorage) {
      delete navigator.getDeviceStorage;
    }
  });

  suite('#displayImage', function() {

    var frame;
    var dummyDiv;
    var dummyJPEGBlob;
    var dummyPNGBlob;

    setup(function() {
      dummyJPEGBlob = new Blob(['empty-image'], {'type': 'image/jpeg'});
      dummyPNGBlob = new Blob(['empty-image'], {'type': 'image/png'});
      dummyDiv = document.createElement('div');
      frame = new MediaFrame(dummyDiv, false);
    });

    // The tests that follow use unrealistically large images sizes
    // because mediaFrame uses window.innerWidth and window.innerHeight
    // and window.devicePixelRatio. If I could force those to 320, 480 and 1
    // the tests could use smaller image sizes. Instead, we use really big
    // fake image sizes to that things work as expected even if we're
    // running on a large screen.
    test('=> displayImage big JPEG image without preview', function() {
      frame.displayImage(dummyJPEGBlob, 8000, 6000, null, 0, false);
      assert.isTrue(frame.displayingImage);
      assert.isTrue(frame.displayingPreview);
      assert.isNull(frame.previewblob);  // no separate preview image
      assert.notEqual(frame.previewSampleSize, Downsample.NONE);
      frame.reset();
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.equal(frame.previewblob, null);
    });

    test('=> displayImage big PNG image without preview', function() {
      frame.displayImage(dummyPNGBlob, 8000, 6000, null, 0, false);
      assert.isTrue(frame.displayingImage);
      assert.isFalse(frame.displayingPreview);
      assert.isNull(frame.previewblob);
      frame.reset();
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.equal(frame.previewblob, null);
    });

    test('=> displayImage small without preview', function() {
      frame.displayImage(dummyJPEGBlob, 160, 120, null, 0, false);
      assert.isTrue(frame.displayingImage);
      assert.isFalse(frame.displayingPreview);
      assert.isNull(frame.previewblob);
      frame.reset();
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.isNull(frame.previewblob);
    });

    test('=> displayImage embedded preview, bigEnough=false', function() {
      var preview = {
        'start': 1,
        'end': 2,
        'width': 40,
        'height': 30
      };
      frame.displayImage(dummyJPEGBlob, 8000, 6000, preview, 0, false);
      assert.isTrue(frame.displayingImage);
      assert.isTrue(frame.displayingPreview);
      assert.isNull(frame.previewblob);
      assert.notEqual(frame.previewSampleSize, Downsample.NONE);
      frame.reset();
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.isNull(frame.previewblob);
    });

    test('=> displayImage preview big enough, aspect ratio wrong', function() {
      var preview = {
        'start': 1,
        'end': 2,
        'width': 800,
        'height': 800
      };
      frame.displayImage(dummyJPEGBlob, 8000, 6000, preview, 0, false);
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.isNull(frame.previewblob);
      assert.notEqual(frame.previewSampleSize, Downsample.NONE);
      frame.reset();
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.isNull(frame.previewblob);
    });

    test('=> displayImage preview big enough, aspect ratio ok', function() {
      var preview = {
        'start': 1,
        'end': 2,
        'width': 4000,
        'height': 3000
      };
      frame.displayImage(dummyJPEGBlob, 8000, 6000, preview, 0, false);
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.ok(frame.previewblob);
      frame.reset();
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.ok(frame.previewblob);
    });

    test('=> displayImage preview file, get success', function() {
      var preview = {
        'filename': 'dummyFilename',
        'width': 4000,
        'height': 3000
      };

      this.sinon.stub(navigator, 'getDeviceStorage', function(type) {
        assert.equal(type, 'pictures');

        function dummyGet(filename) {
          assert.equal(filename, 'dummyFilename');
          var retObj = {};

          setTimeout(function() {
            retObj.result = new Blob(['empty-image'], {'type': 'image/jpeg'});
            retObj.onsuccess();
            assert.isTrue(frame.displayingPreview);
            assert.isTrue(frame.displayingImage);
            assert.ok(frame.previewblob);
            frame.reset();
          });

          return retObj;
        }

        return {
          get: dummyGet
        };
      });

      frame.displayImage(dummyJPEGBlob, 8000, 6000, preview, 0, false);

      // Move time forwards so
      // stub callback fires
      this.clock.tick(1);
    });

    test('=> displayImage preview file, get error', function() {
      var preview = {
        'filename': 'dummyFilename',
        'width': 4000,
        'height': 3000
      };

      this.sinon.stub(navigator, 'getDeviceStorage', function(type) {
        assert.equal(type, 'pictures');

        function dummyGet(filename) {
          assert.equal(filename, 'dummyFilename');
          var retObj = {};

          setTimeout(function() {
            retObj.onerror();
            assert.isFalse(frame.displayingPreview);
            assert.isNull(frame.preview);
            assert.isTrue(frame.displayingImage);
            frame.reset();
          });

          return retObj;
        }

        return {
          get: dummyGet
        };
      });

      frame.displayImage(dummyPNGBlob, 8000, 6000, preview, 0, false);

      // Move time forwards so
      // stub callback fires
      this.clock.tick(1);
    });
  });
});
