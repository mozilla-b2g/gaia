/*global MocksHelper, loadBodyHTML, AttachmentMenu, Attachment */

'use strict';

requireApp('sms/js/attachment_menu.js');

requireApp('sms/test/unit/mock_attachment.js');

var MocksHelperForAttachmentMenu = new MocksHelper([
  'Attachment'
]).init();

suite('attachment_menu_test.js', function() {
  MocksHelperForAttachmentMenu.attachTestHelpers();

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
      AttachmentMenu.header.textContent = '';
      AttachmentMenu.open(this.attachment);
    });
    test('removes hide class', function() {
      assert.isFalse(AttachmentMenu.el.classList.contains('hide'));
    });
    test('sets header text', function() {
      assert.equal(AttachmentMenu.header.textContent, this.attachment.name);
    });
    test('calls focus on main element', function() {
      assert.ok(AttachmentMenu.el.focus.called);
    });

    // generate checks for image, video, audio, and unknown button texts
    ['image', 'video', 'audio', 'other'].forEach(function(type) {
      suite(type, function() {
        setup(function() {
          this.blob = new Blob(['test'],
            { type: type + '/whatever' });
          this.attachment = new Attachment(this.blob, { name: type });
          AttachmentMenu.open(this.attachment);
        });
        test('sets view text', function() {
          assert.equal(
            AttachmentMenu.viewButton.getAttribute('data-l10n-id'),
            'view-attachment-' + type
          );
        });
        test('sets remove text', function() {
          assert.equal(
            AttachmentMenu.removeButton.getAttribute('data-l10n-id'),
            'remove-attachment-' + type
          );
        });
        test('sets replace text', function() {
          assert.equal(
            AttachmentMenu.replaceButton.getAttribute('data-l10n-id'),
            'replace-attachment-' + type
          );
        });
      });
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
