/*
 * Unit tests for the MediaFrame class from shared/js/media/media_frame.js
 */
/* global Promise */
'use strict';

// This mock needs to be in place when we load MediaFrame, so it is here
// rather than in suiteSetup. We remove it in suiteTeardown.
var realGetFeature = navigator.getFeature;
navigator.getFeature = function(feature) {
  if (feature === 'hardware.memory') {
    return Promise.resolve(4096); // 4gb of memory
  }
  else {
    return Promise.reject();
  }
};

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

    navigator.getFeature = realGetFeature;
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();
  });

  teardown(function() {
    this.sandbox.restore();
  });


  suite('Runtime memory detection', function() {
    test('navigator.getFeature() is called', function() {
      // We're faking 4gb of memory, so we should get 4 * 8mb of decode size
      assert.equal(MediaFrame.maxImageDecodeSize, 32 * 1024 * 1024);
    });

    test('computeMaxImageDecodeSize() works correctly', function() {
      assert.equal(MediaFrame.computeMaxImageDecodeSize(128), 2 * 1024 * 1024);
      assert.equal(MediaFrame.computeMaxImageDecodeSize(512), 5 * 1024 * 1024);
      assert.equal(MediaFrame.computeMaxImageDecodeSize(1024), 8 * 1024 * 1024);

      // For low-memory devices, the image size may also depend on
      // screen size
      var size = MediaFrame.computeMaxImageDecodeSize(256);
      assert.ok(size === 3 * 1024 * 1024 || size == 2.5 * 1024 * 1024);
    });
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

      this.sandbox.stub(navigator, 'getDeviceStorage', function(type) {
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

      this.sandbox.stub(navigator, 'getDeviceStorage', function(type) {
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

  suite('Max decode size', function() {
    var frame;
    var dummyDiv;
    var dummyJPEGBlob;

    setup(function() {
      dummyJPEGBlob = new Blob(['empty-image'], {'type': 'image/jpeg'});
      dummyDiv = document.createElement('div');
    });

    test('no decode limits', function() {
      // Even if the image is really big, we will decode it full size
      // if no limits are set
      MediaFrame.maxImageDecodeSize = 0;
      frame = new MediaFrame(dummyDiv, false);
      frame.displayImage(dummyJPEGBlob, 10000, 10000);
      assert.equal(frame.fullSampleSize, Downsample.NONE);
    });

    test('limit decode size with constructor', function() {
      MediaFrame.maxImageDecodeSize = 0;
      // With a 1mp limit, a big image will be downsampled
      frame = new MediaFrame(dummyDiv, false, 1024 * 1024);
      frame.displayImage(dummyJPEGBlob, 10000, 10000);
      assert.notEqual(frame.fullSampleSize, Downsample.NONE);

      // With a 1mp limit, a small image will not be downsampled
      frame = new MediaFrame(dummyDiv, false, 1024 * 1024);
      frame.displayImage(dummyJPEGBlob, 1000, 1000);
      assert.deepEqual(frame.fullSampleSize, Downsample.NONE);
    });

    test('limit decode size with memory', function() {
      // Set a 1mp limit
      MediaFrame.maxImageDecodeSize = 1024*1024;

      // Big images will be downsampled
      frame = new MediaFrame(dummyDiv, false);
      frame.displayImage(dummyJPEGBlob, 10000, 10000);
      assert.notEqual(frame.fullSampleSize, Downsample.NONE);

      // Small images will not be downsampled
      frame.displayImage(dummyJPEGBlob, 1000, 1000);
      assert.deepEqual(frame.fullSampleSize, Downsample.NONE);
    });

    test('memory limit lower than constructor', function() {
      // Set a 1mp limit based on memory
      MediaFrame.maxImageDecodeSize = 1024*1024;

      // 4mp images will be downsampled even though constructor allows 5mp
      frame = new MediaFrame(dummyDiv, false, 5 * 1024 * 1024);
      frame.displayImage(dummyJPEGBlob, 2000, 2000);
      assert.notEqual(frame.fullSampleSize, Downsample.NONE);

      // Small images will not be downsampled
      frame.displayImage(dummyJPEGBlob, 1000, 1000);
      assert.deepEqual(frame.fullSampleSize, Downsample.NONE);
    });

    test('constructor limit lower than memory', function() {
      // Set a 5mp limit based on memory
      MediaFrame.maxImageDecodeSize = 5*1024*1024;

      // 4mp images will be downsampled even though memory allows 5mp
      frame = new MediaFrame(dummyDiv, false, 1024 * 1024);
      frame.displayImage(dummyJPEGBlob, 2000, 2000);
      assert.notEqual(frame.fullSampleSize, Downsample.NONE);

      // Small images will not be downsampled
      frame.displayImage(dummyJPEGBlob, 1000, 1000);
      assert.deepEqual(frame.fullSampleSize, Downsample.NONE);
    });
  });
});
