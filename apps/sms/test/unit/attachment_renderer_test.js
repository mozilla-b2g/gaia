/*global MocksHelper, MockL10n, loadBodyHTML, Attachment, AttachmentRenderer,
         Promise, Utils */

'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/attachment_renderer.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');

var MocksHelperForAttachment = new MocksHelper([
  'Utils'
]).init();

suite('AttachmentRenderer >', function() {
  MocksHelperForAttachment.attachTestHelpers();

  var testImageBlob;
  var testImageBlob_small;
  var testImageBlob_bogus;
  var testAudioBlob;
  var testVideoBlob;

  function assertThumbnailPreview(el) {
    assert.ok(el.classList.contains('preview'));
    assert.isFalse(el.classList.contains('nopreview'));
    assert.isNull(el.querySelector('div.placeholder'));
    var thumbnail = el.querySelector('div.thumbnail');
    assert.ok(thumbnail);
    assert.include(thumbnail.style.backgroundImage, 'data:image');
  }

  function assertThumbnailPlaceholder(el, type) {
    assert.ok(el.classList.contains('nopreview'));
    assert.isFalse(el.classList.contains('preview'));
    assert.isNull(el.querySelector('div.thumbnail'));
    var placeholder = el.querySelector('div.thumbnail-placeholder');
    assert.ok(placeholder);
    assert.ok(placeholder.classList.contains(type + '-placeholder'));
  }

  suiteSetup(function(done) {
    this.realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // create a bogus image blob (should be rendered with a `corrupted' class)
    testImageBlob_bogus = new Blob(['This is an image message'], {
      type: 'image/jpeg'
    });

    // create sample blobs from real files: image, audio, video
    var assetsNeeded = 0;
    function getAsset(filename, loadCallback) {
      assetsNeeded++;
      var req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'blob';
      req.onload = function() {
        loadCallback(req.response);
        if (--assetsNeeded === 0) {
          done();
        }
      };
      req.send();
    }
    getAsset('/test/unit/media/kitten-450.jpg', function(blob) {
      testImageBlob_small = blob; // image < 295 kB => create thumbnail
    });
    getAsset('/test/unit/media/IMG_0554.jpg', function(blob) {
      testImageBlob = blob;
    });
    getAsset('/test/unit/media/audio.oga', function(blob) {
      testAudioBlob = blob;
    });
    getAsset('/test/unit/media/video.ogv', function(blob) {
      testVideoBlob = blob;
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = this.realMozL10n;
  });

  setup(function() {
    loadBodyHTML('/index.html');
  });

  teardown(function() {
    document.body.textContent = '';
  });

  suite('render >', function() {
    test('bogus image attachment', function(done) {
      var attachment = new Attachment(testImageBlob_bogus, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'img');
        // broken image => no thumbnail and `corrupted' class
        assertThumbnailPlaceholder(attachmentContainer, 'img');
        assert.ok(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    test('encodes thumbnail URL', function(done) {
      this.sinon.spy(window, 'encodeURI');

      var attachment = new Attachment(testImageBlob_small, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment);

      // Loading thumbnail in parallel only to verify later that render method
      // actually encodes exact the same thumbnail URL.
      Promise.all([
        attachmentRenderer.getThumbnail(),
        attachmentRenderer.render()
      ]).then((results) => {
        sinon.assert.calledWith(encodeURI, results[0].dataUrl);
      }).then(done, done);
    });

    test('small image attachment (thumbnail)', function(done) {
      var attachment = new Attachment(testImageBlob_small, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'img');
        // image < message limit => dataURL thumbnail
        assertThumbnailPreview(attachmentContainer);
        assert.isNull(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    test('HUGE (fake) image attachment', function(done) {
      var attachment = new Attachment({
        size: 3 * 1024 * 1024,
        type: 'image/jpeg'
      }, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'img');
        // image > message limit => no thumbnail preview
        assertThumbnailPlaceholder(attachmentContainer, 'img');
        assert.isNull(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    test('big image attachment', function(done) {
      var attachment = new Attachment(testImageBlob, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'img');
        // image < message limit => dataURL thumbnail
        assertThumbnailPreview(attachmentContainer);
        assert.isNull(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    test('audio attachment', function(done) {
      var attachment = new Attachment(testAudioBlob, {
        name: 'Audio attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'audio');
        // not an image => no thumbnail preview
        assertThumbnailPlaceholder(attachmentContainer, 'audio');
        assert.isNull(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    test('video attachment', function(done) {
      var attachment = new Attachment(testVideoBlob, {
        name: 'Video attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment),
          attachmentContainer = attachmentRenderer.getAttachmentContainer();

      attachmentRenderer.render().then(() => {
        assert.ok(
          attachmentContainer.classList.contains('attachment-container')
        );
        assert.equal(attachmentContainer.dataset.attachmentType, 'video');
        // not an image => no thumbnail preview
        assertThumbnailPlaceholder(attachmentContainer, 'video');
        assert.isNull(attachmentContainer.querySelector('div.corrupted'));
      }).then(done, done);
    });

    suite('draft image attachments', function() {
      function testDraftImage(testName, attachmentName) {
        test(testName + ' attachment', function(done) {
          var attachment = new Attachment(testImageBlob, {
            name: attachmentName,
            isDraft: true
          });

          var attachmentRenderer = AttachmentRenderer.for(attachment),
              attachmentContainer = attachmentRenderer.getAttachmentContainer();

          attachmentRenderer.render().then(() => {
            assert.equal(attachmentContainer.tagName, 'IFRAME');
            var doc = attachmentContainer.contentDocument;
            var attachmentNode = doc.querySelector('.attachment');
            assert.ok(attachmentNode);
            assert.isNull(attachmentNode.querySelector('div.corrupted'));
            assert.ok(attachmentNode.querySelector('.thumbnail'));
            var fileNameNode = doc.querySelector('.file-name');
            assert.ok(fileNameNode);
            assert.isNull(fileNameNode.firstElementChild);
            assert.equal(fileNameNode.textContent, attachment.name);
          }).then(done, done);

          document.body.appendChild(attachmentContainer);
        });
      }

      testDraftImage('normal', 'Image attachment');
      testDraftImage(
        'malicious script',
        '%3Cscript%3Ealert(%22I%20am%20dangerous%22)%3C%2Fscript%3E'
      );
      testDraftImage(
        'malicious image',
        '%3Cimg%20src%3D%22http%3A%2F%2Fmalicious.server.ru%2Fpingback%22%3E'
      );
    });
  });

  suite('getThumbnail >', function() {
    // Taken from attachment.js
    var MIN_THUMBNAIL_DIMENSION = 80;
    var MAX_THUMBNAIL_DIMENSION = 120;

    var getCustomImageBlob = function(width, height) {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      context.fillStyle = 'rgb(255, 0, 0)';
      context.fillRect (0, 0, width, height);

      return new Promise(function(resolve) {
        canvas.toBlob(function(blob) {
          resolve(blob);
        }, 'image/jpeg');
      });
    };

    setup(function() {
      this.sinon.spy(CanvasRenderingContext2D.prototype, 'drawImage');
    });

    test('1:1 ratio image with both dimensions less than MIN', function(done) {
      var width = MIN_THUMBNAIL_DIMENSION / 2,
          height = MIN_THUMBNAIL_DIMENSION / 2;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.height
          );
        });
      }).then(done, done);
    });

    test('1:1 ratio image with both dimensions greater than MAX',
      function(done) {
      var width = MAX_THUMBNAIL_DIMENSION * 2,
          height = MAX_THUMBNAIL_DIMENSION * 2;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.height
          );
        });
      }).then(done, done);
    });

    test('2:1 ratio image', function(done) {
      var aspectRatio = 2,
          width = MIN_THUMBNAIL_DIMENSION,
          height = MIN_THUMBNAIL_DIMENSION / aspectRatio;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MAX_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.width / aspectRatio
          );
        });
      }).then(done, done);
    });

    test('1.4:1 ratio image', function(done) {
      var aspectRatio = 1.4,
          width = MAX_THUMBNAIL_DIMENSION * aspectRatio,
          height = MAX_THUMBNAIL_DIMENSION;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION * aspectRatio);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.width / aspectRatio
          );
        });
      }).then(done, done);
    });

    test('1:2 ratio image', function(done) {
      var aspectRatio = 2,
          width = MIN_THUMBNAIL_DIMENSION / aspectRatio,
          height = MIN_THUMBNAIL_DIMENSION;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MAX_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.height / aspectRatio, thumbnail.height
          );
        });
      }).then(done, done);
    });

    test('1:1.4 ratio image', function(done) {
      var aspectRatio = 1.4,
          width = MAX_THUMBNAIL_DIMENSION,
          height = MAX_THUMBNAIL_DIMENSION * aspectRatio;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.dataUrl.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION * aspectRatio);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.height / aspectRatio, thumbnail.height
          );
        });
      }).then(done, done);
    });

    test('reset to MIN values if failed', function(done) {
      var width = MAX_THUMBNAIL_DIMENSION,
          height = MAX_THUMBNAIL_DIMENSION;

      this.sinon.stub(Utils, 'getDownsamplingSrcUrl', function() {
        return null;
      });

      getCustomImageBlob(width, height).then(function(blob) {
        var attachmentRenderer = AttachmentRenderer.for(new Attachment(blob, {
          name: 'auto_generated'
        }));

        attachmentRenderer.getThumbnail().then(function(thumbnail) {
          assert.isTrue(thumbnail.error);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.notCalled(CanvasRenderingContext2D.prototype.drawImage);
        });
      }).then(done, done);
    });
  });

  suite('getAttachmentContainer >', function() {
    test('uses only one container per attachment renderer', function() {
      var attachment = new Attachment(testImageBlob_bogus, {
        name: 'Image attachment'
      });

      var attachmentRenderer1 = AttachmentRenderer.for(attachment),
          attachmentRenderer2 = AttachmentRenderer.for(attachment);

      var attachmentContainer1 = attachmentRenderer1.getAttachmentContainer(),
          attachmentContainer2 = attachmentRenderer2.getAttachmentContainer();

      assert.isNotNull(attachmentContainer1);
      assert.isNotNull(attachmentContainer2);

      assert.notEqual(attachmentContainer1, attachmentContainer2);

      var theSameAttachmentContainer1 =
        attachmentRenderer1.getAttachmentContainer();
      var theSameAttachmentContainer2 =
        attachmentRenderer2.getAttachmentContainer();

      assert.equal(attachmentContainer1, theSameAttachmentContainer1);
      assert.equal(attachmentContainer2, theSameAttachmentContainer2);
    });

    test('returns correct container for non-draft attachment', function() {
      var attachment = new Attachment(testImageBlob_bogus, {
        name: 'Image attachment'
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment);

      var attachmentContainer = attachmentRenderer.getAttachmentContainer();

      assert.isNotNull(attachmentContainer);
      assert.equal(attachmentContainer.nodeName.toLowerCase(), 'div');
      assert.isTrue(
        attachmentContainer.classList.contains('attachment-container')
      );
      assert.equal(attachmentContainer.dataset.attachmentType, attachment.type);
    });

    test('returns correct container for draft attachment', function() {
      var attachment = new Attachment(testImageBlob_bogus, {
        name: 'Image attachment',
        isDraft: true
      });

      var attachmentRenderer = AttachmentRenderer.for(attachment);

      var attachmentContainer = attachmentRenderer.getAttachmentContainer();

      assert.isNotNull(attachmentContainer);
      assert.equal(attachmentContainer.nodeName.toLowerCase(), 'iframe');
      assert.isTrue(
        attachmentContainer.classList.contains('attachment-container')
      );
      assert.equal(attachmentContainer.dataset.attachmentType, attachment.type);
      assert.equal(
        attachmentContainer.getAttribute('sandbox'),
        'allow-same-origin'
      );
    });
  });
});
