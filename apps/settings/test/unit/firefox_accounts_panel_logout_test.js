/* globals FxaPanel, HtmlImports, loadBodyHTML, MockFxAccountsIACHelper,
  MockL10n */

'use strict';

mocha.globals([
  'FxaPanel',
  'loadBodyHTML',
  'HtmlImports',
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
requireApp('settings/js/firefox_accounts/panel.js');

suite('firefox accounts panel > ', function() {
  var suiteSandbox = sinon.sandbox.create(),
    realL10n,
    loggedOutScreen,
    unverifiedScreen,
    loggedInScreen;

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // first, load settings app
    loadBodyHTML('/index.html');

    // next, insert fxa panel into page
    var importHook = document.createElement('link');
    importHook.setAttribute('rel', 'import');
    importHook.setAttribute('href', '/elements/firefox_accounts.html');
    document.head.appendChild(importHook);
    HtmlImports.populate(function onDOMReady() {
      // double-check panel is ready
      if (null == document.getElementById('fxa-logged-out')) {
        throw new Error('failed to load fxa panel into page');
      }
      // grab pointers to useful elements
      loggedOutScreen = document.getElementById('fxa-logged-out');
      unverifiedScreen = document.getElementById('fxa-unverified');
      loggedInScreen = document.getElementById('fxa-logged-in');
      done();
    });
  });
  suiteTeardown(function() {
    suiteSandbox.restore();
    // TODO: should we try to destroy FxaPanel? remove mock html from page?
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    MockFxAccountsIACHelper.resetListeners();
  });

  test('show the correct panel and email after onlogout event', function() {
    MockFxAccountsIACHelper.setCurrentState(null);
    // init FxaPanel
    FxaPanel.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.isFalse(loggedOutScreen.hidden);
    assert.isTrue(unverifiedScreen.hidden);
    assert.isTrue(loggedInScreen.hidden);
  });

});
