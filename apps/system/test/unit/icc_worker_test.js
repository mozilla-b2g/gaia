'use strict';

/* global MocksHelper, MockNavigatorMozIccManager, MockSystemICC, icc_worker */

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_dump.js');
requireApp('system/js/icc_worker.js');

mocha.globals(['icc']);

var mocksForIcc = new MocksHelper([
  'L10n',
  'Dump'
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
    stkTestCommands.STK_CMD_GET_INPUT = {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_GET_INPUT,
          commandQualifier: 0,
          options:{
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
      };
  });

  function launchStkCommand(cmd) {
    function stkCmd(CMD) {
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
      setTimeout(function() {
        callback(true, stkResponse);
      });
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
      setTimeout(function() {
        callback(false);
      });
    };
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_NO_RESPONSE_FROM_USER);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT);
  });
});
