'use strict';

/* global LazyLoader, MocksHelper, MockNavigatorMozIccManager, MockSystemICC,
          icc_worker,
          MockNotificationHelper, STKHelper, SystemBanner */

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_system_icc.js');
require('/test/unit/mock_system_banner.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_stk_helper.js');
require('/js/icc_worker.js');

var mocksForIcc = new MocksHelper([
  'Service',
  'L10n',
  'Dump',
  'LazyLoader',
  'NotificationHelper',
  'STKHelper',
  'SystemBanner'
]).init();

suite('STK (icc_worker) >', function() {
  mocksForIcc.attachTestHelpers();
  var realMozIccManager, realSystemICC;
  var stkTestCommands = {};

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    realSystemICC = window.icc;
    window.icc = MockSystemICC(MockNavigatorMozIccManager);
  });

  suiteTeardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    navigator.mozIccManager = realMozIccManager;
    MockSystemICC.mTeardown();
    window.icc = realSystemICC;
  });

  setup(function() {
    stkTestCommands = {
      STK_CMD_DISPLAY_TEXT: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_DISPLAY_TEXT,
          commandQualifier: 0,
          options: {
            text: 'stk display test text',
            userClear: true,
            responseNeeded: false,
            duration: {
              timeUnit: navigator.mozIccManager.STK_TIME_UNIT_TENTH_SECOND,
              timeInterval: 5
            }
          }
        }
      },

      STK_CMD_GET_INPUT: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_GET_INPUT,
          commandQualifier: 0,
          options: {
            text: 'stk Input test text',
            duration:{
              timeUnit: navigator.mozIccManager.STK_TIME_UNIT_TENTH_SECOND,
              timeInterval: 5
            },
            minLength: 2,
            maxLength: 10,
            defaultText: 'default'
          }
        }
      },

      STK_CMD_SET_UP_IDLE_MODE_TEXT: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_IDLE_MODE_TEXT,
          commandQualifier: 0,
          options: {
            text: 'STK_CMD_SET_UP_IDLE_MODE_TEXT Unit Test'
          }
        }
      },

      STK_CMD_REFRESH: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_REFRESH,
          commandQualifier: 0,
          options: {}
        }
      },

      STK_CMD_PLAY_TONE: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_PLAY_TONE,
          commandQualifier: 0,
          options: {
            text: 'abc',
            tone: '\u0001',
            duration: {
              timeUnit: navigator.mozIccManager.STK_TIME_UNIT_SECOND,
              timeInterval: 5
            }
          }
        }
      },

      STK_CMD_SET_UP_CALL: {
         iccId: '1010011010',
         command: {
           commandNumber: 1,
           typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_CALL,
           commandQualifier: 0,
           options: {
             address:'800',
             confirmMessage:{
               text:'TestService'
             }
           }
         }
       },

       STK_CMD_SET_UP_CALL_NO_CONFIRM_MSG: {
         iccId: '1010011010',
         command: {
           commandNumber: 1,
           typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_CALL,
           commandQualifier: 0,
           options: {
             address:'800'
           }
         }
       },

       STK_CMD_SEND_SMS: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SEND_SMS,
          commandQualifier: 0,
          options: {}
        }
       }
    };
  });

  function launchStkCommand(cmd) {
    function stkCmd(CMD) {
      /* TODO: cleanup this function after bug 819831 landed */
      if (typeof CMD === 'string') {
        return CMD;
      }
      return '0x' + CMD.toString(16);
    }
    return icc_worker[stkCmd(cmd.command.typeOfCommand)](cmd);
  }

  test('Check Dummy response', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    icc_worker.dummy();
  });

  test('STK_CMD_DISPLAY_TEXT (User response)', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT);
  });

  test('STK_CMD_DISPLAY_TEXT (Timeout)', function(done) {
    window.icc.confirm = function(stkMsg, message, icons, timeout, callback) {
      callback(false);
    };
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_NO_RESPONSE_FROM_USER);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT);
  });

  test('STK_CMD_GET_INPUT (User response)', function(done) {
    var stkResponse = 'stk introduced text';
    window.icc.input = function(stkMsg, message, icons, timeout,
      options, callback) {
        callback(true, stkResponse);
    };
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      assert.equal(response.input, stkResponse);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('STK_CMD_GET_INPUT (Timeout)', function(done) {
    window.icc.input = function(stkMsg, message, icons, timeout,
      options, callback) {
        callback(false);
    };
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_NO_RESPONSE_FROM_USER);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('STK_CMD_SET_UP_IDLE_MODE_TEXT', function(done) {
    var fakeNotification = {
      close: function() {}
    };
    this.sinon.stub(MockNotificationHelper, 'send', function() {
      return Promise.resolve(fakeNotification);
    });

    window.icc.onresponse = function(message, response) {
      // Notification showed
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_SET_UP_IDLE_MODE_TEXT).then(() => {
      fakeNotification.onshow();
    });
  });

  test('STK_CMD_SET_UP_CALL', function(done) {
    window.icc.asyncConfirm = function(stkMsg, message, icons, callback) {
       assert.equal(stkTestCommands.STK_CMD_SET_UP_CALL.
         command.options.confirmMessage.text,
         message);
       callback(false);
     };
     window.icc.onresponse = function(message, response) {
       assert.equal(response.resultCode,
         navigator.mozIccManager.STK_RESULT_OK);
       done();
     };
     launchStkCommand(stkTestCommands.STK_CMD_SET_UP_CALL);
   });

   test('STK_CMD_SET_UP_CALL (No Confirm Message)', function(done) {
     window.icc.asyncConfirm = function(stkMsg, message, icons, callback) {
       assert.equal('icc-confirmCall-defaultmessage', message);
       callback(false);
     };
     window.icc.onresponse = function(message, response) {
       assert.equal(response.resultCode,
         navigator.mozIccManager.STK_RESULT_OK);
       done();
     };
     launchStkCommand(stkTestCommands.STK_CMD_SET_UP_CALL_NO_CONFIRM_MSG);
   });

  test('STK_CMD_REFRESH', function() {
    var spy = this.sinon.spy(icc_worker, '0x1');
    launchStkCommand(stkTestCommands.STK_CMD_REFRESH);
    assert.isTrue(spy.calledWith(stkTestCommands.STK_CMD_REFRESH));
  });

  test('STK_CMD_PLAY_TONE', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_PLAY_TONE);
  });

  suite('STK_CMD_SEND_SMS', function() {
    setup(function() {
      this.sinon.stub(window.icc, 'confirm');
      this.sinon.stub(SystemBanner.prototype, 'show');
      this.sinon.stub(LazyLoader, 'load').returns(Promise.resolve());
      this.sinon.stub(STKHelper, 'getMessageText');
    });

    test('Without any text', function(done) {
      launchStkCommand(stkTestCommands.STK_CMD_SEND_SMS).then(() => {
        sinon.assert.notCalled(SystemBanner.prototype.show);
        sinon.assert.notCalled(LazyLoader.load);
      }).then(done, done);
    });

    test('Using l10nId', function(done) {
      stkTestCommands.STK_CMD_SEND_SMS.command.options.text = 'test';

      var l10nArgs = { id: 'key', args: { arg: 'arg' }};

      STKHelper.getMessageText.returns(l10nArgs);

      launchStkCommand(stkTestCommands.STK_CMD_SEND_SMS).then(() => {
        sinon.assert.calledWith(SystemBanner.prototype.show, l10nArgs);
      }).then(done, done);
    });

    test('Using a raw text', function(done) {
      stkTestCommands.STK_CMD_SEND_SMS.command.options.text = 'test';

      var l10nArgs = { raw: 'raw-text' };

      STKHelper.getMessageText.returns(l10nArgs);

      launchStkCommand(stkTestCommands.STK_CMD_SEND_SMS).then(() => {
        sinon.assert.calledWith(SystemBanner.prototype.show, l10nArgs);
      }).then(done, done);
    });

    test('Using an empty raw text', function(done) {
      stkTestCommands.STK_CMD_SEND_SMS.command.options.text = 'test';

      var l10nArgs = { raw: '' };

      STKHelper.getMessageText.returns(l10nArgs);

      launchStkCommand(stkTestCommands.STK_CMD_SEND_SMS).then(() => {
        sinon.assert.notCalled(LazyLoader.load);
        sinon.assert.notCalled(SystemBanner.prototype.show);
      }).then(done, done);
    });
  });
});
