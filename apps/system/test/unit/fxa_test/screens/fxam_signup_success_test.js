'use strict';

// Helper for loading the elements
requireApp('/system/test/unit/fxa_test/load_element_helper.js');

// Real code
requireApp('system/fxa/js/utils.js');
requireApp('system/fxa/js/fxam_module.js');
requireApp('system/fxa/js/fxam_states.js');

// Mockuped code
requireApp('/system/test/unit/mock_l10n.js');

requireApp('system/fxa/js/fxam_ui.js');
requireApp('/system/test/unit/fxa_test/mock_fxam_ui.js');

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');

// Code to test
requireApp('system/fxa/js/screens/fxam_signup_success.js');

var mocksHelperForSignupSuccess = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI'
]);

suite('Screen: Signup Success', function() {
  var emailTest = 'testuser@testuser.com';
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForSignupSuccess.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-signup-success.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModuleSignupSuccess.init({
        email: emailTest
      });
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForSignupSuccess.suiteTeardown();
  });


  suite(' > init ', function() {
    test(' > email shown properly', function() {
      assert.equal(
        FxaModuleSignupSuccess.fxaSummaryEmail.textContent,
        emailTest
      );
    });

  });

  suite(' > onNext ', function() {
    test(' > go to DONE Step', function() {
      FxaModuleSignupSuccess.onNext(function(nextState) {
        assert.equal(nextState, FxaModuleStates.DONE);
      });
    });
  });
});
