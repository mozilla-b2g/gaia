'use strict';

requireApp('communications/dialer/test/unit/mock_lazy_loader.js');
requireApp('communications/dialer/test/unit/mock_contacts.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');

requireApp('communications/dialer/test/unit/mock_moztelephony.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');
requireApp('communications/dialer/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_tone_player.js');

requireApp('communications/dialer/js/telephony_helper.js');

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
  var realMozTelephony;
  var realMozMobileConnection;
  var realMozL10n;
  var spyConfirmShow;
  var mockTelephony;

  mocksHelperForTelephonyHelper.attachTestHelpers();

  suiteSetup(function() {
    subject = TelephonyHelper;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockMozTelephony;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMozMobileConnection;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozL10n = realMozL10n;
  });

  setup(function() {
    spyConfirmShow = this.sinon.spy(ConfirmDialog, 'show');
    mockTelephony = this.sinon.mock(MockMozTelephony);
  });

  teardown(function() {
    MockMozMobileConnection.mTeardown();
    MockMozTelephony.mTeardown();
  });

  function createCallError(name) {
    return {call: {error: {name: (name || 'mock')}}};
  }

  test('should sanitize the given phone number before dialing', function() {
    var dialNumber = '(01) 45.34 55-20';
    mockTelephony.expects('dial').withArgs('0145345520');
    subject.call(dialNumber);
    mockTelephony.verify();
  });

  suite('should dialEmergency if the card state is unknown',
    function() {
      var initialState;

      setup(function() {
        initialState = MockIccHelper.mCardState;
        MockIccHelper.mCardState = 'unknown';
      });

      teardown(function() {
        MockIccHelper.mCardState = initialState;
      });

      test('and emergency call are allowed', function() {
        MockMozMobileConnection.voice.emergencyCallsOnly = true;
        var dialNumber = '112';
        mockTelephony.expects('dialEmergency').withArgs('112');
        subject.call(dialNumber);
        mockTelephony.verify();
      });
  });

  test('should dialEmergency if the connection is emergency only',
  function() {
    MockMozMobileConnection.voice.emergencyCallsOnly = true;
    var dialNumber = '112';
    mockTelephony.expects('dialEmergency').withArgs('112');
    subject.call(dialNumber);
    mockTelephony.verify();
  });

  test('should still dial when there\'s already a connected call',
  function() {
    var dialNumber = '123456';
    navigator.mozTelephony.active = {
      number: '1111',
      state: 'connected'
    };
    mockTelephony.expects('dial').withArgs('123456');
    subject.call(dialNumber);
    mockTelephony.verify();
  });

  test('should display an error if there is no network', function() {
    var dialNumber = '01 45 34 55 20';
    MockMozMobileConnection.voice = null;
    subject.call(dialNumber);
    assert.isTrue(spyConfirmShow.calledWith('emergencyDialogTitle',
                                            'emergencyDialogBodyBadNumber'));
  });

  test('should display an error if the number is invalid', function() {
    var dialNumber = '01sfsafs45 34 55 20';
    subject.call(dialNumber);
    assert.isTrue(spyConfirmShow.calledWith('invalidNumberToDialTitle',
                                            'invalidNumberToDialMessage'));
  });

  suite('Callbacks binding', function() {
    var mockCall;

    setup(function() {
      mockCall = {};
      this.sinon.stub(MockMozTelephony, 'dial').returns(mockCall);
    });

    test('should trigger oncall as soon as we get a call object',
    function(done) {
      subject.call('123', function() {
        done();
      });
    });

    test('should bind the onconnected callback', function() {
      var onconnected = function uniq_onconnected() {};
      subject.call('123', null, onconnected);
      assert.equal(mockCall.onconnected, onconnected);
    });

    test('should bind the ondisconnected callback', function() {
      var ondisconnected = function uniq_ondisconnected() {};
      subject.call('123', null, null, ondisconnected);
      assert.isFunction(mockCall.ondisconnected);
      assert.equal(mockCall.ondisconnected, ondisconnected);
    });

    test('should trigger the onerror callback on error', function(done) {
      subject.call('123', null, null, null, function() {
        done();
      });
      mockCall.onerror(createCallError());
    });
  });

  suite('Call error handling', function() {
    var mockCall;
    setup(function() {
      mockCall = {};
      this.sinon.stub(MockMozTelephony, 'dial').returns(mockCall);
      this.sinon.stub(MockMozTelephony, 'dialEmergency').returns(mockCall);
    });

    suite('BadNumberError handle', function() {
      test('should display the BadNumber message', function() {
        subject.call('123');
        mockCall.onerror(createCallError('BadNumberError'));
        assert.isTrue(spyConfirmShow.calledWith('invalidNumberToDialTitle',
                                                'invalidNumberToDialMessage'));
      });

      test('should display the NoNetwork message in emergency mode',
      function() {
        MockMozMobileConnection.voice.emergencyCallsOnly = true;
        subject.call('123');
        mockCall.onerror(createCallError('BadNumberError'));
        assert.isTrue(spyConfirmShow.calledWith('emergencyDialogTitle',
                                                'emergencyDialogBodyBadNumber'));
      });
    });

    test('should handle BusyError', function() {
      subject.call('123');
      mockCall.onerror(createCallError('BusyError'));
      assert.isTrue(spyConfirmShow.calledWith('numberIsBusyTitle',
                                              'numberIsBusyMessage'));
    });

    test('should handle FDNBlockedError', function() {
      subject.call('123');
      mockCall.onerror(createCallError('FDNBlockedError'));
      assert.isTrue(spyConfirmShow.calledWith('fdnIsEnabledTitle',
                                              'fdnIsEnabledMessage'));
    });

    test('should play the busy tone', function() {
      var playSpy = this.sinon.spy(MockTonePlayer, 'playSequence');
      subject.call('123');
      mockCall.onerror(createCallError('BusyError'));
      assert.isTrue(playSpy.calledOnce);
    });

    test('should handle DeviceNotAcceptedError', function() {
      subject.call('123');
      mockCall.onerror(createCallError('DeviceNotAcceptedError'));
      assert.isTrue(spyConfirmShow.calledWith('emergencyDialogTitle',
                                       'emergencyDialogBodyDeviceNotAccepted'));
    });

    test('should handle RadioNotAvailable', function() {
      subject.call('123');
      mockCall.onerror(createCallError('RadioNotAvailable'));
      assert.isTrue(spyConfirmShow.calledWith('callAirplaneModeTitle',
                                              'callAirplaneModeMessage'));
    });
  });

  test('should display a message if we didn\'t get a call back', function() {
    this.sinon.stub(MockMozTelephony, 'dial').returns(null);
    subject.call('123');
    assert.isTrue(spyConfirmShow.calledWith('unableToCallTitle',
                                            'unableToCallMessage'));
  });
});
