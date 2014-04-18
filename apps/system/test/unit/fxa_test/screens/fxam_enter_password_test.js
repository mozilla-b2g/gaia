'use strict';

// Helper for loading the elements
requireApp('/system/test/unit/fxa_test/load_element_helper.js');

// Real code
requireApp('system/fxa/js/utils.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_states.js');
requireApp('system/fxa/js/fxam_manager.js');
requireApp('system/fxa/js/fxam_overlay.js');
requireApp('system/fxa/js/fxam_error_overlay.js');

// Mockuped code
requireApp('/system/test/unit/mock_l10n.js');

requireApp('system/fxa/js/fxam_ui.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_ui.js');

requireApp('system/fxa/js/fxam_server_request.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_server_request.js');

requireApp('system/fxa/js/fxam_errors.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_errors.js');

requireApp('/system/test/unit/mock_ftu_launcher.js');

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');

// Code to test
requireApp('system/fxa/js/screens/fxam_enter_password.js');

var mocksHelperForEnterPasswordModule = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI',
  'FxModuleServerRequest',
  'FxaModuleErrors',
  'FtuLauncher'
]);

mocha.globals([
  'FxModuleServerRequest',
  'FtuLauncher',
  'ftuLauncher'
]);

suite('Screen: Enter password', function() {
  var realL10n;
  suiteSetup(function(done) {
    window.ftuLauncher = new MockFtuLauncher();

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForEnterPasswordModule.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-enter-password.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModuleEnterPassword.init();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForEnterPasswordModule.suiteTeardown();
  });

  suite(' > password input ', function() {
    var passwordInput, forgotPasswordEl;
    var fxamUIDisableSpy, fxamUIEnableSpy, showErrorOverlaySpy, resetSpy;
    var inputEvent, clickEvent;
    setup(function() {
      passwordInput = document.getElementById('fxa-pw-input');
      fxamUIDisableSpy = this.sinon.spy(FxaModuleUI, 'disableNextButton');
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      showErrorOverlaySpy = this.sinon.spy(FxaModuleErrorOverlay, 'show');
      resetSpy = this.sinon.spy(FxModuleServerRequest, 'requestPasswordReset');
      forgotPasswordEl = document.getElementById('fxa-forgot-password');
      inputEvent = new CustomEvent(
        'input',
        {
          bubbles: true
        }
      );
      clickEvent = new CustomEvent(
        'click',
        {
          bubbles: true
        }
      );
      mocksHelperForEnterPasswordModule.setup();
    });

    teardown(function() {
      passwordInput = null;
      forgotPasswordEl = null;
      fxamUIDisableSpy = null;
      fxamUIEnableSpy = null;
      showErrorOverlaySpy = null;
      resetSpy = null;
      mocksHelperForEnterPasswordModule.teardown();
      FxModuleServerRequest.resetSuccess = false;
    });

    test(' > Disabled button at the beginning', function() {
      passwordInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIDisableSpy.calledOnce);
      assert.isFalse(fxamUIEnableSpy.calledOnce);
    });

    test(' > Enable when ready', function() {
      passwordInput.value = 'myawesomepassword';
      passwordInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.calledOnce);
      assert.isFalse(fxamUIDisableSpy.calledOnce);
    });

    test(' > Forgot password link shows error overlay when in FTE', function() {
      ftuLauncher.mIsRunning = true;
      forgotPasswordEl.dispatchEvent(clickEvent);
      assert.ok(showErrorOverlaySpy.calledOnce);
    });

    test(' > Forgot password link opens web flow when not in FTE', function() {
      ftuLauncher.mIsRunning = false;
      FxModuleServerRequest.resetSuccess = true;
      forgotPasswordEl.dispatchEvent(clickEvent);
      assert.ok(resetSpy.calledOnce);
    });

    test(' > Changes in the password input are tracked properly', function() {
      passwordInput.value = 'longpassword';
      passwordInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.called);
      assert.isFalse(fxamUIDisableSpy.calledOnce);

      // Change the value on the fly
      passwordInput.value = 'short';
      passwordInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.calledOnce);
      assert.ok(fxamUIDisableSpy.called);
    });
  });

  suite(' > onNext ', function() {
    var showOverlaySpy, showErrorOverlaySpy, hideOverlaySpy;
    setup(function() {
      showErrorOverlaySpy = this.sinon.spy(FxaModuleErrorOverlay, 'show');
      showOverlaySpy = this.sinon.spy(FxaModuleOverlay, 'show');
      hideOverlaySpy = this.sinon.spy(FxaModuleOverlay, 'hide');
      mocksHelperForEnterPasswordModule.setup();
    });

    teardown(function() {
      showErrorOverlaySpy = null;
      showOverlaySpy = null;
      hideOverlaySpy = null;
      mocksHelperForEnterPasswordModule.teardown();
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
    });

    test(' > Overlay shown', function(done) {
      FxaModuleEnterPassword.onNext(function() {
        assert.ok(showOverlaySpy.calledOnce);
        done();
      });
    });

    suite(' > signIn called', function() {
      var signInSpy;
      setup(function() {
        signInSpy =
            this.sinon.spy(FxModuleServerRequest, 'signIn');
        mocksHelperForEnterPasswordModule.setup();
      });

      teardown(function() {
        signInSpy = null;
        mocksHelperForEnterPasswordModule.teardown();
      });

      test(' > Check password', function(done) {
        FxaModuleEnterPassword.onNext(function() {
          assert.ok(signInSpy.calledOnce);
          done();
        });
      });
    });

    test(' > Sign in error', function() {
      FxModuleServerRequest.error = true;
      FxaModuleEnterPassword.onNext(function() {});

      assert.ok(hideOverlaySpy.calledOnce);
      assert.ok(showErrorOverlaySpy.calledOnce);
    });

    test(' > Existing user confirmed', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.authenticated = true;
      FxaModuleEnterPassword.onNext(function(params) {
        assert.equal(params, FxaModuleStates.SIGNIN_SUCCESS);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        done();
      });
    });

    test(' > Existing user, but not confirmed', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.authenticated = false;
      FxaModuleEnterPassword.onNext(function(params) {
        assert.equal(params, FxaModuleStates.SIGNUP_SUCCESS);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        done();
      });
    });
  });

});
