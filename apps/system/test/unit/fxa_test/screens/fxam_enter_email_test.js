/* global FxaModuleEnterEmail, FxaModuleErrorOverlay, FxaModuleOverlay,
          FxModuleServerRequest, FxaModuleStates, FxaModuleUI,
          HtmlImports, LoadElementHelper, MocksHelper, MockL10n */
'use strict';

// Helper for loading the elements
requireApp('/system/test/unit/fxa_test/load_element_helper.js');

// Real code
require('/shared/js/utilities.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_states.js');
requireApp('system/fxa/js/fxam_manager.js');
requireApp('system/fxa/js/fxam_overlay.js');
requireApp('system/js/browser_frame.js');
requireApp('system/js/entry_sheet.js');
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
    // we have to special-case the l10n stub for the fxa-notice element
    var l10nStub = sinon.stub(navigator.mozL10n, 'get');
    var noticeStr = 'By proceeding, I agree to the {{ tos }} and {{ pn }} ' +
                    'Firefox cloud services';
    l10nStub.withArgs('fxa-notice')
      .returns(noticeStr);

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

  suite(' > External links EntrySheet ', function() {
    var privacyLink, termsLink, showErrorOverlaySpy, clickEvent,
      closeEntrySheetSpy, mockEntrySheet;

    setup(function() {
      privacyLink = document.getElementById('fxa-privacy');
      termsLink = document.getElementById('fxa-terms');
      showErrorOverlaySpy = this.sinon.spy(FxaModuleErrorOverlay, 'show');
      clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      closeEntrySheetSpy = sinon.spy();
      mockEntrySheet = {close: closeEntrySheetSpy};
      FxaModuleEnterEmail.entrySheet = mockEntrySheet;
    });

    teardown(function() {
      FxaModuleErrorOverlay.show.restore();
      privacyLink = termsLink = showErrorOverlaySpy = clickEvent = null;
      FxaModuleEnterEmail.entrySheet = null;
    });

    test(' > Should not be shown if navigator.onLine is false', function() {
      var realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: function() {
          return false;
        },
        set: function() {}
      });
      var showErrorSpy = this.sinon.spy(FxaModuleEnterEmail,
        'showErrorResponse');
      privacyLink.dispatchEvent(clickEvent);
      termsLink.dispatchEvent(clickEvent);
      assert.ok(showErrorSpy.calledTwice);
      FxaModuleEnterEmail.showErrorResponse.restore();
      realOnLine ? Object.defineProperty(navigator, 'onLine', realOnLine) :
        delete navigator.onLine;
    });

    test(' > Should be dismissed on "home" event', function() {
      window.dispatchEvent(new CustomEvent('home'));
      assert.ok(closeEntrySheetSpy.calledOnce);
      assert.isNull(FxaModuleEnterEmail.entrySheet);
    });

    test(' > Should be dismissed on "holdhome" event', function() {
      window.dispatchEvent(new CustomEvent('holdhome'));
      assert.ok(closeEntrySheetSpy.calledOnce);
      assert.isNull(FxaModuleEnterEmail.entrySheet);
    });

    test(' > Should be dismissed on "activityrequesting" event', function() {
      window.dispatchEvent(new CustomEvent('activityrequesting'));
      assert.ok(closeEntrySheetSpy.calledOnce);
      assert.isNull(FxaModuleEnterEmail.entrySheet);
    });
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

    test(' > Email NOT registered inside FTU (Sign UP)', function(done) {
      FxaModuleEnterEmail.isFTU = true;
      FxModuleServerRequest.error = false;
      FxModuleServerRequest.registered = false;
      FxaModuleEnterEmail.onNext(function(params) {
        assert.equal(params, FxaModuleStates.SET_PASSWORD);
        assert.ok(hideOverlaySpy.calledOnce);
        assert.isFalse(showErrorOverlaySpy.calledOnce);
        FxaModuleEnterEmail.isFTU = null;
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
