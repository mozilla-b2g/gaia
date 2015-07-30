/* global FxaModuleErrorOverlay, FxaModuleOverlay, FxaModuleRefreshAuth,
          FxModuleServerRequest, FxaModuleUI, HtmlImports, LoadElementHelper,
          MocksHelper, MockL10n */
'use strict';

// Helper for loading the elements
requireApp('/system/test/unit/fxa_test/load_element_helper.js');

// Real code
require('/shared/js/utilities.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_states.js');
requireApp('system/fxa/js/fxam_manager.js');
requireApp('system/fxa/js/fxam_overlay.js');
requireApp('system/fxa/js/fxam_error_overlay.js');

// Mockuped code
require('/shared/test/unit/mocks/mock_l10n.js');

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
requireApp('system/fxa/js/screens/fxam_refresh_auth.js');

var mocksHelperForRefreshAuthModule = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI',
  'FxModuleServerRequest',
  'FxaModuleErrors'
]);

suite('Screen: Enter password', function() {
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForRefreshAuthModule.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-refresh-auth.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModuleRefreshAuth.init();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForRefreshAuthModule.suiteTeardown();
  });

  suite(' > password input ', function() {
    var passwordInput;
    var fxamUIDisableSpy, fxamUIEnableSpy;
    var inputEvent;
    setup(function() {
      passwordInput = document.getElementById('fxa-pw-input-refresh');
      fxamUIDisableSpy = this.sinon.spy(FxaModuleUI, 'disableDoneButton');
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableDoneButton');
      inputEvent = new CustomEvent('input', {
        bubbles: true
      });
      mocksHelperForRefreshAuthModule.setup();
    });

    teardown(function() {
      passwordInput = null;
      fxamUIDisableSpy = null;
      fxamUIEnableSpy = null;
      mocksHelperForRefreshAuthModule.teardown();
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

  suite(' > onDone ', function() {
    var showOverlaySpy, showErrorOverlaySpy, hideOverlaySpy;
    setup(function() {
      showErrorOverlaySpy = this.sinon.spy(FxaModuleErrorOverlay, 'show');
      showOverlaySpy = this.sinon.spy(FxaModuleOverlay, 'show');
      hideOverlaySpy = this.sinon.spy(FxaModuleOverlay, 'hide');
      mocksHelperForRefreshAuthModule.setup();
    });

    teardown(function() {
      showErrorOverlaySpy = null;
      showOverlaySpy = null;
      hideOverlaySpy = null;
      mocksHelperForRefreshAuthModule.teardown();
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
    });

    test(' > Overlay shown', function(done) {
      FxaModuleRefreshAuth.onDone(function() {
        assert.ok(showOverlaySpy.calledOnce);
        done();
      });
    });

    suite(' > signIn called', function() {
      var signInSpy;
      setup(function() {
        signInSpy =
            this.sinon.spy(FxModuleServerRequest, 'signIn');
        mocksHelperForRefreshAuthModule.setup();
      });

      teardown(function() {
        signInSpy = null;
        mocksHelperForRefreshAuthModule.teardown();
      });

      test(' > Check password', function(done) {
        FxaModuleRefreshAuth.onDone(function() {
          assert.ok(signInSpy.calledOnce);
          done();
        });
      });
    });

    test(' > Sign in error', function() {
      FxModuleServerRequest.error = true;
      FxaModuleRefreshAuth.onDone(function() {});

      assert.ok(hideOverlaySpy.calledOnce);
      assert.ok(showErrorOverlaySpy.calledOnce);
    });

    test(' > Existing user confirmed', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.authenticated = true;
      done();
    });
  });

});
