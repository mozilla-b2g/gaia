'use strict';

requireApp('sms/js/attachment.js');

suite('attachment_test.js', function() {

  setup(function() {
    loadBodyHTML('/index.html');

    this.blob = new Blob(['This is an image message'],
      {type: 'text/plain'});
    this.attachment = new Attachment(
      this.blob,
      'Test Attachment');

    this.originalUpdateInputHeight = ThreadUI.updateInputHeight;
    ThreadUI.updateInputHeight = function() {};
  });
  teardown(function() {
    ThreadUI.updateInputHeight = this.originalUpdateInputHeight;
  });

  test('render', function() {
    var el = this.attachment.render();
    assert.ok(el.src, 'src set');
  });

  test('openOptionsMenu', function() {
    assert.ok(!document.querySelector('#attachment-options'));
    this.attachment.openOptionsMenu();
    assert.ok(document.querySelector('#attachment-options'));
  });

  test('closeOptionsMenu', function() {
    this.attachment.openOptionsMenu();
    assert.ok(document.querySelector('#attachment-options'));
    this.attachment.closeOptionsMenu();
    assert.ok(!document.querySelector('#attachment-options'));
  });

  test('remove', function() {
    // Add the attachment to a mocked container
    var el = this.attachment.render();
    var parent = document.createElement('div');
    parent.appendChild(el);

    // Open options menu, since removing attachment should close menu
    this.attachment.openOptionsMenu();

    // Now you see it
    assert.ok(this.attachment.el);

    this.attachment.remove();

    // Now you don't
    assert.ok(!parent.firstChild);

    // Options menu was closed
    assert.ok(!document.querySelector('#attachment-options'));
  });

});
