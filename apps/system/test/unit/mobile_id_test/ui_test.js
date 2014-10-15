'use strict';

/* global Controller, UI, MockL10n, MockNavigatorMozMobileConnections */

requireApp('system/mobile_id/js/controller.js');
requireApp('system/mobile_id/js/ui.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/elements/gaia-header/dist/gaia-header.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

suite('MobileID UI ', function() {
  var realL10n;
  var realMobileConnections;

  var mockDetails = [
    {
      primary: true,
      msisdn: '+34232342342',
      operator: 'Movistar'
    },
    {
      primary: false,
      operator: 'Movistar',
      serviceId: '0'
    }
  ];

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    loadBodyHTML('/mobile_id/index.html');
    UI.init({
      callback: done
    });
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozMobileConnections = realMobileConnections;
    MockNavigatorMozMobileConnections.mTeardown();
    realL10n = null;
    document.body.innerHTML = '';
  });

  suite(' render', function() {
    test('> is rendered properly', function() {
      // Render with the mock params
      UI.render(mockDetails);
      // List of the possible options
      var phoneOptionsList = document.querySelector('.phone-options-list');
      // Number of options should be 2
      assert.equal(phoneOptionsList.children.length, mockDetails.length);
      // The first one (which is the primary) should be selected by default
      assert.equal(
        document.querySelector('input:checked').value,
        mockDetails[0].msisdn
      );
      // Second one is a SIM without MSISDN
      assert.equal(
        phoneOptionsList.children[1].value,
        mockDetails[1].serviceId
      );
    });
  });

  suite(' we are bubbling all events to the Controller', function() {
    suiteSetup(function() {
      UI.render(mockDetails);
    });

    test('> close button action',function(done) {
      this.sinon.stub(Controller, 'postCloseAction');
      var header = document.querySelector('gaia-header');

      header.addEventListener('action', function() {
        done(function() {
          sinon.assert.calledOnce(Controller.postCloseAction);
          sinon.assert.calledWith(Controller.postCloseAction, false);
        });
      });

      header.triggerAction();
    });

    test('> allow button action',function() {
      this.sinon.stub(Controller, 'postIdentity');
      document.getElementById('allow-button').click();
      assert.ok(Controller.postIdentity.calledOnce);
      sinon.assert.calledWith(
        Controller.postIdentity,
        // As we are in the automatic phone number retrieval, we
        // are using the default one
        { mcc: null, phoneNumber: mockDetails[0].msisdn, prefix: null}
      );
    });

    test('> verification button action',function() {
      var verificationCodeMock = '123456';
      document.getElementById('verification-code').value = verificationCodeMock;
      this.sinon.stub(Controller, 'postVerificationCode');
      document.getElementById('verify-button').click();
      assert.ok(Controller.postVerificationCode.calledOnce);
      sinon.assert.calledWith(
        Controller.postVerificationCode,
        verificationCodeMock
      );
    });

    test('> verification button action with invalid code',function() {
      var verificationCodeMock = '1234';
      document.getElementById('verification-code').value = verificationCodeMock;
      this.sinon.stub(Controller, 'postVerificationCode');
      document.getElementById('verify-button').click();
      assert.isFalse(Controller.postVerificationCode.calledOnce);
    });
  });

  suite(' country code selection - no network', function() {
    suiteSetup(function(done) {
      UI.init({
        callback: done
      });
    });

    test('> No MCC should not select any default value', function() {
      var legend = document.getElementById('legend');
      assert.equal(legend.innerHTML, '');
      var ccSelect = document.getElementById('country-codes-select');
      // The select defaults to 289.
      assert.equal(ccSelect.value, '289');
    });
  });

  suite(' country code selection - network', function() {
    suiteSetup(function(done) {
      MockNavigatorMozMobileConnections[0].voice = {
        network: {
          mcc: '214'
        }
      };
      UI.init({
        callback: done
      });
    });

    test('> No MCC should not select any default value', function() {
      var legend = document.getElementById('legend');
      assert.equal(legend.innerHTML, '+34');
      var ccSelect = document.getElementById('country-codes-select');
      assert.equal(ccSelect.value, '214');
    });
  });

});
