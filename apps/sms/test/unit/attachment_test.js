/*global MocksHelper, MockL10n, loadBodyHTML, Attachment, AttachmentMenu,
         MimeMapper, MockMozActivity */

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
    this.timeout(5000);
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
      testImageBlob_small = blob; // image < 300 kB => create thumbnail
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
  });
});

