/*global MocksHelper, MockL10n, loadBodyHTML, Attachment, AttachmentRenderer,
         AssetsHelper,
         ImageUtils,
         Promise
*/

'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/attachment_renderer.js');
requireApp('sms/js/utils.js');

require('/shared/js/image_utils.js');
require('/shared/test/unit/mocks/mock_l10n.js');
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
    assert.include(thumbnail.style.backgroundImage, 'blob:');
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

    var blobPromises = [
      AssetsHelper.generateImageBlob(300, 300, 'image/jpeg', 0.25).then(
        (blob) => testImageBlob_small = blob
      ),
      AssetsHelper.generateImageBlob(1400, 1400, 'image/jpeg', 1).then(
        (blob) => testImageBlob = blob
      ),
      AssetsHelper.loadFileBlob('/test/unit/media/audio.oga').then(
        (blob) => testAudioBlob = blob
      ),
      AssetsHelper.loadFileBlob('/test/unit/media/video.ogv').then(
        (blob) => testVideoBlob = blob
      )
    ];

    Promise.all(blobPromises).then(() => {
      done(() => {
        var mmsSizeLimit = 300 * 1024;

        assert.isTrue(
          testImageBlob_small.size < mmsSizeLimit,
          'Image blob should be greater than MMS size limit'
        );

        assert.isTrue(
          testImageBlob.size > mmsSizeLimit,
          'Image blob should be greater than MMS size limit'
        );
      });
    }, done);
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
        // image < message limit => thumbnail blob
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
        // image < message limit => thumbnail blob
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

    setup(function() {
      this.sinon.stub(ImageUtils, 'getSizeAndType');
      this.sinon.spy(ImageUtils.Downsample, 'sizeNoMoreThan');
    });

    test('Use ImageUtils for no resize case', function(done) {
      var attachmentRenderer = AttachmentRenderer.for(new Attachment(
        testImageBlob, {
          name: 'auto_generated'
        }
      ));

      ImageUtils.getSizeAndType.returns(
        Promise.resolve({
          width: 100,
          height: 100
        })
      );

      attachmentRenderer.getThumbnail().then(function(url) {
        assert.include(url, 'blob:');
        assert.equal(url.indexOf('#-moz-samplesize='), -1);
        sinon.assert.calledWith(
          ImageUtils.Downsample.sizeNoMoreThan,
          sinon.match.number
        );
      }).then(done, done);
    });

    test('Use ImageUtils for resize needed case', function(done) {
      var attachmentRenderer = AttachmentRenderer.for(new Attachment(
        testImageBlob, {
          name: 'auto_generated'
        }
      ));

      ImageUtils.getSizeAndType.returns(
        Promise.resolve({
          width: 300,
          height: 300
        })
      );

      attachmentRenderer.getThumbnail().then(function(url) {
        assert.include(url, 'blob:');
        assert.include(url, '#-moz-samplesize=');
        sinon.assert.calledWith(ImageUtils.Downsample.sizeNoMoreThan,
                                sinon.match.number);
      }).then(done, done);
    });

    test('throw error if image is corrupted', function(done) {
      var attachmentRenderer = AttachmentRenderer.for(
        new Attachment(testImageBlob_bogus, {
          name: 'auto_generated'
        })
      );
      var imgError = 'image error';

      ImageUtils.getSizeAndType.returns(
        Promise.reject(imgError)
      );

      attachmentRenderer.getThumbnail().catch(function(error) {
        sinon.assert.calledWith(ImageUtils.getSizeAndType, testImageBlob_bogus);
        assert.equal(imgError, error);
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
