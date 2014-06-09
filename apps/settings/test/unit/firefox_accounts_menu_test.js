/* globals FxaMenu, loadBodyHTML, MockFxAccountsIACHelper, MockL10n */

'use strict';

// require helpers for managing html
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

// mocks and globals
require('mock_fx_accounts_iac_helper.js');
require('/shared/js/text_normalizer.js');
requireApp('settings/test/unit/mock_l10n.js');

// source the code we care about
requireApp('settings/js/firefox_accounts/menu.js');

suite('firefox accounts menu item > ', function() {
  var suiteSandbox = sinon.sandbox.create(),
    fxaDescEl,
    localizeSpy,
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
    localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
    fxaDescEl = document.getElementById('fxa-desc');
  });

  teardown(function() {
    MockFxAccountsIACHelper.resetListeners();
    navigator.mozL10n.localize.restore();
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
    // test localize was called with correct args
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-logged-in-text',
      { email: 'init@ialization.com' }
    ]);
  });

  test('show the correct status after onlogout event', function() {
    MockFxAccountsIACHelper.setCurrentState(null);
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-invitation'
    ]);
  });

  test('show the correct status after onlogin event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@log.in',
      verified: false
    });
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogin');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-confirm-email',
      { email: 'on@log.in' }
    ]);
  });

  test('show the correct status after onverifiedlogin event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@verifiedlog.in',
      verified: true
    });
    FxaMenu.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onverifiedlogin');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-logged-in-text',
      { email: 'on@verifiedlog.in' }
    ]);
  });
});
