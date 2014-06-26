/* global ConfirmDialog, MocksHelper, MockIccHelper, MockLazyL10n, MockMozL10n,
   MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
   MockNavigatorSettings, MockTonePlayer, Promise, TelephonyHelper */

'use strict';


require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/dialer/mock_tone_player.js');

require('/dialer/test/unit/mock_icc_helper.js');

require('/dialer/js/telephony_helper.js');

var mocksHelperForTelephonyHelper = new MocksHelper([
  'Contacts',
  'ConfirmDialog',
  'LazyL10n',
  'LazyLoader',
  'IccHelper',
  'TonePlayer'
]).init();

suite('telephony helper', function() {
  var subject;
  var realMozSettings;
  var realMozTelephony;
  var realMozMobileConnections;
  var realMozL10n;
  var spyConfirmShow;
  var mockTelephony;
  var mockCall;
  var mockPromise;

  mocksHelperForTelephonyHelper.attachTestHelpers();

  suiteSetup(function() {
    subject = TelephonyHelper;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozTelephony = realMozTelephony;
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    spyConfirmShow = this.sinon.spy(ConfirmDialog, 'show');
    mockTelephony = this.sinon.mock(MockNavigatorMozTelephony);
    mockCall = {};
    MockNavigatorMozMobileConnections[0].voice = {};
    mockPromise = Promise.resolve(mockCall);
    this.sinon.stub(MockNavigatorMozTelephony, 'dial',
                    function() { return mockPromise;});
    this.sinon.stub(MockNavigatorMozTelephony, 'dialEmergency',
                    function() { return mockPromise;});
  });

  teardown(function() {
    MockNavigatorMozMobileConnections.mTeardown();
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorSettings.mTeardown();
    MockLazyL10n.keys = {};
  });

  function createCallError(name) {
    return {call: {error: {name: (name || 'mock')}}};
  }

  test('should sanitize the given phone number before dialing', function() {
    var dialNumber = '(01) 45.34 55-20';
    subject.call(dialNumber, 0);
    sinon.assert.calledWith(navigator.mozTelephony.dial, '0145345520');
  });

  test('should not dial the same number twice', function() {
    var dialNumber = '0145345520';
    MockNavigatorMozTelephony.calls = [{number: dialNumber}];

    subject.call(dialNumber, 0);

    sinon.assert.notCalled(navigator.mozTelephony.dial);
  });

  suite('Emergency dialing >', function() {
    var initialState;

    setup(function() {
      initialState = MockIccHelper.mCardState;
      MockIccHelper.mCardState = 'unknown';
      MockNavigatorMozMobileConnections[0].voice = { emergencyCallsOnly: true };
    });

    teardown(function() {
      MockIccHelper.mCardState = initialState;
    });

    suite('when there is no sim card', function() {
      test('it should always dial emergency with the first service',
      function() {
        var dialNumber = '112';
        subject.call(dialNumber, 0);
        sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, '112', 0);
      });
    });

    suite('when there is a sim card', function() {
      setup(function() {
        MockNavigatorMozMobileConnections[0].iccId = 12;
      });

      test('it should dial emergency with the default service', function() {
        var dialNumber = '112';
        subject.call(dialNumber, 0);
        sinon.assert.calledWith(navigator.mozTelephony.dialEmergency,
                                '112', undefined);
      });
    });
  });

  test('should dialEmergency if the connection is emergency only',
  function() {
    MockNavigatorMozMobileConnections[0].voice = { emergencyCallsOnly: true };
    var dialNumber = '112';
    subject.call(dialNumber, 0);
    sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, '112');
  });

  test('should hold the active line before dialing (if there is one)',
  function() {
    var dialNumber = '123456';
    var holdStub = this.sinon.stub();
    var mockActive = {
      number: '1111',
      state: 'connected',
      hold: holdStub
    };
    MockNavigatorMozTelephony.active = mockActive;

    subject.call(dialNumber, 0);
    delete MockNavigatorMozTelephony.active;
    mockActive.onheld();
    sinon.assert.calledWith(navigator.mozTelephony.dial, dialNumber);

    assert.isTrue(holdStub.calledBefore(navigator.mozTelephony.dial));
    assert.isNull(mockActive.onheld);
  });

  test('should NOT hold the active line before dialing in CDMA mode',
  function() {
    MockNavigatorMozMobileConnections[0].voice.type = 'evdoa';
    var dialNumber = '123456';
    var holdStub = this.sinon.stub();
    var mockActive = {
      number: '1111',
      state: 'connected',
      hold: holdStub
    };
    MockNavigatorMozTelephony.active = mockActive;

    subject.call(dialNumber, 0);
    delete MockNavigatorMozTelephony.active;
    sinon.assert.calledWith(navigator.mozTelephony.dial, dialNumber);

    assert.isFalse(holdStub.calledBefore(navigator.mozTelephony.dial));
  });

  test('should hold the active group call before dialing (if there is one)',
  function() {
    var dialNumber = '123456';
    var holdStub = this.sinon.stub();
    MockNavigatorMozTelephony.conferenceGroup.calls =
      [{number: '111111', serviceId: 0}, {number: '222222', serviceId: 0}];
    MockNavigatorMozTelephony.conferenceGroup.state = 'connected';
    MockNavigatorMozTelephony.conferenceGroup.hold = holdStub;
    MockNavigatorMozTelephony.active =
      MockNavigatorMozTelephony.conferenceGroup;

    subject.call(dialNumber, 0);
    delete MockNavigatorMozTelephony.active;
    MockNavigatorMozTelephony.conferenceGroup.onheld();
    sinon.assert.calledWith(navigator.mozTelephony.dial, dialNumber);

    assert.isTrue(holdStub.calledBefore(navigator.mozTelephony.dial));
    assert.isNull(MockNavigatorMozTelephony.conferenceGroup.onheld);
  });

  test('should not dial when call limit reached (2 normal call)', function() {
    MockNavigatorMozTelephony.calls =
      [{number: '111111', serviceId: 0}, {number: '222222', serviceId: 0}];
    subject.call('333333', 0);
    assert.isTrue(spyConfirmShow.calledWith('unableToCallTitle',
                                            'unableToCallMessage'));
  });

  test('should not dial when call limit reached (1 normal call + 1 group call)',
  function() {
    MockNavigatorMozTelephony.calls = [{number: '111111', serviceId: 0}];
    MockNavigatorMozTelephony.conferenceGroup.calls =
      [{number: '222222', serviceId: 0}, {number: '333333', serviceId: 0}];
    subject.call('444444', 0);
    assert.isTrue(spyConfirmShow.calledWith('unableToCallTitle',
                                            'unableToCallMessage'));
  });

  test('should return null serviceId - no call', function() {
    assert.equal(subject.getInUseSim(), null);
  });

  test('should return call serviceId - call', function() {
    MockNavigatorMozTelephony.calls = [{number: '111111', serviceId: 0}];
    assert.equal(subject.getInUseSim(), 0);
  });

  test('should return call serviceId - conference call', function() {
    MockNavigatorMozTelephony.conferenceGroup.calls =
      [{number: '222222', serviceId: 0}, {number: '333333', serviceId: 0}];
    assert.equal(subject.getInUseSim(), 0);
  });

  test('should display an error if there is no network', function() {
    MockNavigatorMozMobileConnections[0].voice = null;
    var dialNumber = '01 45 34 55 20';
    subject.call(dialNumber, 0);
    assert.isTrue(spyConfirmShow.calledWith('emergencyDialogTitle',
                                            'emergencyDialogBodyBadNumber'));
  });

  test('should display an error if the number is invalid', function() {
    var dialNumber = '01sfsafs45 34 55 20';
    subject.call(dialNumber, 0);
    assert.isTrue(spyConfirmShow.calledWith('invalidNumberToDialTitle',
                                            'invalidNumberToDialMessage'));
  });

  suite('Callbacks binding', function() {
    test('should trigger oncall as soon as we get a call object',
    function(done) {
      subject.call('123', 0, function() {
        done();
      });
    });

    test('should bind the onconnected callback', function(done) {
      var onconnected = function uniq_onconnected() {};
      subject.call('123', 0, null, onconnected);
      mockPromise.then(function() {
        assert.equal(mockCall.onconnected, onconnected);
      }).then(done, done);
    });

    test('should bind the ondisconnected callback', function(done) {
      var ondisconnected = function uniq_ondisconnected() {};
      subject.call('123', 0, null, null, ondisconnected);
      mockPromise.then(function() {
        assert.isFunction(mockCall.ondisconnected);
        assert.equal(mockCall.ondisconnected, ondisconnected);
      }).then(done, done);
    });

    test('should trigger the onerror callback on error', function(done) {
      var onerrorStub = this.sinon.stub();
      subject.call('123', 0, null, null, null, onerrorStub);
      mockPromise.then(function() {
        mockCall.onerror(createCallError());
        sinon.assert.called(onerrorStub);
      }).then(done, done);
    });
  });

  suite('Call error handling', function() {
    suite('onerror call errors', function() {
      // BadNumberError can come from the network
      suite('BadNumberError handle', function() {
        test('should display the BadNumber message', function(done) {
          subject.call('123', 0);
          mockPromise.then(function() {
            mockCall.onerror(createCallError('BadNumberError'));
            sinon.assert.calledWith(spyConfirmShow,'invalidNumberToDialTitle',
                                                  'invalidNumberToDialMessage');
          }).then(done, done);
        });

        test('should display the NoNetwork message in emergency mode',
        function(done) {
          MockNavigatorMozMobileConnections[0].voice = {
            emergencyCallsOnly: true
          };
          subject.call('123', 0);
          mockPromise.then(function() {
            mockCall.onerror(createCallError('BadNumberError'));
            sinon.assert.calledWith(spyConfirmShow,'emergencyDialogTitle',
                                                'emergencyDialogBodyBadNumber');
          }).then(done, done);
        });
      });

      test('should handle BusyError', function(done) {
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('BusyError'));
          assert.isTrue(spyConfirmShow.calledWith('numberIsBusyTitle',
                                                  'numberIsBusyMessage'));
        }).then(done, done);
      });

      test('should play the busy tone', function(done) {
        var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('BusyError'));
          assert.isTrue(playSpy.calledOnce);
        }).then(done, done);
      });

      test('should handle FDNBlockedError', function(done) {
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('FDNBlockedError'));
          assert.isTrue(spyConfirmShow.calledWith('fdnIsActiveTitle',
                                                  'fdnIsActiveMessage'));
          assert.deepEqual(MockLazyL10n.keys.fdnIsActiveMessage,
                           {number: '123'});
        }).then(done, done);
      });

      test('should handle FdnCheckFailure', function(done) {
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('FdnCheckFailure'));
          assert.isTrue(spyConfirmShow.calledWith('fdnIsActiveTitle',
                                                  'fdnIsActiveMessage'));
          assert.deepEqual(MockLazyL10n.keys.fdnIsActiveMessage,
                           {number: '123'});
        }).then(done, done);
      });

      test('should handle DeviceNotAcceptedError', function(done) {
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('DeviceNotAcceptedError'));
          assert.isTrue(spyConfirmShow.calledWith('emergencyDialogTitle',
                                       'emergencyDialogBodyDeviceNotAccepted'));
        }).then(done, done);
      });
    });

    suite('promise errors', function() {
      // BadNumberError can come from a bad formatted number
      suite('BadNumberError handle', function() {
        test('should display the BadNumber message', function(done) {
          mockPromise = Promise.reject('BadNumberError');
          subject.call('123', 0);
          mockPromise.catch(function() {
            sinon.assert.calledWith(spyConfirmShow,'invalidNumberToDialTitle',
                                                  'invalidNumberToDialMessage');
          }).then(done, done);
        });

        test('should display the NoNetwork message in emergency mode',
        function(done) {
          mockPromise = Promise.reject('BadNumberError');
          MockNavigatorMozMobileConnections[0].voice = {
            emergencyCallsOnly: true
          };
          subject.call('123', 0);
          mockPromise.catch(function() {
            sinon.assert.calledWith(spyConfirmShow,'emergencyDialogTitle',
                                                'emergencyDialogBodyBadNumber');
          }).then(done, done);
        });
      });

      test('should handle RadioNotAvailable', function(done) {
        mockPromise = Promise.reject('RadioNotAvailable');
        subject.call('123', 0);
        mockPromise.catch(function() {
          sinon.assert.calledWith(spyConfirmShow, 'callAirplaneModeTitle',
                                                  'callAirplaneModeMessage');
        }).then(done, done);
      });

      test('should handle OtherConnectionInUse', function(done) {
        mockPromise = Promise.reject('OtherConnectionInUse');
        subject.call('123', 0);
        mockPromise.catch(function() {
          sinon.assert.calledWith(spyConfirmShow, 'otherConnectionInUseTitle',
                                                 'otherConnectionInUseMessage');
        }).then(done, done);
      });

      test('should handle unknown errors', function(done) {
        mockPromise = Promise.reject('Gloubiboulga');
        var onerrorSpy = this.sinon.spy();
        subject.call('123', 0, null, null, null, onerrorSpy);
        mockPromise.catch(function() {
          sinon.assert.calledWith(spyConfirmShow, 'unableToCallTitle',
                                                  'unableToCallMessage');
          sinon.assert.calledOnce(onerrorSpy);
        }).then(done, done);
      });
    });
  });

  test('should display a message if we didn\'t get a call back',
       function(done) {
    mockPromise = Promise.reject('');
    subject.call('123', 0);
    mockPromise.catch(function() {
      assert.isTrue(spyConfirmShow.calledWith('unableToCallTitle',
                                              'unableToCallMessage'));
    }).then(done, done);
  });

  test('should dial with correct card index', function() {
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    MockNavigatorMozMobileConnections[1].voice = {};
    subject.call('123', 1);
    sinon.assert.calledWith(navigator.mozTelephony.dial, '123', 1);
  });
});
