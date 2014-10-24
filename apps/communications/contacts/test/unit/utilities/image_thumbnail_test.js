'use strict';

/* global utils, MockLazyLoader */

require('/shared/js/contacts/utilities/image_thumbnail.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

suite('Contacts/utilities/thumbnailImage >', function() {
  var imageData = {
    'gaia.png': null,
    'tiny-gaia.png': null,
    'sadpanda.png': null
  };

  var realLazyLoader, realImageUtils, realConfig, mockUtilsConfig;
  var spy;

  suiteSetup(function(done) {
    realLazyLoader = window.LazyLoader;
    realImageUtils = window.ImageUtils;

    window.LazyLoader = MockLazyLoader;
    window.ImageUtils = {
      resizeAndCropToCover: function(inputImageBlob,
                                    outputWidth, outputHeight,
                                    outputType, encoderOptions) {
        return Promise.resolve(new Blob(['x'], {type: 'image/jpeg'}));
      }
    };

    spy = sinon.spy(window.ImageUtils, 'resizeAndCropToCover');

    realConfig = utils.config;
    mockUtilsConfig = {
      load: function() {
        return Promise.resolve({
          thumbnail: {
            'quality': 0.95
          }
        });
      }
    };

    var assetsNeeded = 0;

    function loadBlob(filename) {
      /*jshint validthis: true */
      assetsNeeded++;

      var req = new XMLHttpRequest();
      var testData = this;
      req.open('GET', '/test/unit/media/' + filename, true);
      req.responseType = 'blob';

      req.onload = function() {
        testData[filename] = req.response;
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }

    // load the images
    Object.keys(imageData).forEach(loadBlob, imageData);
  });

  suiteTeardown(function() {
    window.LazyLoader = realLazyLoader;
    window.ImageUtils = realImageUtils;

    utils.config = realConfig;
  });

  setup(function() {
    spy.reset();
    utils.config = mockUtilsConfig;
  });


  test('should draw the image smaller. Default configuration', function(done) {
    utils.config = {
      load: function() {
        return Promise.reject();
      }
    };

    utils.thumbnailImage(imageData['gaia.png'], function(thumbnail) {
      done(function() {
        assert.isTrue(spy.calledOnce);
        var call = spy.getCall(0);
        assert.equal(call.args[1], 65);
        assert.equal(call.args[2], 65);
        assert.equal(call.args[3], 'image/jpeg');
        assert.equal(call.args[4], 1.0);
      });
    });
  });

  test('should take into account a custom configuration', function(done) {
    utils.thumbnailImage(imageData['gaia.png'], function(thumbnail) {
      done(function() {
        var call = spy.getCall(0);
        assert.equal(call.args[1], 65);
        assert.equal(call.args[2], 65);
        assert.equal(call.args[3], 'image/jpeg');
        assert.equal(call.args[4], 0.95);
      });
    });
  });
});
