'use strict';

requireApp('system/fxa/js/utils.js');
requireApp('system/fxa/js/fxam_error_overlay.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('FxA Module Error Overlay', function() {
  var overlay, title, message;
  suiteSetup(function() {
    loadBodyHTML('/fxa/fxa_module.html');
    overlay = document.querySelector('#fxa-error-overlay');
    title = document.querySelector('#fxa-error-title');
    message = document.querySelector('#fxa-error-msg');
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
    FxaModuleErrorOverlay.show(customTitle, customText);

    assert.equal(title.textContent, customTitle);
    assert.equal(message.textContent, customText);
    assert.ok(overlay.classList.contains('show'));
  });

  test('hide', function() {
    FxaModuleErrorOverlay.hide();
    assert.isFalse(overlay.classList.contains('show'));
  });
});
