'use strict';

requireApp('sms/js/attachment_menu.js');

requireApp('sms/test/unit/mock_attachment.js');
requireApp('sms/test/unit/mock_l10n.js');

var MocksHelperForAttachmentMenu = new MocksHelper([
  'Attachment'
]).init();

suite('attachment_menu_test.js', function() {
  MocksHelperForAttachmentMenu.attachTestHelpers();
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

    this.blob = new Blob(['This is an image message'],
      {type: 'text/plain'});
    this.attachment = new Attachment(
      this.blob,
      'Test Attachment');

  });

  test('open', function() {
    assert.equal(document.querySelector('#attachment-options-menu').className,
      'hide');
    AttachmentMenu.open(this.attachment);
    assert.equal(document.querySelector('#attachment-options-menu').className,
      '');
  });

  test('close', function() {
    AttachmentMenu.open(this.attachment);
    assert.equal(document.querySelector('#attachment-options-menu').className,
      '');
    AttachmentMenu.close();
    assert.equal(document.querySelector('#attachment-options-menu').className,
      'hide');
  });

});
