'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/utils.js');

requireApp('sms/test/unit/mock_attachment_menu.js');
requireApp('sms/test/unit/mock_l10n.js');
requireApp('sms/test/unit/mock_utils.js');

var MocksHelperForAttachment = new MocksHelper([
  'AttachmentMenu',
  'Utils'
]).init();

suite('attachment_test.js', function() {
  MocksHelperForAttachment.attachTestHelpers();

  suiteSetup(function() {
    this.realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });
  suiteTeardown(function() {
    navigator.mozL10n = this.realMozL10n;
  });

  setup(function() {
    loadBodyHTML('/index.html');
    AttachmentMenu.init('attachment-options-menu');

    this.blob = new Blob(['This is an image message'], {
      type: 'image/jpeg'
    });
    this.attachment = new Attachment(this.blob, {
      name: 'Test Attachment'
    });

  });

  test('Name property defaults to a string value', function() {
    var attachment = new Attachment(new Blob());

    assert.typeOf(attachment.name, 'string');
  });

  test('render', function() {
    var el = this.attachment.render();
    assert.ok(el.src, 'src set');
    assert.include(el.classList, 'attachment');
    assert.equal(el.dataset.attachmentType, 'img');
  });

});
