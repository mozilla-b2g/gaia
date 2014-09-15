'use strict';

/* global CallHandler, KeypadManager, MockNavigatorMozTelephony, MocksHelper,
          Promise, MockICEContacts, MockSimSettingsHelper, MockSimPicker */
require('/test/unit/mock_keypad.js');
require('/test/unit/mock_ice_contacts.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_sim_settings_helper.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');

require('/js/dialer.js');

var mocksHelperForDialer = new MocksHelper([
  'KeypadManager',
  'ICEContacts',
  'LazyLoader',
  'SimSettingsHelper',
  'SimPicker'
]).init();

suite('Emergency Dialer', function() {
  var realMozTelephony;

  var num = '123';
  var mockCall;
  var mockPromise;

  mocksHelperForDialer.attachTestHelpers();

  suiteSetup(function() {
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    CallHandler._telephony = MockNavigatorMozTelephony;
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
  });

  suite('> Telephony API', function() {
    setup(function() {
      mockCall = {};
      mockPromise = Promise.resolve(mockCall);
      this.sinon.stub(navigator.mozTelephony, 'dialEmergency')
        .returns(mockPromise);
      CallHandler.call(num);
    });

    test('> calls dialEmergency', function() {
      sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, num);
    });

    test('> installs onconnected handler', function(done) {
      mockPromise.then(function() {
        assert.isFunction(mockCall.onconnected);
      }).then(done, done);
    });

    test('> installs ondisconnected handler', function(done) {
      mockPromise.then(function() {
        assert.isFunction(mockCall.ondisconnected);
      }).then(done, done);
    });

    test('> clears the keypad on connected', function(done) {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockPromise.then(function() {
        mockCall.onconnected();
        sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
      }).then(done, done);
    });

    test('> clears the keypad on disconnected', function(done) {
      this.sinon.spy(KeypadManager, 'updatePhoneNumber');
      mockPromise.then(function() {
        mockCall.ondisconnected();
        sinon.assert.calledWith(KeypadManager.updatePhoneNumber, '');
      }).then(done, done);
    });
  });

  suite('> Dialing ICE Contacts Behavior', function() {
    setup(function() {
      mockCall = {};
      mockPromise = Promise.resolve(mockCall);
      this.sinon.stub(navigator.mozTelephony, 'dialEmergency')
        .returns(mockPromise);
      this.sinon.stub(navigator.mozTelephony, 'dial').returns(mockPromise);
      this.sinon.stub(MockICEContacts, 'isFromICEContact');
    });

    test('> dials when default outgoing SIM "always ask" and SIM selected',
    function() {
      MockSimSettingsHelper._defaultCards.outgoingCall =
        MockSimSettingsHelper.ALWAYS_ASK_OPTION_VALUE;
      this.sinon.stub(MockSimPicker, 'getOrPick');
      MockICEContacts.isFromICEContact.returns(true);

      CallHandler.call(num);
      MockSimPicker.getOrPick.yield(0);
      sinon.assert.calledWith(navigator.mozTelephony.dial, num);
      sinon.assert.calledWith(MockSimPicker.getOrPick,
                              MockSimSettingsHelper.ALWAYS_ASK_OPTION_VALUE,
                              num);
    });

    [0, 1].forEach(function(cardIndex) {
      test('> calls dial when ICE dialed with SIM ' + cardIndex, function() {
        MockSimSettingsHelper._defaultCards.outgoingCall = cardIndex;
        MockICEContacts.isFromICEContact.returns(true);

        CallHandler.call(num);
        sinon.assert.calledWith(navigator.mozTelephony.dial, num, cardIndex);
      });
    });

    test('> calls dialEmergency when non-ICE Contact is dialed', function() {
      MockICEContacts.isFromICEContact.returns(false);

      CallHandler.call(num);
      sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, num);
    });

    test('> SimPicker NOT called when Emergency number is dialed',
    function() {
      MockICEContacts.isFromICEContact.returns(false);
      this.sinon.spy(MockSimPicker, 'getOrPick');

      CallHandler.call(num);
      sinon.assert.calledOnce(navigator.mozTelephony.dialEmergency);
      sinon.assert.notCalled(MockSimPicker.getOrPick);
    });
  });
});
