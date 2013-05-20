'use strict';

requireApp('sms/js/attachment.js');
requireApp('sms/js/attachment_menu.js');

suite('attachment_menu_test.js', function() {

  setup(function() {
    loadBodyHTML('/index.html');
    AttachmentMenu.init('attachment-options-menu');

    this.blob = new Blob(['This is an image message'],
      {type: 'text/plain'});
    this.attachment = new Attachment(
      this.blob,
      'Test Attachment');

  });

  teardown(function() {

  });

  test('open', function() {
    assert.equal(document.querySelector('#attachment-options-menu').className, 'hide');
    AttachmentMenu.open(this.attachment);
    assert.equal(document.querySelector('#attachment-options-menu').className, '');
  });

  test('close', function() {
    AttachmentMenu.open(this.attachment);
    assert.equal(document.querySelector('#attachment-options-menu').className, '');
    AttachmentMenu.close();
    assert.equal(document.querySelector('#attachment-options-menu').className, 'hide');
  });

});
