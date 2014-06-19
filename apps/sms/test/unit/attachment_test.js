/*global MocksHelper, MockL10n, loadBodyHTML, Attachment, AttachmentMenu,
         MimeMapper, MockMozActivity, Promise, Utils */

'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');
requireApp('sms/test/unit/mock_moz_activity.js');
requireApp('sms/test/unit/mock_mime_mapper.js');

var MocksHelperForAttachment = new MocksHelper([
  'AttachmentMenu',
  'Utils',
  'MozActivity',
  'MimeMapper'
]).init();

suite('attachment_test.js', function() {
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
    // this sometimes takes longer because we fetch 4 assets via XHR
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
    AttachmentMenu.init('attachment-options-menu');
  });

  teardown(function() {
    document.body.textContent = '';
  });

  test('Name property defaults to a string value', function() {
    var attachment = new Attachment(new Blob());
    assert.typeOf(attachment.name, 'string');
  });

  test('render bogus image attachment', function(done) {
    var attachment = new Attachment(testImageBlob_bogus, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'img');
      // broken image => no thumbnail and `corrupted' class
      assertThumbnailPlaceholder(el, 'img');
      assert.ok(el.querySelector('div.corrupted'));
      done();
    });
  });

  test('render small image attachment (thumbnail)', function(done) {
    var attachment = new Attachment(testImageBlob_small, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'img');
      // image < message limit => dataURL thumbnail
      assertThumbnailPreview(el);
      assert.isNull(el.querySelector('div.corrupted'));
      done();
    });
  });

  test('render HUGE (fake) image attachment', function(done) {
    var attachment = new Attachment({
      size: 3 * 1024 * 1024,
      type: 'image/jpeg'
    }, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'img');
      // image > message limit => no thumbnail preview
      assertThumbnailPlaceholder(el, 'img');
      assert.isNull(el.querySelector('div.corrupted'));
      done();
    });
  });

  test('render big image attachment', function(done) {
    var attachment = new Attachment(testImageBlob, {
      name: 'Image attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'img');
      // image < message limit => dataURL thumbnail
      assertThumbnailPreview(el);
      assert.isNull(el.querySelector('div.corrupted'));
      done();
    });
  });

  test('render audio attachment', function(done) {
    var attachment = new Attachment(testAudioBlob, {
      name: 'Audio attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'audio');
      // not an image => no thumbnail preview
      assertThumbnailPlaceholder(el, 'audio');
      assert.isNull(el.querySelector('div.corrupted'));
      done();
    });
  });

  test('render video attachment', function(done) {
    var attachment = new Attachment(testVideoBlob, {
      name: 'Video attachment'
    });
    var el = attachment.render(function() {
      assert.ok(el.classList.contains('attachment-container'));
      assert.equal(el.dataset.attachmentType, 'video');
      // not an image => no thumbnail preview
      assertThumbnailPlaceholder(el, 'video');
      assert.isNull(el.querySelector('div.corrupted'));
      done();
    });
  });

  suite('preparing thumbnail for various image sizes', function() {
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
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.height
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('1:1 ratio image with both dimensions greater than MAX',
      function(done) {
      var width = MAX_THUMBNAIL_DIMENSION * 2,
          height = MAX_THUMBNAIL_DIMENSION * 2;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.height
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('2:1 ratio image', function(done) {
      var aspectRatio = 2,
          width = MIN_THUMBNAIL_DIMENSION,
          height = MIN_THUMBNAIL_DIMENSION / aspectRatio;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MAX_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.width / aspectRatio
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('1.4:1 ratio image', function(done) {
      var aspectRatio = 1.4,
          width = MAX_THUMBNAIL_DIMENSION * aspectRatio,
          height = MAX_THUMBNAIL_DIMENSION;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION * aspectRatio);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.width, thumbnail.width / aspectRatio
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('1:2 ratio image', function(done) {
      var aspectRatio = 2,
          width = MIN_THUMBNAIL_DIMENSION / aspectRatio,
          height = MIN_THUMBNAIL_DIMENSION;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MAX_THUMBNAIL_DIMENSION);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.height / aspectRatio, thumbnail.height
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('1:1.4 ratio image', function(done) {
      var aspectRatio = 1.4,
          width = MAX_THUMBNAIL_DIMENSION,
          height = MAX_THUMBNAIL_DIMENSION * aspectRatio;

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.data.length > 0);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION * aspectRatio);

          sinon.assert.calledWith(
            CanvasRenderingContext2D.prototype.drawImage,
            sinon.match.instanceOf(Image),
            0, 0, thumbnail.height / aspectRatio, thumbnail.height
          );

          done();
        }.bind(this));
      }.bind(this));
    });

    test('reset to MIN values if failed', function(done) {
      var width = MAX_THUMBNAIL_DIMENSION,
          height = MAX_THUMBNAIL_DIMENSION;

      this.sinon.stub(Utils, 'getDownsamplingSrcUrl', function() {
        return null;
      });

      getCustomImageBlob(width, height).then(function(blob) {
        var attachment = new Attachment(blob, {
          name: 'auto_generated'
        });

        attachment.getThumbnail(function(thumbnail) {
          assert.isTrue(thumbnail.error);
          assert.equal(thumbnail.width, MIN_THUMBNAIL_DIMENSION);
          assert.equal(thumbnail.height, MIN_THUMBNAIL_DIMENSION);

          sinon.assert.notCalled(CanvasRenderingContext2D.prototype.drawImage);

          done();
        }.bind(this));
      }.bind(this));
    });
  });

  suite('render draft image attachments', function() {
    function testDraftImage(testName, attachmentName) {
      test(testName + ' attachment', function(done) {
        var attachment = new Attachment(testImageBlob, {
          name: attachmentName,
          isDraft: true
        });

        var el = attachment.render(function() {
          assert.equal(el.tagName, 'IFRAME');
          el.addEventListener('load', function onload() {
            done(function() {
              var doc = el.contentDocument;
              var attachmentNode = doc.querySelector('.attachment');
              assert.ok(attachmentNode);
              assert.isNull(attachmentNode.querySelector('div.corrupted'));
              assert.ok(attachmentNode.querySelector('.thumbnail'));
              var fileNameNode = doc.querySelector('.file-name');
              assert.ok(fileNameNode);
              assert.isNull(fileNameNode.firstElementChild);
              assert.equal(fileNameNode.textContent, attachment.name);
            });
          });

          document.body.appendChild(el);
        });
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


  suite('view attachment with open activity', function() {
    setup(function() {
      this.sinon.spy(MimeMapper, 'guessTypeFromFileProperties');
      this.sinon.spy(MimeMapper, 'ensureFilenameMatchesType');
    });

    test('Open normal image attachment', function() {
      var attachment = new Attachment(testImageBlob, {
        name: 'IMG_0554.jpg'
      });
      var typeSpy = MimeMapper.guessTypeFromFileProperties;
      var matchSpy = MimeMapper.ensureFilenameMatchesType;
      attachment.view();
      assert.ok(typeSpy.calledWith('IMG_0554.jpg', 'image/jpeg'));
      assert.ok(matchSpy.calledWith('IMG_0554.jpg', typeSpy.returnValues[0]));
      assert.equal(MockMozActivity.calls.length, 1);
    });

    test('Filename has no extension', function() {
      var attachment = new Attachment(testImageBlob, {
        name: 'IMG_0554'
      });
      var typeSpy = MimeMapper.guessTypeFromFileProperties;
      var matchSpy = MimeMapper.ensureFilenameMatchesType;
      attachment.view();
      assert.ok(typeSpy.calledWith('IMG_0554', 'image/jpeg'));
      assert.ok(matchSpy.calledWith('IMG_0554', typeSpy.returnValues[0]));
      assert.equal(MockMozActivity.calls.length, 1);
    });

    test('Filename is overridden using single attachment folder', function() {
      var attachment1 = new Attachment(testImageBlob, {
        name: '/some_path/.hidden_folder/attachment1.jpg'
      });

      attachment1.view();

      assert.equal(MockMozActivity.calls.length, 1);
      assert.equal(
        MockMozActivity.calls[0].data.filename,
        'sms-attachments/attachment1.jpg'
      );

      var attachment2 = new Attachment(testImageBlob, {
        name: 'attachment2.jpg'
      });

      attachment2.view();

      assert.equal(MockMozActivity.calls.length, 2);
      assert.equal(
        MockMozActivity.calls[1].data.filename,
        'sms-attachments/attachment2.jpg'
      );

    });

    suite('Activity errors >', function() {
      var activity;
      setup(function() {
        this.sinon.spy(window, 'MozActivity');
        this.sinon.stub(window, 'alert');

        var attachment = new Attachment(testImageBlob, {
          name: 'IMG_0554.jpg'
        });

        attachment.view();

        activity = window.MozActivity.firstCall.thisValue;
      });

      test('No handler for this image', function() {
        activity.onerror.call({
          error: { name: 'NO_PROVIDER' }
        });
        sinon.assert.calledWith(window.alert, 'attachmentOpenError');
      });

      test('Activity is canceled', function() {
        activity.onerror.call({
          error: { name: 'ActivityCanceled' }
        });
        sinon.assert.notCalled(window.alert);
      });

      test('Activity is canceled (on some other environment)', function() {
        activity.onerror.call({
          error: { name: 'USER_ABORT' }
        });
        sinon.assert.notCalled(window.alert);
      });

    });
  });
});

