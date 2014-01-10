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
requireApp('system/fxa/js/screens/fxam_password_reset_success.js');

var mocksHelperForPwResetSuccess = new MocksHelper([
  'LazyLoader',
  'FxaModuleUI'
]);

suite('Screen: Reset Password Success', function() {
  var emailTest = 'testuser@testuser.com';
  var realL10n;
  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelperForPwResetSuccess.suiteSetup();
    // Load real HTML
    loadBodyHTML('/fxa/fxa_module.html');
    // Load element to test
    LoadElementHelper.load('fxa-signin-success.html');
    // Import the element and execute the right init
    HtmlImports.populate(function() {
      FxaModulePasswordResetSuccess.init({
        email: emailTest
      });
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
    mocksHelperForPwResetSuccess.suiteTeardown();
  });


  suite(' > init ', function() {
    test(' > email shown properly', function() {
      assert.equal(
        FxaModulePasswordResetSuccess.fxaSummaryEmail.textContent,
        emailTest
      );
    });

  });

  suite(' > onNext ', function() {
    test(' > go to DONE Step', function() {
      FxaModulePasswordResetSuccess.onNext(function(nextState) {
        assert.equal(nextState, FxaModuleStates.DONE);
      });
    });
  });
});
