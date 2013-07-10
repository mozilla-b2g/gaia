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
      {type: 'image/jpeg'});
    this.attachment = new Attachment(this.blob, {
      name: 'Test.jpg'
    });

  });

  suite('open', function() {
    setup(function() {
      this.sinon.stub(AttachmentMenu.el, 'focus');

      document.querySelector('#attachment-options-menu').className = 'hide';
      // clear out a bunch of fields to make sure open uses localization
      AttachmentMenu.viewButton.textContent = '';
      AttachmentMenu.replaceButton.textContent = '';
      AttachmentMenu.removeButton.textContent = '';
      AttachmentMenu.cancelButton.textContent = '';
      AttachmentMenu.header.textContent = '';

      AttachmentMenu.open(this.attachment);
    });
    test('removes hide class', function() {
      assert.isFalse(AttachmentMenu.el.classList.contains('hide'));
    });
    test('sets header text', function() {
      assert.equal(AttachmentMenu.header.textContent, this.attachment.name);
    });
    test('sets view text', function() {
      assert.equal(AttachmentMenu.viewButton.textContent, 'view-attachment');
    });
    test('sets remove text', function() {
      assert.equal(AttachmentMenu.removeButton.textContent,
        'remove-attachment{"type":"attachment-type-image"}');
    });
    test('sets replace text', function() {
      assert.equal(AttachmentMenu.replaceButton.textContent,
        'replace-attachment{"type":"attachment-type-image"}');
    });
    test('sets cancel text', function() {
      assert.equal(AttachmentMenu.cancelButton.textContent, 'cancel');
    });
    test('calls focus on main element', function() {
      assert.ok(AttachmentMenu.el.focus.called);
    });
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
