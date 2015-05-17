/* global FxaModuleOverlay */
'use strict';

require('/shared/js/utilities.js');

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
    var customL10nId = 'l10nId1';
    FxaModuleOverlay.show(customL10nId);
    var messageContainer = document.querySelector('#fxa-overlay-msg');
    assert.equal(messageContainer.getAttribute('data-l10n-id'), customL10nId);
    assert.ok(overlay.classList.contains('show'));
  });

  test('hide', function() {
    FxaModuleOverlay.hide();
    assert.isFalse(overlay.classList.contains('show'));
  });
});
