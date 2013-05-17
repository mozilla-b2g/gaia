'use strict';

requireApp('sms/js/attachment.js');

suite('attachment_test.js', function() {

  setup(function() {
    loadBodyHTML('/index.html');
    this.attachment = new Attachment(
      new Blob(['This is an image message'],
               { type: 'text/plain' },
      'Test Attachment'));
  });
  teardown(function() {

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

  test('view', function() {
    // TODO
  });

  test('remove', function() {
    var el = this.attachment.render();
    var parent = document.createElement('div');
    // TODO
    //parent.appendChild(el);
    //assert.ok(this.attachment.el);
    //this.attachment.remove();
    //assert.ok(!this.attachment.el);
  });

  test('replace', function() {
    // TODO
  });

});
