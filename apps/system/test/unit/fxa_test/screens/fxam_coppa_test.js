'use strict';

/* global MocksHelper, MockL10n, LoadElementHelper, HtmlImports, FxaModuleUI,
          FxaModuleCoppa, FxaModuleErrorOverlay, FxaModuleStates */

// Helper for loading the elements
requireApp('/system/test/unit/fxa_test/load_element_helper.js');

// Real code
require('/shared/js/utilities.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_states.js');
requireApp('system/fxa/js/fxam_manager.js');
requireApp('system/fxa/js/fxam_navigation.js');
requireApp('system/fxa/js/fxam_overlay.js');
requireApp('system/fxa/js/fxam_error_overlay.js');

// Mockuped code
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_ui.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_server_request.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_errors.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');

// Code to test
requireApp('system/fxa/js/screens/fxam_coppa.js');

var mocksHelperForCoppaModule = new MocksHelper([
  'FxaModuleUI',
  'FxModuleServerRequest',
  'FxaModuleErrors',
  'LazyLoader'
]);

suite('Screen: COPPA', function() {
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForCoppaModule.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-coppa.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForCoppaModule.suiteTeardown();
  });

  suite(' > Initial state', function() {
    var fxamUIEnableSpy;
    var fxamUIIncStepsSpy;
    setup(function() {
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      fxamUIIncStepsSpy = this.sinon.spy(FxaModuleUI, 'increaseMaxStepsBy');
    });

    teardown(function() {
      fxamUIEnableSpy = null;
      fxamUIIncStepsSpy = null;
    });

    test(' > FxaModuleUI not called', function(done) {
      assert.isFalse(fxamUIEnableSpy.calledOnce);
      assert.isFalse(fxamUIIncStepsSpy.calledOnce);
      done();
    });
  });

  suite(' > Initiated state', function() {
    var fxamUIEnableSpy;
    var fxamUIIncStepsSpy;
    setup(function() {
      fxamUIEnableSpy = this.sinon.spy(FxaModuleUI, 'enableNextButton');
      fxamUIIncStepsSpy = this.sinon.spy(FxaModuleUI, 'increaseMaxStepsBy');
      FxaModuleCoppa.init();
    });

    teardown(function() {
      fxamUIEnableSpy = null;
      fxamUIIncStepsSpy = null;
    });

    test(' > FxaModuleUI called', function(done) {
      assert.isFalse(fxamUIEnableSpy.calledOnce);
      assert.ok(fxamUIIncStepsSpy.calledOnce);
      done();
    });

    test(' > We only populate the age selection element once', function() {
      var fxaAgeSelect = document.getElementById('fxa-age-select');
      var selectLength = fxaAgeSelect.length;
      FxaModuleCoppa.init();
      assert.equal(selectLength, fxaAgeSelect.length);
    });
  });

  suite(' > COPPA error', function() {
    var fxaAgeSelect;
    var showErrorOverlaySpy;
    var showErrorResponse;
    setup(function() {
      fxaAgeSelect = document.getElementById('fxa-age-select');
      showErrorOverlaySpy = this.sinon.spy(FxaModuleErrorOverlay, 'show');
      showErrorResponse = this.sinon.spy(FxaModuleCoppa, 'showErrorResponse');
      fxaAgeSelect.value = new Date().getFullYear();
    });

    teardown(function() {
      fxaAgeSelect = null;
      showErrorOverlaySpy = null;
      showErrorResponse = null;
    });

    test(' > COPPA error shown', function(done) {
      FxaModuleCoppa.onNext(function() { });
      setTimeout(function() {
        assert.ok(showErrorOverlaySpy.calledOnce);
        assert.ok(showErrorResponse.calledOnce);
        done();
      });
    });
  });

  suite(' > COPPA success', function() {
    var fxaAgeSelect;
    var MINIMUM_AGE = 13;
    setup(function() {
      fxaAgeSelect = document.getElementById('fxa-age-select');
      fxaAgeSelect.value = new Date().getFullYear() - MINIMUM_AGE;
    });

    teardown(function() {
      fxaAgeSelect = null;
    });

    test(' > COPPA success', function(done) {
      FxaModuleCoppa.onNext(function(a) {
        assert.deepEqual(a, FxaModuleStates.SET_PASSWORD);
        done();
      });
    });
  });

});
