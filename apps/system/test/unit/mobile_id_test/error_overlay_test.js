'use strict';
/* global MobileIDErrorOverlay */

require('/shared/js/utilities.js');
requireApp('system/mobile_id/js/error_overlay.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('MobileID Error Overlay', function() {
  var overlay, title, message;
  suiteSetup(function() {
    loadBodyHTML('/mobile_id/index.html');
    overlay = document.querySelector('#mobileid-error-overlay');
    title = document.querySelector('#mobileid-error-title');
    message = document.querySelector('#mobileid-error-msg');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    overlay = null;
    title = null;
    message = null;
  });

  test('show', function() {
    var customTitle = 'LOREM IPSUM';
    var customText = 'Lorem ipsum...';
    MobileIDErrorOverlay.show(customTitle, customText);

    assert.equal(title.textContent, customTitle);
    assert.equal(message.textContent, customText);
    assert.ok(overlay.classList.contains('show'));
  });

  test('hide', function() {
    MobileIDErrorOverlay.hide();
    assert.isFalse(overlay.classList.contains('show'));
  });
});
