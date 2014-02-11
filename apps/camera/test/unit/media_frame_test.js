/*
  Media Frame unit tests.
*/
'use strict';

require('/shared/js/media/media_frame.js');

suite('Media Frame Unit Tests', function() {

  var mockDeviceStorage = false;

  suiteSetup(function() {
    if (!navigator['getDeviceStorage']) {
      // create dummy getDeviceStorage for sinon overriding.
      navigator.getDeviceStorage = function() {};
      mockDeviceStorage = true;
    }
  });

  suiteTeardown(function() {
    if (mockDeviceStorage) {
      delete navigator.getDeviceStorage;
    }
  });

  suite('#displayImage', function() {

    var frame;
    var dummyDiv;
    var dummyBlob;

    setup(function() {
      dummyBlob = new Blob(['empty-image'], {'type': 'image/jpeg'});
      dummyDiv = document.createElement('div');
      frame = new MediaFrame(dummyDiv, false);
    });

    test('=> displayImage without preview', function() {
      frame.displayImage(dummyBlob, 1600, 1200, null, 0, false);
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      frame.reset();
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
    });

    test('=> displayImage embedded preview, bigEnough=false', function() {
      var preview = {
        'start': 1,
        'end': 2,
        'width': 1,
        'height': 1
      };
      frame.displayImage(dummyBlob, 1600, 1200, preview, 0, false);
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      assert.isNull(frame.preview);
      frame.reset();
      assert.isFalse(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
    });

    test('=> displayImage embedded preview, bigEnough=true', function() {
      var preview = {
        'start': 1,
        'end': 2,
        'width': 1000,
        'height': 1000
      };
      frame.displayImage(dummyBlob, 1600, 1200, preview, 0, false);
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
      frame.reset();
      assert.isTrue(frame.displayingPreview);
      assert.isTrue(frame.displayingImage);
    });

    test('=> displayImage preview file, get success', function(done) {
      var preview = {
        'filename': 'dummyFilename',
        'width': 1000,
        'height': 1000
      };

      this.sinon.stub(navigator, 'getDeviceStorage', function(type) {
        assert.equal(type, 'pictures');

        function dummyGet(filename) {
          assert.equal(filename, 'dummyFilename');
          var retObj = {};

          window.setTimeout(function() {
            retObj.result = new Blob(['empty-image'], {'type': 'image/jpeg'});
            retObj.onsuccess();
            assert.isTrue(frame.displayingPreview);
            assert.isTrue(frame.displayingImage);
            frame.reset();
            done();
          });

          return retObj;
        }

        return {
          get: dummyGet
        };
      });

      frame.displayImage(dummyBlob, 1600, 1200, preview, 0, false);
    });

    test('=> displayImage preview file, get error', function(done) {
      var preview = {
        'filename': 'dummyFilename',
        'width': 1000,
        'height': 1000
      };

      this.sinon.stub(navigator, 'getDeviceStorage', function(type) {
        assert.equal(type, 'pictures');

        function dummyGet(filename) {
          assert.equal(filename, 'dummyFilename');
          var retObj = {};

          window.setTimeout(function() {
            retObj.onerror();
            assert.isFalse(frame.displayingPreview);
            assert.isNull(frame.preview);
            assert.isTrue(frame.displayingImage);
            frame.reset();
            done();
          });

          return retObj;
        }

        return {
          get: dummyGet
        };
      });

      frame.displayImage(dummyBlob, 1600, 1200, preview, 0, false);
    });
  });
});
