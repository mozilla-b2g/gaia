/*global MocksHelper, MockL10n, Attachment,
         AttachmentRenderer, MimeMapper, MockMozActivity, Promise, Utils,
         AssetsHelper
*/

'use strict';

require('/views/conversation/js/attachment.js');
require('/js/utils.js');

require('/test/unit/mock_attachment_renderer.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_utils.js');
require('/test/unit/mock_moz_activity.js');
require('/test/unit/mock_mime_mapper.js');

var MocksHelperForAttachment = new MocksHelper([
  'Utils',
  'MozActivity',
  'MimeMapper',
  'AttachmentRenderer'
]).init();

suite('attachment_test.js', function() {
  MocksHelperForAttachment.attachTestHelpers();

  var testImageBlob;

  suiteSetup(function(done) {
    // this sometimes takes longer because we fetch 4 assets via XHR
    this.realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    AssetsHelper.generateImageBlob(1400, 1400, 'image/jpeg', 1).then((blob) => {
      done(() => {
        assert.isTrue(
          blob.size > 300 * 1024,
          'Image blob should be greater than MMS size limit'
        );
        testImageBlob = blob;
      });
    }, done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = this.realMozL10n;
  });

  test('Name property defaults to a string value', function() {
    var attachment = new Attachment(new Blob());
    assert.typeOf(attachment.name, 'string');
  });

  test('correct enumerable properties', function() {
    var expectedProperties = ['name', 'blob', 'isDraft'];
    var attachment = new Attachment(new Blob());
    attachment.render();

    expectedProperties.forEach((prop) => assert.ok(prop in attachment));

    var keys = Object.keys(attachment);
    assert.equal(keys.length, expectedProperties.length);
  });

  suite('render attachment', function() {
    var attachmentRendererMock;

    var attachmentContainer;

    setup(function() {
      attachmentContainer = document.createElement('x-container');
      this.sinon.stub(AttachmentRenderer.prototype, 'getAttachmentContainer');
      AttachmentRenderer.prototype.getAttachmentContainer.returns(
        attachmentContainer
      );

      attachmentRendererMock = new AttachmentRenderer();
      this.sinon.stub(AttachmentRenderer, 'for').returns(
        attachmentRendererMock
      );
    });

    test('returns attachment container', function() {
      var attachment = new Attachment(new Blob(), {
        name: 'Image attachment'
      });

      assert.equal(attachment.render(), attachmentContainer);
    });

    test('calls ready callback in fail and success cases', function(done) {
      var attachmentRendererResult = Promise.resolve();

      this.sinon.stub(attachmentRendererMock, 'render', function() {
        return attachmentRendererResult;
      });

      var attachment = new Attachment(new Blob(), {
        name: 'Image attachment'
      });

      var successfulDeferred = Utils.Promise.defer();
      attachment.render(function() {
        successfulDeferred.resolve();
      });

      attachmentRendererResult = Promise.reject();

      var failedDeferred = Utils.Promise.defer();
      attachment.render(function() {
        failedDeferred.resolve();
      });

      successfulDeferred.promise.then(() => failedDeferred.promise).
        then(done, done);
    });

    test('updateFileSize delegates to the renderer', function() {
      var firstAttachmentRenderer = new AttachmentRenderer();
      AttachmentRenderer.for.onCall(0).returns(
        firstAttachmentRenderer
      );

      this.sinon.spy(AttachmentRenderer.prototype, 'render');
      this.sinon.spy(AttachmentRenderer.prototype, 'updateFileSize');

      var attachment = new Attachment(new Blob());

      attachment.render();
      attachment.updateFileSize();

      sinon.assert.calledOnce(AttachmentRenderer.for);
      sinon.assert.alwaysCalledOn(
        firstAttachmentRenderer.render, firstAttachmentRenderer
      );
      sinon.assert.alwaysCalledOn(
        firstAttachmentRenderer.updateFileSize, firstAttachmentRenderer
      );
    });
  });

  suite('view attachment with open activity', function() {
    setup(function() {
      this.sinon.spy(MimeMapper, 'guessTypeFromFileProperties');
      this.sinon.spy(MimeMapper, 'ensureFilenameMatchesType');
    });

    test('Open normal image attachment', function() {
      var fileName = 'jpeg_image.jpg';
      var attachment = new Attachment(testImageBlob, {
        name: fileName
      });
      var typeSpy = MimeMapper.guessTypeFromFileProperties;
      var matchSpy = MimeMapper.ensureFilenameMatchesType;
      attachment.view();
      assert.ok(typeSpy.calledWith(fileName, 'image/jpeg'));
      assert.ok(matchSpy.calledWith(fileName, typeSpy.returnValues[0]));
      assert.equal(MockMozActivity.calls.length, 1);
    });

    test('Filename has no extension', function() {
      var fileName = 'jpeg_image.jpg';
      var attachment = new Attachment(testImageBlob, {
        name: fileName
      });
      var typeSpy = MimeMapper.guessTypeFromFileProperties;
      var matchSpy = MimeMapper.ensureFilenameMatchesType;
      attachment.view();
      assert.ok(typeSpy.calledWith(fileName, 'image/jpeg'));
      assert.ok(matchSpy.calledWith(fileName, typeSpy.returnValues[0]));
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
        this.sinon.stub(Utils, 'alert').returns(Promise.resolve());

        var attachment = new Attachment(testImageBlob, {
          name: 'jpeg_image.jpg'
        });

        attachment.view();

        activity = window.MozActivity.firstCall.thisValue;
      });

      test('No handler for this image', function() {
        activity.onerror.call({
          error: { name: 'NO_PROVIDER' }
        });
        sinon.assert.calledWith(Utils.alert, 'attachmentOpenError');
      });

      test('Activity is canceled', function() {
        activity.onerror.call({
          error: { name: 'ActivityCanceled' }
        });
        sinon.assert.notCalled(Utils.alert);
      });

      test('Activity is canceled (on some other environment)', function() {
        activity.onerror.call({
          error: { name: 'USER_ABORT' }
        });
        sinon.assert.notCalled(Utils.alert);
      });
    });
  });
});

