/* globals FxaPanel, HtmlImports, loadBodyHTML, MockFxAccountsIACHelper,
  MockL10n */

'use strict';

// require helpers for managing html
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

// mocks and globals
require('mock_fx_accounts_iac_helper.js');
require('/shared/js/text_normalizer.js');
requireApp('settings/test/unit/mock_l10n.js');

suite('firefox accounts panel > ', function() {
  var suiteSandbox = sinon.sandbox.create(),
    localizeSpy,
    realL10n,
    loggedOutScreen,
    unverifiedScreen,
    alertSpy,
    loggedInScreen;

  suiteSetup(function(done) {
    alertSpy = sinon.stub(window, 'alert');

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    // override generic mozL10n.get for dynamically-created resend strings/els
    var l10nStub = sinon.stub(navigator.mozL10n, 'get');
    l10nStub.withArgs('fxa-dont-see-email').returns('placeholder {{resend}}');
    l10nStub.withArgs('fxa-resend-alert', {email: 'foo@bar.com'})
      .returns('placeholder foo@bar.com');

    // source the code we care about - have to wait for mock l10n
    requireApp('settings/js/firefox_accounts/panel.js');

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
    navigator.mozL10n = realL10n;
    window.alert.restore();
    document.body.innerHTML = '';
  });

  setup(function() {
    localizeSpy = sinon.spy(navigator.mozL10n, 'localize');
  });

  teardown(function() {
    navigator.mozL10n.localize.restore();
    MockFxAccountsIACHelper.resetListeners();
  });

  test('show the correct panel and email on FxaPanel init', function() {
    // set the state in the mock
    MockFxAccountsIACHelper.setCurrentState({
      email: 'init@ialization.com',
      verified: true
    });
    // init FxaPanel
    FxaPanel.init(MockFxAccountsIACHelper);

    // check the right screen is visible
    assert.isTrue(loggedOutScreen.hidden);
    assert.isTrue(unverifiedScreen.hidden);
    assert.isFalse(loggedInScreen.hidden);

    // test localize was called with correct args
    assert.deepEqual(localizeSpy.args[0], [
      document.getElementById('fxa-logged-in-text'),
      'fxa-logged-in-text',
      { email: 'init@ialization.com' }
    ]);
  });

  test('show the correct panel and email after onlogout event', function() {
    MockFxAccountsIACHelper.setCurrentState(null);
    FxaPanel.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.isFalse(loggedOutScreen.hidden);
    assert.isTrue(unverifiedScreen.hidden);
    assert.isTrue(loggedInScreen.hidden);
  });

  test('show the correct panel and email after onlogin event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@log.in',
      verified: false
    });
    FxaPanel.init(MockFxAccountsIACHelper);
    MockFxAccountsIACHelper.fireEvent('onlogin');
    assert.isTrue(loggedOutScreen.hidden);
    assert.isFalse(unverifiedScreen.hidden);
    assert.isTrue(loggedInScreen.hidden);

    // test localize was called with correct args
    assert.deepEqual(localizeSpy.args[0], [
      document.getElementById('fxa-unverified-text'),
      'fxa-verification-email-sent-msg',
      { email: 'on@log.in' }
    ]);
  });

  test('show the correct panel and email after onverifiedlogin event',
    function() {
      MockFxAccountsIACHelper.setCurrentState({
        email: 'on@verifiedlog.in',
        verified: true
      });
      FxaPanel.init(MockFxAccountsIACHelper);
      MockFxAccountsIACHelper.fireEvent('onverifiedlogin');
      assert.isTrue(loggedOutScreen.hidden);
      assert.isTrue(unverifiedScreen.hidden);
      assert.isFalse(loggedInScreen.hidden);
      // test localize was called with correct args
      assert.deepEqual(localizeSpy.args[0], [
        document.getElementById('fxa-logged-in-text'),
        'fxa-logged-in-text',
        { email: 'on@verifiedlog.in' }
      ]);
  });

  suite('resendVerificationEmail tests > ', function() {
    var getAccountsSpy;

    suiteSetup(function() {
      getAccountsSpy = sinon.stub(MockFxAccountsIACHelper, 'getAccounts');
      FxaPanel.init(MockFxAccountsIACHelper);
    });

    suiteTeardown(function() {
      MockFxAccountsIACHelper.getAccounts.restore();
      getAccountsSpy = null;
    });

    setup(function() {
      getAccountsSpy.reset();
    });

    test('on resend click, if link is enabled, get accounts', function() {
      var fakeEvt = {
        stopPropagation: function() {},
        preventDefault: function() {},
        target: {
          classList: {
            contains: function() {
              // _onResendCLick is looking for the .disabled class in the
              // classList. to keep the mock simple, always return false.
              return false;
            }
          }
        }
      };
      FxaPanel._onResendClick.call(null, fakeEvt);
      assert.isTrue(getAccountsSpy.called);
    });

    test('on resend click, if link is disabled, do nothing', function() {
      var fakeEvt = {
        stopPropagation: function() {},
        preventDefault: function() {},
        target: {
          classList: {
            contains: function() {
              // _onResendCLick is looking for the .disabled class in the
              // classList. to keep the mock simple, always return true.
              return true;
            }
          }
        }
      };
      FxaPanel._onResendClick.call(null, fakeEvt);
      assert.isFalse(getAccountsSpy.called);
    });

    test('_onResend should alert resend message', function() {
      FxaPanel._onResend.call(null, 'foo@bar.com');
      assert.isTrue(alertSpy.calledWith('placeholder foo@bar.com'));
    });

    suite('timer tests > ', function() {
      setup(function() {
        this.clock = sinon.useFakeTimers();
      });

      teardown(function() {
        this.clock.restore();
      });

      test('_onResend should disable link for 60 seconds', function() {
        var resendLink = document.getElementById('fxa-resend');
        FxaPanel._onResend.call(null, 'foo@bar.com');
        this.clock.tick(100);
        assert.isTrue(resendLink.classList.contains('disabled'));
        this.clock.tick(59900);
        assert.isFalse(resendLink.classList.contains('disabled'));
      });
    });
  });
});
