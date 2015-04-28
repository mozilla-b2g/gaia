/* global MockasyncStorage, SilentSms, MockMozAlarms, MocksHelper,
          MockNavigatormozSetMessageHandler
*/
'use strict';

require('/views/shared/test/unit/mock_moz_alarm.js');
require('/views/shared/test/unit/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/views/shared/js/task_runner.js');
require('/views/shared/js/silent_sms.js');

var mocksHelperForActivityHandler = new MocksHelper(['asyncStorage']).init();

suite('Silent SMS > ', function() {
  mocksHelperForActivityHandler.attachTestHelpers();

  var realMozSetMessageHandler,
      realMozAlarms,
      mozAlarmsId = 0;
  var FakePort = function() {};
  FakePort.prototype.postMessageToSms = function(e) {
    this.onmessage.call(this, e);
  };
  FakePort.prototype.postMessage = function(e) {};

  function MockAlarmRequest(willFail) {
    this._willFail = willFail;
  }

  Object.defineProperty(MockAlarmRequest.prototype, 'onsuccess', {
    set: function (callback) {
      if (!this._willFail) {
        this.result = mozAlarmsId++;
        (typeof callback === 'function') &&
          callback.call(this, { target: this });
      }
    }
  });

  Object.defineProperty(MockAlarmRequest.prototype, 'onerror', {
    set: function (callback) {
      if (this._willFail) {
        this.error = { name: 'error' };
        (typeof callback === 'function') &&
          callback.call(this, { target: this });
      }
    }
  });

  function newSuccessfulRequest() {
    return new MockAlarmRequest(false);
  }

  function newFailingRequest() {
    return new MockAlarmRequest(true);
  }

  suiteSetup(function() {
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    MockNavigatormozSetMessageHandler.mSetup();

    realMozAlarms = window.navigator.mozAlarms;
    window.navigator.mozAlarms = MockMozAlarms;
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    window.navigator.mozAlarms = realMozAlarms;
  });

  suite('connection from usage', function() {
    var request,
        message;
    var fakePort = new FakePort();

    setup(function() {
      SilentSms.init();
      request = {
        keyword: 'costcontrolSmsQuery',
        port: fakePort
      };
      MockNavigatormozSetMessageHandler.mTrigger('connection', request);

      message = {
        action: 'enable',
        smsNumbers: [1234],
        type: 'balance'
      };

    });

    teardown(function() {
      MockNavigatormozSetMessageHandler.mTeardown();
      MockasyncStorage.mTeardown();
      message = null;
    });

    test('silentMode is enabled correctly by IAC', function(done) {
      var request = newSuccessfulRequest();
      this.sinon.stub(navigator.mozAlarms, 'add').returns(request);

      var smsToSilent = [1234, 111, 234];
      message.smsNumbers = smsToSilent;
      this.sinon.stub(
        FakePort.prototype, 'postMessage',
        function assertionFunction(e) {
          done(function() {
            assert.equal(e, 'silentSMSEnabled');
            var usageSilentSms = MockasyncStorage.keys.usageSilentSms;
            var alarmId = usageSilentSms[message.type].alarmId;

            assert.isDefined(alarmId);
            assert.deepEqual(usageSilentSms[message.type].smsNumbers,
                             smsToSilent);
            var smsIndex = usageSilentSms.smsIndex;
            smsToSilent.forEach(function (silentSmsNumber) {
              assert.isTrue(smsIndex.indexOf(silentSmsNumber) !== -1);
            });
          });
        }
      );

      fakePort.postMessageToSms({
        data: message
      });
    });

    test('silentMode is disabled correctly by IAC', function(done) {
      var request = newSuccessfulRequest();
      this.sinon.stub(navigator.mozAlarms, 'add').returns(request);

      var alarmId, usageSilentSms;
      this.sinon.stub(
        FakePort.prototype, 'postMessage',
        function assertionFunction(actionMsg) {
          if (actionMsg === 'silentSMSEnabled') {
            try {
              usageSilentSms = MockasyncStorage.keys.usageSilentSms;
              // The Timeout alarm is actived and usageSilentSms has been
              // updated
              alarmId = usageSilentSms[message.type].alarmId;
              assert.ok(alarmId !== undefined);

              // Generating call for disable the silentMode for balance
              message.action = 'disable';

              fakePort.postMessageToSms({
                data: message
              });
            } catch (e) {
              done(e);
            }
          }

          if (actionMsg === 'silentSMSDisabled') {
            done(function() {
              usageSilentSms = MockasyncStorage.keys.usageSilentSms;
              // Check the usageSilentSms object was update
              assert.isNull(usageSilentSms[message.type]);
            });
          }
        }
      );

      fakePort.postMessageToSms({
        data: message
      });
    });

    test('silentMode is disabled correctly by an alarm', function(done) {
      var mAlarmData = {data: {
        alarmType: 'silentSmsTimeout',
        type: 'balance'
      }};

      MockasyncStorage.keys.usageSilentSms = {
        balance: {smsNumbers:[1234,111,234], alarmId: 1},
        smsIndex: [1234,111,234]
      };

      // Mocking asyncStorage because it's the last method called after an
      // alarm is fired.
      this.sinon.stub(MockasyncStorage, 'setItem', function(usageSilentSMS) {
        done(function() {
          usageSilentSMS = MockasyncStorage.keys.usageSilentSms;
          // Check the usageSilentSms object was update
          assert.isNull(usageSilentSMS.balance);
        });
      });

      // Firing the alarm to disable the balance silentMode
      MockNavigatormozSetMessageHandler.mTrigger('alarm', mAlarmData);

    });

    test('Received two enabled request for the same type before the timeout' +
         ' alarm is fired', function(done) {
      var request = newSuccessfulRequest();
      this.sinon.stub(navigator.mozAlarms, 'add').returns(request);

      var isFirstTime = true,
          alarmId;
      this.sinon.stub(
        FakePort.prototype, 'postMessage',
        function assertionFunction(e) {
          assert.equal(e, 'silentSMSEnabled');
          var usageSilentSms = MockasyncStorage.keys.usageSilentSms;
          if (isFirstTime) {
            try {
              isFirstTime = false;
              alarmId = usageSilentSms[message.type].alarmId;
              assert.ok(alarmId !== undefined);

              // Launched the second call
              fakePort.postMessageToSms({
                data: message
              });
            } catch(error) {
              done(error);
            }
          } else {
            done(function() {
              // The second call removes the first timeout alarm and adds
              // another one
              var newAlarmId = usageSilentSms[message.type].alarmId;
              assert.notEqual(alarmId, newAlarmId);
            });
          }
        }
      );

      fakePort.postMessageToSms({
        data: message
      });
    });

    test('silentMode is enabled correctly by IAC when addAlarm fails',
         function(done) {
      var request = newFailingRequest();
      this.sinon.stub(navigator.mozAlarms, 'add').returns(request);

      var NO_ALARM_ID = -1;
      this.sinon.stub(
        FakePort.prototype, 'postMessage',
        function assertionFunction(e) {
          done(function(){
            assert.equal(e, 'silentSMSEnabled');
            var usageSilentSms = MockasyncStorage.keys.usageSilentSms;
            var alarmId = usageSilentSms[message.type].alarmId;
            assert.equal(alarmId, NO_ALARM_ID);
          });
        }
      );

      fakePort.postMessageToSms({
        data: message
      });
    });

    test('Check checkSilentModeFor behaviour', function (done) {

      var fakeUsageSilentSms = {
        'balance': {
          'smsNumbers': [1234, 111, 234],
          'alarmId': 0,
          'timeAlarm': new Date()
        },
        'topup': {
          'smsNumbers': [888, 222],
          'alarmId': 0,
          'timeAlarm': new Date()
        },
        'smsIndex':[1234, 111, 234, 888, 222]
      };
      MockasyncStorage.keys.usageSilentSms = fakeUsageSilentSms;
      // Check a silent sms number
      SilentSms.checkSilentModeFor(1234).then(function (isSilent) {
        assert.isTrue(isSilent);
      }).then(SilentSms.checkSilentModeFor.bind(null, 999))
      .then(function (isSilent) {
          assert.isFalse(isSilent);
      }).then(done, done);
    });
  });
});
