/* globals FxaMenu, loadBodyHTML, MockFxAccountsIACHelper, MockL10n */

'use strict';

mocha.globals([
  'FxaMenu',
  'loadBodyHTML',
  'MockFxAccountsIACHelper',
  'MockL10n'
]);

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
    realL10n;

  suiteSetup(function() {
    // attach mock html to page, so it inits without complaint
    loadBodyHTML('/index.html');
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    suiteSandbox.restore();
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    MockFxAccountsIACHelper.resetListeners();
  });

  test('check the html loaded correctly', function() {
    fxaDescEl = document.getElementById('fxa-desc');
    assert.isNotNull(fxaDescEl, 'failed to load settings page html');
  });

  test('show the correct status on FxaMenu init', function() {
    var localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
    MockFxAccountsIACHelper.setCurrentState({
      accountId: 'init@ialization.com',
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
    navigator.mozL10n.localize.restore();
  });

  test('show the correct status after onlogout event', function() {
    var localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
    MockFxAccountsIACHelper.setCurrentState(null);
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-login'
    ]);
    navigator.mozL10n.localize.restore();
  });

  test('show the correct status after onlogin event', function() {
    var localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
    MockFxAccountsIACHelper.setCurrentState({
      accountId: 'on@log.in',
      verified: false
    });
    MockFxAccountsIACHelper.fireEvent('onlogin');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-check-email',
      { email: 'on@log.in' }
    ]);
    navigator.mozL10n.localize.restore();
  });

  test('show the correct status after onverifiedlogin event', function() {
    var localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
    MockFxAccountsIACHelper.setCurrentState({
      accountId: 'on@verifiedlog.in',
      verified: true
    });
    MockFxAccountsIACHelper.fireEvent('onverifiedlogin');
    assert.deepEqual(localizeSpy.args[0], [
      fxaDescEl,
      'fxa-logged-in-text',
      { email: 'on@verifiedlog.in' }
    ]);
    navigator.mozL10n.localize.restore();
  });
});
