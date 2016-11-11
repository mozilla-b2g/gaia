'use strict';

// mark those objects/functions as known global objects/functions so that we
// won't get global leaks error.
mocha.setup({globals: ['addPanAndZoomHandlers', 'MediaFrame',
                       'ConfirmDialog', 'parseJPEGMetadata']});

requireApp('camera/test/unit/mock_media_frame.js');
// we pospone the loading of confirm.js to suiteSetup for mock object wiring.

suite('confirm dialog', function() {
  var mockHTMLNode;
  var originalAddPanZoomHandlers;
  var originalMediaFrame;
  var originalParseJPEGMetadata;
  var addPanAndZoomHandlersCalled = false;

  // create mock html
  function createMockHTML() {
    mockHTMLNode = document.createElement('div');
    mockHTMLNode.innerHTML = '<div id="confirm"/>' +
                             '<div id="confirm-media-frame"/>' +
                             '<button type="button" id="retake-button"/>' +
                             '<button type="button" id="select-button"/>';
    document.body.appendChild(mockHTMLNode);
  }

  // helper to clean up mock objects
  function cleanUpMockObjects(name, value) {
    if (value) {
      window[name] = value;
    } else {
      delete window[name];
    }
  }

  suiteSetup(function(done) {
    // addPanAndZoomHandlers function
    originalAddPanZoomHandlers = window.addPanAndZoomHandlers;
    window.addPanAndZoomHandlers = function() {
      addPanAndZoomHandlersCalled = true;
    };
    // MediaFrame object
    originalMediaFrame = window.MediaFrame;
    window.MediaFrame = MockMediaFrame;
    // parseJPEGMetadata function
    originalParseJPEGMetadata = window.parseJPEGMetadata;
    // we will use sinon to create stub, leaving it empty.
    window.parseJPEGMetadata = function() {};
    createMockHTML();
    requireApp('camera/js/confirm.js', done);
  });

  suiteTeardown(function() {
    cleanUpMockObjects('addPanAndZoomHandlers', originalAddPanZoomHandlers);
    cleanUpMockObjects('MediaFrame', originalMediaFrame);
    cleanUpMockObjects('parseJPEGMetadata', originalParseJPEGMetadata);
    document.body.removeChild(mockHTMLNode);
  });

  suite('API tests', function() {

    var dummyVideoBlob = new Blob(['empty-video'], {'type': 'video/3gpp'});
    var dummyImageBlob = new Blob(['empty-image'], {'type': 'image/jpeg'});
    var dummyPoster = new Blob(['empty-image'], {'type': 'image/jpeg'});

    test('initialize', function() {
      assert.isTrue(addPanAndZoomHandlersCalled);
      assert.isDefined(MockMediaFrame.instances[0]);
      assert.isDefined(ConfirmDialog);
    });

    test('confirmImage, select', function(done) {

      function selectClick() {
        assert.isFalse(ConfirmDialog.isShowing());
        assert.ok('selected is called');
        done();
      }

      function retakeClick() {
        assert.fail('retake should not be called');
        done();
      }

      this.sinon.stub(window, 'parseJPEGMetadata', function(blob, cb) {
        assert.equal(blob, dummyImageBlob);
        cb({width: 100,
            height: 200,
            preview: dummyPoster,
            rotation: 90});
      });

      this.sinon.stub(MockMediaFrame.instances[0], 'displayImage',
                    function(blob, width, height, preview, rotation, mirrored) {

        assert.equal(blob, dummyImageBlob);
        assert.equal(preview, dummyPoster);
        assert.equal(width, 100);
        assert.equal(height, 200);
        assert.equal(rotation, 90);
        assert.isFalse(mirrored);
        assert.isTrue(ConfirmDialog.isShowing());
        document.getElementById('select-button').click();
      });

      ConfirmDialog.confirmImage(dummyImageBlob, selectClick, retakeClick);
    });

    test('confirmVideo, retake', function(done) {

      function selectClick() {
        assert.fail('select should not be called');
        done();
      }

      function retakeClick() {
        assert.isFalse(ConfirmDialog.isShowing());
        assert.ok('retake is called');
        done();
      }

      this.sinon.stub(MockMediaFrame.instances[0], 'displayVideo',
                      function(blob, poster, width, height, rotation) {
        assert.equal(blob, dummyVideoBlob);
        assert.equal(poster, dummyPoster);
        assert.equal(width, 100);
        assert.equal(height, 200);
        assert.equal(rotation, 90);
        assert.isTrue(ConfirmDialog.isShowing());
        document.getElementById('retake-button').click();
      });

      ConfirmDialog.confirmVideo(dummyVideoBlob, dummyPoster, 100, 200, 90,
                                 selectClick, retakeClick);
    });
  });
});
