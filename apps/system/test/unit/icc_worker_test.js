'use strict';

/* global MocksHelper, MockNavigatorMozIccManager, MockSystemICC, icc_worker,
          MockNotifications */

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc.js');
requireApp('system/test/unit/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_dump.js');
requireApp('system/js/icc_worker.js');

var mocksForIcc = new MocksHelper([
  'AppWindowManager',
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
    var sampleIcons = [{
      pixels:[
        4294967295, 4294967295, 4294967295, 4294967295,
        4294967295, 4294967295, 4294967295, 255,
        4294967295, 4294967295, 4294967295, 255,
        4294967295, 255, 4294967295, 4294967295,
        4294967295, 255, 4294967295, 4294967295,
        4294967295, 4294967295, 4294967295, 4294967295,
        4294967295
      ],
      codingScheme:'basic',
      width:5,
      height:5
    }];
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

      STK_CMD_DISPLAY_TEXT_with_icons: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_DISPLAY_TEXT,
          commandQualifier: 0,
          options: {
            text: 'stk display test text',
            userClear: true,
            responseNeeded: false,
            icons: sampleIcons,
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

      STK_CMD_GET_INPUT_with_icons: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_GET_INPUT,
          commandQualifier: 0,
          options: {
            text: 'stk Input test text',
            icons: sampleIcons,
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

      STK_CMD_SET_UP_IDLE_MODE_TEXT_with_icons: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_IDLE_MODE_TEXT,
          commandQualifier: 0,
          options: {
            icons:sampleIcons,
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

      STK_CMD_PLAY_TONE_with_icons: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_PLAY_TONE,
          commandQualifier: 0,
          options: {
            text: 'abc',
            tone: '\u0001',
            icons: sampleIcons,
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

  test('STK_CMD_DISPLAY_TEXT (User response)', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode, navigator.mozIccManager.STK_RESULT_OK);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT);
  });

  test('STK_CMD_DISPLAY_TEXT (With icons)', function(done) {
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_PRFRMD_ICON_NOT_DISPLAYED);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT_with_icons);
  });

  test('STK_CMD_DISPLAY_TEXT (Timeout)', function(done) {
    window.icc.confirm = function(stkMsg, message, timeout, callback) {
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

  test('STK_CMD_GET_INPUT (With icons)', function(done) {
    var stkResponse = 'stk introduced text';
    window.icc.input = function(stkMsg, message, timeout, options, callback) {
      callback(true, stkResponse);
    };
    window.icc.onresponse = function(message, response) {
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_PRFRMD_ICON_NOT_DISPLAYED);
      assert.equal(response.input, stkResponse);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT_with_icons);
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

  test('STK_CMD_SET_UP_IDLE_MODE_TEXT (With icons)', function(done) {
    window.icc.onresponse = function(message, response) {
      // Notification showed
      assert.equal(response.resultCode,
        navigator.mozIccManager.STK_RESULT_PRFRMD_ICON_NOT_DISPLAYED);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_SET_UP_IDLE_MODE_TEXT_with_icons);
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

});
