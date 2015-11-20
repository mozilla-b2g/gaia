/* globals HtmlImports, loadBodyHTML, MockFxAccountsIACHelper,
  MockL10n */

'use strict';

// require helpers for managing html
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/html_imports.js');

// mocks and globals
require('mock_fx_accounts_iac_helper.js');
require('/shared/js/text_normalizer.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('firefox accounts panel > ', function() {
  var suiteSandbox = sinon.sandbox.create(),
    setAttributesSpy,
    realL10n,
    alertSpy,
    firefoxAccounts,
    elements;

  setup(function(done) {

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
      elements = {
        fxaContainer: document.getElementById('fxa'),
        loggedOutPanel: document.getElementById('fxa-logged-out'),
        loggedInPanel: document.getElementById('fxa-logged-in'),
        unverifiedPanel: document.getElementById('fxa-unverified'),
        resendEmail: document.getElementById('fxa-resend-email'),
        cancelBtn: document.getElementById('fxa-cancel-confirmation'),
        loginBtn: document.getElementById('fxa-login'),
        logoutBtn: document.getElementById('fxa-logout'),
        loggedInEmail: document.getElementById('fxa-logged-in-text'),
        unverifiedEmail: document.getElementById('fxa-unverified-text'),
        resendLink: document.getElementById('fxa-resend')
      };

      var modules = [
        '/js/panels/firefox_accounts/firefox_accounts.js',
        'MockFxAccountsIACHelper',
        'MockDialogService'
      ];

      var map = {
        '*': {
          'shared/fxa_iac_client': 'MockFxAccountsIACHelper',
          'shared/text_normalizer': 'MockTextNormalizer',
          'modules/dialog_service': 'MockDialogService'
        }
      };

      define('MockFxAccountsIACHelper', function() {
        return MockFxAccountsIACHelper;
      });

      define('MockTextNormalizer', function() {
        return {
          escapeHTML: function(string) { return string; }
        };
      });

      define('MockDialogService', function() {
        return {
          alert: function() { return Promise.resolve(); }
        };
      });

      testRequire(modules, map,
        function(FirefoxAccounts, MockFxAccountsIACHelper, MockDialogService) {
          firefoxAccounts = FirefoxAccounts();
          firefoxAccounts.onInit(elements);
          alertSpy = sinon.stub(MockDialogService, 'alert');
          done();
        }
      );
    });
  });
  suiteTeardown(function() {
    suiteSandbox.restore();
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  setup(function() {
    setAttributesSpy = sinon.spy(navigator.mozL10n, 'setAttributes');
  });

  teardown(function() {
    navigator.mozL10n.setAttributes.restore();
    MockFxAccountsIACHelper.resetListeners();
  });

  test('show the correct panel and email on FxaPanel init', function() {
    // set the state in the mock
    MockFxAccountsIACHelper.setCurrentState({
      email: 'init@ialization.com',
      verified: true
    });

    // init FxaPanel
    firefoxAccounts.onBeforeShow();

    // check the right screen is visible
    assert.isTrue(elements.loggedOutPanel.hidden);
    assert.isTrue(elements.unverifiedPanel.hidden);
    assert.isFalse(elements.loggedInPanel.hidden);

    // test setAttributes was called with correct args
    assert.deepEqual(setAttributesSpy.args[0], [
      document.getElementById('fxa-logged-in-text'),
      'fxa-logged-in-text',
      { email: 'init@ialization.com' }
    ]);
  });

  test('show the correct panel and email after onlogout event', function() {
    MockFxAccountsIACHelper.setCurrentState(null);
    firefoxAccounts.onBeforeShow();
    MockFxAccountsIACHelper.fireEvent('onlogout');
    assert.isFalse(elements.loggedOutPanel.hidden);
    assert.isTrue(elements.unverifiedPanel.hidden);
    assert.isTrue(elements.loggedInPanel.hidden);
  });

  test('show the correct panel and email after onlogin event', function() {
    MockFxAccountsIACHelper.setCurrentState({
      email: 'on@log.in',
      verified: false
    });
    firefoxAccounts.onBeforeShow();
    MockFxAccountsIACHelper.fireEvent('onlogin');
    assert.isTrue(elements.loggedOutPanel.hidden);
    assert.isFalse(elements.unverifiedPanel.hidden);
    assert.isTrue(elements.loggedInPanel.hidden);

    // test setAttributes was called with correct args
    assert.deepEqual(setAttributesSpy.args[0], [
      document.getElementById('fxa-unverified-text'),
      'fxa-verification-email-sent-msg',
      { email: 'on@log.in' }
    ]);
  });

  test('show the correct panel and email after onverified event',
    function() {
      MockFxAccountsIACHelper.setCurrentState({
        email: 'on@verifiedlog.in',
        verified: true
      });
      firefoxAccounts.onBeforeShow();
      MockFxAccountsIACHelper.fireEvent('onverified');
      assert.isTrue(elements.loggedOutPanel.hidden);
      assert.isTrue(elements.unverifiedPanel.hidden);
      assert.isFalse(elements.loggedInPanel.hidden);

      // test setAttributes was called with correct args
      assert.deepEqual(setAttributesSpy.args[0], [
        document.getElementById('fxa-logged-in-text'),
        'fxa-logged-in-text',
        { email: 'on@verifiedlog.in' }
      ]);
  });

  suite('resendVerificationEmail tests > ', function() {
    var getAccountSpy;

    suiteSetup(function() {
      getAccountSpy = sinon.stub(MockFxAccountsIACHelper, 'getAccount');
      firefoxAccounts.onBeforeShow();
    });

    suiteTeardown(function() {
      MockFxAccountsIACHelper.getAccount.restore();
      getAccountSpy = null;
    });

    setup(function() {
      getAccountSpy.reset();
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
      firefoxAccounts._onResendClick(fakeEvt);
      assert.isTrue(getAccountSpy.called);
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
      firefoxAccounts._onResendClick(fakeEvt);
      assert.isFalse(getAccountSpy.called);
    });

    test('_onResend should alert resend message', function(done) {
      firefoxAccounts._onResend('foo@bar.com');
      assert.isTrue(
        alertSpy.calledWith({
          id: 'fxa-resend-alert',
          args: { email: 'foo@bar.com' }
        })
      );
      done();
    });

    suite('timer tests > ', function() {
      setup(function() {
        this.clock = sinon.useFakeTimers();
      });

      teardown(function() {
        this.clock.restore();
      });

      test('_onResend should disable link for 60 seconds', function(done) {
        firefoxAccounts._onResend('foo@bar.com');
        this.clock.tick(100);
        assert.isTrue(elements.resendLink.classList.contains('disabled'));
        this.clock.tick(59900);
        assert.isFalse(elements.resendLink.classList.contains('disabled'));
        done();
      });
    });
  });
});
