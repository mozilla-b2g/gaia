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
requireApp('system/fxa/js/screens/fxam_enter_email.js');

var mocksHelperForEmailModule = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI',
  'FxModuleServerRequest',
  'FxaModuleErrors'
]);

suite('Screen: Enter email', function() {
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForEmailModule.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-email.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModuleEnterEmail.init();
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForEmailModule.suiteTeardown();
  });


  suite(' > email input ', function() {
    var emailInput;
    var fxamUIDisableSpy, fxamUIEnableSpy;
    var inputEvent;
    setup(function() {
      emailInput = document.getElementById('fxa-email-input');
      fxamUIDisableSpy = this.sinon.spy(FxaModuleUI, 'disableNextButton');
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      inputEvent = new CustomEvent(
        'input',
        {
          bubbles: true
        }
      );
      mocksHelperForEmailModule.setup();
    });

    teardown(function() {
      emailInput = null;
      fxamUIDisableSpy = null;
      fxamUIEnableSpy = null;
      mocksHelperForEmailModule.teardown();
    });

    test(' > Disabled button at the beginning', function() {
      emailInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIDisableSpy.calledOnce);
      assert.isFalse(fxamUIEnableSpy.calledOnce);
    });

    test(' > Enable when ready', function() {
      emailInput.value = 'validemail@mozilla.es';
      emailInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.calledOnce);
      assert.isFalse(fxamUIDisableSpy.calledOnce);
    });

    test(' > Changes in the email input is tracked properly', function() {
      emailInput.value = 'validemail@mozilla.es';
      emailInput.dispatchEvent(inputEvent);

      assert.ok(fxamUIEnableSpy.called);
      assert.isFalse(fxamUIDisableSpy.calledOnce);

      // Change the value on the fly
      emailInput.value = 'validemailmozilla.es';
      emailInput.dispatchEvent(inputEvent);

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
      mocksHelperForEmailModule.setup();
    });

    teardown(function() {
      showErrorOverlaySpy = null;
      showOverlaySpy = null;
      hideOverlaySpy = null;
      mocksHelperForEmailModule.teardown();
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
    });

    test(' > Overlay shown', function(done) {
      FxaModuleEnterEmail.onNext(function() {
        assert.ok(showOverlaySpy.calledOnce);
        done();
      });
    });

    suite(' > checkEmail called', function() {
      var checkEmailSpy;
      setup(function() {
        checkEmailSpy = this.sinon.spy(FxModuleServerRequest, 'checkEmail');
        mocksHelperForEmailModule.setup();
      });

      teardown(function() {
        checkEmailSpy = null;
        mocksHelperForEmailModule.teardown();
      });

      test(' > Check email', function(done) {
        FxaModuleEnterEmail.onNext(function() {
          assert.ok(checkEmailSpy.calledOnce);
          done();
        });
      });

    });

    test(' > Network error', function() {
      FxModuleServerRequest.error = true;
      FxaModuleEnterEmail.onNext(function() {});

      assert.ok(hideOverlaySpy.calledOnce);
      assert.ok(showErrorOverlaySpy.calledOnce);
    });

    test(' > Email registered (Sign IN)', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = true;
      FxaModuleEnterEmail.onNext(function(params) {
        assert.equal(params, FxaModuleStates.ENTER_PASSWORD);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        done();
      });
    });

    test(' > Email NOT registered (Sign UP)', function(done) {
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
      FxaModuleEnterEmail.onNext(function(params) {
        assert.equal(params, FxaModuleStates.COPPA);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        done();
      });
    });
  });


  suite(' > onBack ', function() {
    var fxamUIEnableSpy;
    setup(function() {
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      mocksHelperForEmailModule.setup();
    });

    teardown(function() {
      fxamUIEnableSpy = null;
      mocksHelperForEmailModule.teardown();
    });

    test(' > Enable "next" button when going back', function() {
      FxaModuleEnterEmail.onBack();

      assert.ok(fxamUIEnableSpy.calledOnce);
    });
  });


});
