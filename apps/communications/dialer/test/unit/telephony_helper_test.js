/* global ConfirmDialog, MockCall, MocksHelper, MockIccHelper,
          MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
          MockTelephonyMessages, TelephonyHelper, TelephonyMessages, Promise */

'use strict';

require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_contacts.js');
require('/shared/test/unit/mocks/dialer/mock_telephony_messages.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');

require('/dialer/test/unit/mock_icc_helper.js');

require('/dialer/js/telephony_helper.js');

var mocksHelperForTelephonyHelper = new MocksHelper([
  'Call',
  'Contacts',
  'ConfirmDialog',
  'LazyLoader',
  'IccHelper',
  'TelephonyMessages'
]).init();

function TelephonyCall() {}

suite('telephony helper', function() {
  const DTMF_SEPARATOR_PAUSE_DURATION = 3000;

  var subject;
  var realMozTelephony;
  var realMozMobileConnections;
  var spyConfirmShow;
  var mockTelephony;
  var mockCall;
  var mockPromise;

  mocksHelperForTelephonyHelper.attachTestHelpers();

  suiteSetup(function() {
    MockCall.prototype = new TelephonyCall();

    subject = TelephonyHelper;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    navigator.mozTelephony = realMozTelephony;
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    spyConfirmShow = this.sinon.spy(ConfirmDialog, 'show');
    mockTelephony = this.sinon.mock(MockNavigatorMozTelephony);
    mockCall = new MockCall('123456789', 'dialing', 0);
    MockNavigatorMozMobileConnections[0].voice = {};
    mockPromise = Promise.resolve(mockCall);
    this.sinon.stub(MockNavigatorMozTelephony, 'dial',
                    function() { return mockPromise;});
    this.sinon.stub(MockNavigatorMozTelephony, 'dialEmergency',
                    function() { return mockPromise;});
    this.sinon.stub(MockNavigatorMozTelephony, 'sendTones', function() {
      return Promise.resolve();
    });
  });

  teardown(function() {
    MockNavigatorMozMobileConnections.mTeardown();
    MockNavigatorMozTelephony.mTeardown();
  });

  function createCallError(name) {
    return {call: {error: {name: (name || 'mock')}}};
  }

  test('should sanitize the given phone number before dialing', function() {
    var dialNumber = '(01) 45.34 55-20';
    subject.call(dialNumber, 0);
    sinon.assert.calledWith(navigator.mozTelephony.dial, '0145345520');
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
      document.dispatchEvent(new CustomEvent('visibilitychange'));
    });

    test('should display the connecting message', function() {
      subject.call('112', 0);
      sinon.assert.calledWith(spyConfirmShow, 'connectingEllipsis', '');
    });

    test('should hide the connecting message', function() {
      subject.call('112', 0);
      var spyConfirmHide = this.sinon.spy(ConfirmDialog, 'hide');
      document.dispatchEvent(new CustomEvent('visibilitychange'));
      sinon.assert.calledOnce(spyConfirmHide);
    });

    suite('when there is no sim card', function() {
      test('it should always dial emergency with the first service',
      function() {
        var dialNumber = '112';
        subject.call(dialNumber, 0);
        sinon.assert.calledWith(navigator.mozTelephony.dialEmergency, '112');
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
                                '112');
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

  test('should NOT hold the active line before dialing',
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
    sinon.assert.calledWith(navigator.mozTelephony.dial, dialNumber);

    assert.isFalse(holdStub.calledBefore(navigator.mozTelephony.dial));
  });

  test('should not hold the active group call before dialing (if there is one)',
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
    sinon.assert.calledWith(navigator.mozTelephony.dial, dialNumber);

    sinon.assert.notCalled(holdStub);
  });

  test('should not dial when call limit reached (2 normal call)', function() {
    MockNavigatorMozTelephony.calls =
      [{number: '111111', serviceId: 0}, {number: '222222', serviceId: 0}];
    this.sinon.spy(MockTelephonyMessages, 'displayMessage');
    subject.call('333333', 0);
    sinon.assert.calledWith(MockTelephonyMessages.displayMessage,
                            'UnableToCall');
  });

  test('should not dial when call limit reached (1 normal call + 1 group call)',
  function() {
    MockNavigatorMozTelephony.calls = [{number: '111111', serviceId: 0}];
    MockNavigatorMozTelephony.conferenceGroup.calls =
      [{number: '222222', serviceId: 0}, {number: '333333', serviceId: 0}];
    this.sinon.spy(MockTelephonyMessages, 'displayMessage');
    subject.call('444444', 0);
    sinon.assert.calledWith(MockTelephonyMessages.displayMessage,
                            'UnableToCall');
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
    this.sinon.stub(MockTelephonyMessages, 'displayMessage');
    subject.call(dialNumber, 0);
    sinon.assert.calledWith(MockTelephonyMessages.displayMessage,
                            'NoNetwork');
  });

  test('should display an error if the number is invalid', function() {
    var dialNumber = '01sfsafs45 34 55 20';
    this.sinon.stub(MockTelephonyMessages, 'displayMessage');
    subject.call(dialNumber, 0);
    sinon.assert.calledWith(MockTelephonyMessages.displayMessage,
                            'BadNumber');
  });

  suite('Callbacks binding', function() {
    test('should trigger oncall as soon as we get a call object',
    function(done) {
      subject.call('123', 0, function() {
        done();
      });
    });

    test('should trigger the onconnected listeners when connected',
    function(done) {
      var onconnectedHandler = function() {
        done();
      };
      subject.call('123', 0, null, onconnectedHandler);
      mockPromise.then(function() {
        mockCall.triggerEvent('connected');
      });
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
      this.sinon.spy(MockTelephonyMessages, 'handleError');
      subject.call('123', 0, null, null, null, onerrorStub);
      mockPromise.then(function() {
        mockCall.onerror(createCallError());
        sinon.assert.calledOnce(onerrorStub);
      }).then(done, done);
    });
  });

  suite('Call error handling', function() {
    suite('onerror call errors', function() {
      test('should call with \'no connection\' set if emergency only',
      function(done) {
        MockNavigatorMozMobileConnections[0].voice =
          { emergencyCallsOnly: true };

        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('BadNumberError'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'BadNumberError', '123',
                                  MockTelephonyMessages.NO_NETWORK);
        }).then(done, done);
      });

      test('should display the BadNumber message', function(done) {
        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('BadNumberError'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'BadNumberError', '123',
                                  MockTelephonyMessages.REGULAR_CALL);
        }).then(done, done);
      });

      test('should handle BusyError', function(done) {
        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('BusyError'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'BusyError', '123',
                                  MockTelephonyMessages.REGULAR_CALL);
        }).then(done, done);
      });

      test('should handle FDNBlockedError', function(done) {
        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('FDNBlockedError'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'FDNBlockedError', '123',
                                  MockTelephonyMessages.REGULAR_CALL);
        }).then(done, done);
      });

      test('should handle FdnCheckFailure', function(done) {
        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('FdnCheckFailure'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'FdnCheckFailure', '123',
                                  MockTelephonyMessages.REGULAR_CALL);
        }).then(done, done);
      });

      test('should handle DeviceNotAcceptedError', function(done) {
        this.sinon.spy(MockTelephonyMessages, 'handleError');
        subject.call('123', 0);
        mockPromise.then(function() {
          mockCall.onerror(createCallError('DeviceNotAcceptedError'));
          sinon.assert.calledWith(MockTelephonyMessages.handleError,
                                  'DeviceNotAcceptedError', '123',
                                  MockTelephonyMessages.REGULAR_CALL);
        }).then(done, done);
      });
    });

    suite('promise errors', function() {
      test('should display the BadNumber message', function(done) {
        mockPromise = Promise.reject('BadNumberError');
        this.sinon.stub(MockTelephonyMessages, 'handleError',
        function(errorName, number, messageType) {
          assert.equal(errorName, 'BadNumberError');
          assert.equal(number, '123');
          assert.equal(messageType, MockTelephonyMessages.REGULAR_CALL);
          done();
        });
        subject.call('123', 0);
      });

      test('should handle RadioNotAvailable', function(done) {
        mockPromise = Promise.reject('RadioNotAvailable');
        this.sinon.stub(MockTelephonyMessages, 'handleError',
        function(errorName, number, messageType) {
          assert.equal(errorName, 'RadioNotAvailable');
          assert.equal(number, '123');
          assert.equal(messageType, MockTelephonyMessages.REGULAR_CALL);
          done();
        });
        subject.call('123', 0);
      });

      test('should handle OtherConnectionInUse', function(done) {
        mockPromise = Promise.reject('OtherConnectionInUse');
        this.sinon.stub(MockTelephonyMessages, 'handleError',
        function(errorName, number, messageType) {
          assert.equal(errorName, 'OtherConnectionInUse');
          assert.equal(number, '123');
          assert.equal(messageType, MockTelephonyMessages.REGULAR_CALL);
          done();
        });
        subject.call('123', 0);
      });

      test('should handle unknown errors', function(done) {
        mockPromise = Promise.reject('Gloubiboulga');
        this.sinon.stub(MockTelephonyMessages, 'handleError',
        function(errorName, number, messageType) {
          assert.equal(errorName, 'Gloubiboulga');
          assert.equal(number, '123');
          assert.equal(messageType, MockTelephonyMessages.REGULAR_CALL);
          done();
        });
        var onerrorStub = this.sinon.stub();
        subject.call('123', 0, null, null, null, onerrorStub);
      });
    });
  });

  test('should display a message if we didn\'t get a call back',
       function(done) {
    mockPromise = Promise.reject('');
    this.sinon.stub(MockTelephonyMessages, 'handleError',
    function(errorName, number, messageType) {
      assert.equal(errorName, '');
      assert.equal(number, '123');
      assert.equal(messageType, MockTelephonyMessages.REGULAR_CALL);
      done();
    });
    subject.call('123', 0);
  });

  test('should dial with correct card index', function() {
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    MockNavigatorMozMobileConnections[1].voice = {};
    subject.call('123', 1);
    sinon.assert.calledWith(navigator.mozTelephony.dial, '123', 1);
  });

  suite('<<pause>> DTMF separator', function() {
    test('should allow dialing number with DTMF separator', function() {
      subject.call('1233241,,123', 0);
      sinon.assert.calledWith(navigator.mozTelephony.dial, '1233241');
    });

    test('a number that starts with pause is invalid', function() {
      this.sinon.spy(TelephonyMessages, 'displayMessage');
      subject.call(',012023423', 0);
      sinon.assert.calledWith(TelephonyMessages.displayMessage, 'BadNumber');
    });

    test('should send DTMF tones after connection', function(done) {
      subject.call('1233241,123', 0);
      mockPromise.then(function() {
        sinon.assert.notCalled(MockNavigatorMozTelephony.sendTones);
        // Notify the connected event to the TelephonyCall.
        mockCall.triggerEvent('connected');
      }).then(function() {
        // Start playing the first tone group and pause.
        sinon.assert.calledWith(MockNavigatorMozTelephony.sendTones, '123',
          DTMF_SEPARATOR_PAUSE_DURATION, null, 0);
        done();
      });
    });

    test('should send DTMF tones with correct card index', function(done) {
      subject.call('123456,123', 1);
      mockPromise.then(function() {
        sinon.assert.notCalled(MockNavigatorMozTelephony.sendTones);
        // Notify the connected event to the TelephonyCall.
        mockCall.triggerEvent('connected');
      }).then(function() {
        // Start playing the first tone group and pause.
        sinon.assert.calledWith(MockNavigatorMozTelephony.sendTones, '123',
          DTMF_SEPARATOR_PAUSE_DURATION, null, 1);
        done();
      });
    });

    test('should wait 3 seconds after each separator', function(done) {
      subject.call('123456789,123,,456,,,789', 0);
      mockPromise.then(function() {
        sinon.assert.notCalled(MockNavigatorMozTelephony.sendTones);
        // Notify the connected event to the TelephonyCall.
        mockCall.triggerEvent('connected');
      }).then(function() {
        // Start playing the first tone group and pause.
        sinon.assert.calledWith(
          MockNavigatorMozTelephony.sendTones, '123',
          DTMF_SEPARATOR_PAUSE_DURATION, null, 0);
          return Promise.resolve();
      }).then(function() {
        // Start playing the second tone group and pauses.
        sinon.assert.calledWith(
          MockNavigatorMozTelephony.sendTones, '456',
          DTMF_SEPARATOR_PAUSE_DURATION * 2, null, 0);
        return Promise.resolve();
      }).then(function() {
        // Start playing the third tone group and pauses.
        sinon.assert.calledWith(
          MockNavigatorMozTelephony.sendTones, '789',
          DTMF_SEPARATOR_PAUSE_DURATION * 3, null, 0);
        done();
      });
    });

    test('should not play the pauses (",") at the end of the number',
    function(done) {
      subject.call('123456789,,,', 0);
      mockPromise.then(function() {
        sinon.assert.notCalled(MockNavigatorMozTelephony.sendTones);
        // Notify the connected event to the TelephonyCall.
        mockCall.triggerEvent('connected');
      }).then(function() {
        sinon.assert.notCalled(MockNavigatorMozTelephony.sendTones);
        done();
      });
    });
  });
});
