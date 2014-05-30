'use strict';

/* global MocksHelper, MockNavigatorMozIccManager, MockSystemICC, icc_worker,
          MockNotifications */

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_dump.js');
requireApp('system/js/icc_worker.js');

var mocksForIcc = new MocksHelper([
  'L10n',
  'Dump',
  'Notification'
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
    icc_worker[stkCmd(cmd.command.typeOfCommand)](cmd);
  }

  test('Check Dummy response', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    icc_worker.dummy();
  });

  test('STK_CMD_GET_INPUT (User response)', function(done) {
    var stkResponse = 'stk introduced text';
    window.icc.input = function(stkMsg, message, timeout, options, callback) {
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
    window.icc.input = function(stkMsg, message, timeout, options, callback) {
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
    window.icc.onresponse = function(message, response) {
      // Notification showed
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_SET_UP_IDLE_MODE_TEXT);
    MockNotifications[0].onshow();
  });

  test('STK_CMD_REFRESH', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_REFRESH);
  });

  test('STK_CMD_PLAY_TONE', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_PLAY_TONE);
  });

  test('visibilitychange => STK_RESULT_UICC_SESSION_TERM_BY_USER',
    function(done) {
      window.icc.onresponse = function(message, response) {
        window.icc.onresponse = function() {};  // Avoid multiple calls
        assert.equal(response.resultCode,
          navigator.mozIccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER);
        done();
      };
      document.dispatchEvent(new CustomEvent('visibilitychange'));
    });
});
