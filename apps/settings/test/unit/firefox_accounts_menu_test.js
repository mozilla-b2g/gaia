/* globals FxaMenu, loadBodyHTML, MockFxAccountsIACHelper, MockL10n */

'use strict';

// require helpers for managing html
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

// mocks and globals
require('mock_fx_accounts_iac_helper.js');
require('/shared/js/text_normalizer.js');
require('/shared/test/unit/mocks/mock_l10n.js');

// source the code we care about
requireApp('settings/js/firefox_accounts/menu.js');

suite('firefox accounts menu item > ', function() {
  var suiteSandbox = sinon.sandbox.create(),
    fxaDescEl,
    setAttributesSpy,
    realL10n;

  suiteSetup(function() {
    // attach mock html to page, so it inits without complaint
    loadBodyHTML('./_root.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    suiteSandbox.restore();
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  setup(function() {
    setAttributesSpy = sinon.spy(navigator.mozL10n, 'setAttributes');
    fxaDescEl = document.getElementById('fxa-desc');
  });

  teardown(function() {
    MockFxAccountsIACHelper.resetListeners();
    navigator.mozL10n.setAttributes.restore();
  });

  test('check the html loaded correctly', function() {
    assert.isNotNull(fxaDescEl, 'failed to load settings page html');
  });

  test('show the correct status on FxaMenu init', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'init@ialization.com',
      verified: true
    });
    // init app code
    FxaMenu.init(MockFxAccountsIACHelper);
    // test setAttributes was called with correct args
    assert.deepEqual(setAttributesSpy.args[0], [
      fxaDescEl,
      'fxa-logged-in-text',
      { email: 'init@ialization.com' }
    ]);
  });

  test('show the correct status after onlogout event', function() {
    MockFxAccountsIACHelper.setCurrentState(null);
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.equal(fxaDescEl.getAttribute('data-l10n-id'), 'fxa-invitation');
  });

  test('show the correct status after onlogin event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@log.in',
      verified: false
    });
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogin');
    assert.deepEqual(setAttributesSpy.args[0], [
      fxaDescEl,
      'fxa-confirm-email',
      { email: 'on@log.in' }
    ]);
  });

  test('show the correct status after onverified event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@verifiedlog.in',
      verified: true
    });
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onverified');
    assert.deepEqual(setAttributesSpy.args[0], [
      fxaDescEl,
      'fxa-logged-in-text',
      { email: 'on@verifiedlog.in' }
    ]);
  });
});
