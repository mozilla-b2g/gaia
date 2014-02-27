'use strict';

/* global utils */

requireApp('communications/contacts/js/utilities/image_thumbnail.js');

suite('Contacts/utilities/thumbnailImage >', function() {
  var imageData = {
    'gaia.png': null,
    'tiny-gaia.png': null,
    'sadpanda.png': null
  };

  suiteSetup(function(done) {
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

  test('should return the image directly if it\'s small enough',
  function(done) {
    this.timeout(10000);
    utils.thumbnailImage(imageData['tiny-gaia.png'], function(thumbnail) {
      assert.equal(thumbnail, imageData['tiny-gaia.png']);
      done();
    });
  });

  suite('resizing >', function() {
    var drawImageSpy;

    setup(function() {
      var fakeContext = {
        drawImage: function() {}
      };
      drawImageSpy = this.sinon.spy(fakeContext, 'drawImage');
      this.sinon.stub(HTMLCanvasElement.prototype,
                      'getContext').returns(fakeContext);
    });

    test('should draw the image smaller', function(done) {
      this.timeout(20000);
      utils.thumbnailImage(imageData['gaia.png'], function(thumbnail) {
        assert.isTrue(drawImageSpy.calledOnce);
        var call = drawImageSpy.getCall(0);
        assert.equal(call.args[1], 0);
        assert.equal(call.args[2], 0);
        assert.equal(call.args[3], 60);
        assert.equal(call.args[4], 60);
        done();
      });
    });

    test('should keep the apsect ratio', function(done) {
      this.timeout(20000);
      utils.thumbnailImage(imageData['sadpanda.png'], function(thumbnail) {
        assert.isTrue(drawImageSpy.calledOnce);
        var call = drawImageSpy.getCall(0);
        assert.equal(call.args[1], 0);
        assert.equal(call.args[2], 0);
        assert.equal(parseInt(call.args[3]), 60);
        assert.equal(call.args[4], 90);
        done();
      });
    });
  });
});

