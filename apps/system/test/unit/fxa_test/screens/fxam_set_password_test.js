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

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');

// Code to test
requireApp('system/fxa/js/screens/fxam_set_password.js');

var mocksHelperForSetPasswordModule = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI',
  'FxModuleServerRequest',
  'FxaModuleErrors'
]);

suite('Screen: Set password', function() {
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForSetPasswordModule.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-set-password.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModuleSetPassword.init();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForSetPasswordModule.suiteTeardown();
  });

  suite(' > password input ', function() {
    var passwordInput;
    var fxamUIDisableSpy, fxamUIEnableSpy;
    var inputEvent;
    setup(function() {
      passwordInput = document.getElementById('fxa-pw-set-input');
      fxamUIDisableSpy = this.sinon.spy(FxaModuleUI, 'disableNextButton');
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      inputEvent = new CustomEvent(
        'input',
        {
          bubbles: true
        }
      );
      mocksHelperForSetPasswordModule.setup();
    });

    teardown(function() {
      passwordInput = null;
      fxamUIDisableSpy = null;
      fxamUIEnableSpy = null;
      mocksHelperForSetPasswordModule.teardown();
    });

    test(' > Disabled button at the beginning', function() {
      passwordInput.dispatchEvent(inputEvent);
      assert.ok(true);

      assert.ok(fxamUIDisableSpy.calledOnce);
      assert.isFalse(fxamUIEnableSpy.calledOnce);
    });

    test(' > Enable when ready', function() {
      passwordInput.value = 'myawesomepassword';
      passwordInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.calledOnce);
      assert.isFalse(fxamUIDisableSpy.calledOnce);
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
      mocksHelperForSetPasswordModule.setup();
    });

    teardown(function() {
      showErrorOverlaySpy = null;
      showOverlaySpy = null;
      hideOverlaySpy = null;
      mocksHelperForSetPasswordModule.teardown();
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
    });

    test(' > Overlay shown', function() {
      FxaModuleSetPassword.onNext();
      assert.ok(showOverlaySpy.calledOnce);
    });

    test(' > Sign up called', function(done) {
      this.sinon.stub(FxModuleServerRequest, 'signUp', function() {
        done();
      });
      FxaModuleSetPassword.onNext();
    });

    test(' > Sign up error', function() {
      FxModuleServerRequest.error = true;
      FxaModuleSetPassword.onNext(function() {});

      assert.ok(hideOverlaySpy.calledOnce);
      assert.ok(showErrorOverlaySpy.calledOnce);
    });

    test(' > Sign up working', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.accountCreated = true;
      FxaModuleSetPassword.onNext(function(params) {
        assert.equal(params, FxaModuleStates.SIGNUP_SUCCESS);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        done();
      });
    });
  });
});
