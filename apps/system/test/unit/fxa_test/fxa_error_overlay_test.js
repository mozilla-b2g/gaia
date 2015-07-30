/* global FxaModuleErrorOverlay */
'use strict';

require('/shared/js/utilities.js');
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
    var customTitleL10nId = 'l10nId1';
    var customTextL10nId = 'l10nId2';
    FxaModuleErrorOverlay.show(customTitleL10nId, customTextL10nId);

    assert.equal(title.getAttribute('data-l10n-id'), customTitleL10nId);
    assert.equal(message.getAttribute('data-l10n-id'), customTextL10nId);
    assert.ok(overlay.classList.contains('show'));
  });

  test('hide', function() {
    FxaModuleErrorOverlay.hide();
    assert.isFalse(overlay.classList.contains('show'));
  });
});
