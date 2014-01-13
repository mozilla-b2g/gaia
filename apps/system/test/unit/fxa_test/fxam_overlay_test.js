'use strict';

requireApp('system/fxa/js/utils.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_overlay.js');
require('/shared/test/unit/load_body_html_helper.js');

suite('FxA Module overlay', function() {
  var overlay;
  suiteSetup(function() {
    loadBodyHTML('/fxa/fxa_module.html');
    overlay = document.querySelector('#fxa-overlay');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
    overlay = null;
  });

  test('show', function() {
    var customText = 'Lorem ipsum...';
    FxaModuleOverlay.show(customText);
    var messageContainer = document.querySelector('#fxa-overlay-msg');
    assert.equal(messageContainer.textContent, customText);
    assert.ok(overlay.classList.contains('show'));
  });

  test('hide', function() {
    FxaModuleOverlay.hide();
    assert.isFalse(overlay.classList.contains('show'));
  });
});
