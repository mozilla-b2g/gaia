/* global MocksHelper, MockNavigatorMozIccManager, icc,
          MockNavigatorMozMobileConnections, MockNavigatormozSetMessageHandler,
          MockL10n, MockFtuLauncher, MockNavigatorSettings, KeyboardEvent */
'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc_worker.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');


var mocksForIcc = new MocksHelper([
  'Dump',
  'FtuLauncher',
  'SystemICCWorker'
]).init();

suite('STK (icc) >', function() {
  mocksForIcc.attachTestHelpers();
  var realMozIccManager, realSettings, realL10n,
      realNavigatormozSetMessageHandler, realNavigatormozMobileConnections;
  var stkTestCommands = {};
  var xhrFake, xhrRequests = [];

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    MockNavigatormozSetMessageHandler.mSetup();
    realNavigatormozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realNavigatormozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;

    MockNavigatorMozIccManager.mTeardown();
    navigator.mozIccManager = realMozIccManager;

    navigator.mozL10n = realL10n;

    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realNavigatormozSetMessageHandler;

    MockNavigatorMozMobileConnections.mTeardown();
    navigator.mozMobileConnections = realNavigatormozMobileConnections;
  });

  setup(function(done) {
    MockFtuLauncher.mIsRunning = false;

    window.navigator.mozIccManager.addIcc('1010011010');

    stkTestCommands = {
      STK_CMD_GET_INPUT: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_GET_INPUT,
          commandQualifier: 0,
          options: {
            text: 'stk Input test text',
            duration: {
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
      }
    };

    xhrFake = sinon.useFakeXMLHttpRequest();
    xhrFake.onCreate = function (xhr) {
      xhrRequests.push(xhr);
    };

    requireApp('system/js/icc.js', done);
  });

  teardown(function() {
    xhrFake.restore();
  });

  function launchStkCommand(cmd) {
    icc.handleSTKCommand(cmd);
  }

  test('getIcc', function() {
    assert.isObject(window.icc.getIcc('1010011010'));
  });

  test('getIccInfo', function() {
    assert.equal(1, xhrRequests.length);
    assert.equal(xhrRequests[0].url, '/resources/icc.json');
    assert.equal(xhrRequests[0].method, 'GET');
    assert.equal(xhrRequests[0].responseType, 'json');
  });

  test('clearMenuCache', function(done) {
    window.icc.clearMenuCache(function() {
      var resetApplications = window.navigator.mozSettings.createLock().get(
        'icc.applications');
      resetApplications.onsuccess = function icc_resetApplications() {
        assert.equal(resetApplications.result['icc.applications'], '{}');
        done();
      };
    });
  });

  test('responseSTKCommand', function(done) {
    window.icc.getIcc('1010011010').sendStkResponse = function(msg, res) {
      assert.equal(res, 'dummy');
      done();
    };
    icc.responseSTKCommand(stkTestCommands.STK_CMD_GET_INPUT, 'dummy');
  });

  test('terminateResponse', function(done) {
    window.icc.getIcc('1010011010').sendStkResponse = function(msg, res) {
      assert.equal(res.resultCode,
        navigator.mozIccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER);
      done();
    };
    icc.terminateResponse(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('backResponse', function(done) {
    window.icc.getIcc('1010011010').sendStkResponse = function(msg, res) {
      assert.equal(res.resultCode,
        navigator.mozIccManager.STK_RESULT_BACKWARD_MOVE_BY_USER);
      done();
    };
    icc.backResponse(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('calculateDurationInMS', function() {
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_MINUTE, 1), 3600000);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_MINUTE, 2), 7200000);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_SECOND, 1), 1000);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_SECOND, 2), 2000);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_TENTH_SECOND, 1), 100);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_TENTH_SECOND, 2), 200);
  });

  test('hideViews', function() {
    window.icc.hideViews();
    assert.isFalse(document.getElementById('icc-view').classList.contains(
      'visible'));
    var icc_view_boxes = document.getElementById('icc-view').children;
    for (var i = 0; i < icc_view_boxes.length; i++) {
      assert.isFalse(icc_view_boxes[i].classList.contains('visible'));
    }
  });

  test('Sending incomplete message (empty object)', function() {
    icc.handleSTKCommand({});
  });

  test('Sending incomplete message (null)', function() {
    icc.handleSTKCommand(null);
  });

  test('Sending incomplete message (without iccId)', function() {
    icc.handleSTKCommand({ command: { typeOfCommand: 0, options: {} } });
  });

  test('Sending incomplete message (without command)', function() {
    icc.handleSTKCommand({ iccId: '1234' });
  });

  test('Sending incomplete message (without command.typeOfCommand)',
    function() {
      icc.handleSTKCommand({ command: { options: {} } });
    });

  test('Sending incomplete message (without command.options)', function() {
    icc.handleSTKCommand({ command: { typeOfCommand: 0 } });
  });

  test('UI: Input (timeout 1sec)', function(done) {
    var fakeClock = this.sinon.useFakeTimers(),
        testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, 1000,
      stkTestCommands.STK_CMD_GET_INPUT.command.options, function(res, value) {
        fakeClock.restore();
        done();
      });
    fakeClock.tick(1000);
  });

  test('UI: Input (contents)', function() {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, 0,
      stkTestCommands.STK_CMD_GET_INPUT.command.options, function() {});

    assert.equal(document.getElementById('icc-input-msg').textContent,
      testCmd.command.options.text);
    assert.equal(document.getElementById('icc-input-btn').textContent, 'OK');
    assert.equal(document.getElementById('icc-input-btn').disabled, false);
    assert.equal(document.getElementById('icc-input-btn_back').textContent,
      'Back');
    assert.equal(document.getElementById('icc-input-btn_help').textContent,
      'Help');
  });

  test('UI: Input (checkInputLengthValid)', function() {
    var fakeClock = this.sinon.useFakeTimers();
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, 0,
      stkTestCommands.STK_CMD_GET_INPUT.command.options, function() {});

    var button = document.getElementById('icc-input-btn');
    var inputbox = document.getElementById('icc-input-box');

    fakeClock.tick(500);
    fakeClock.restore();

    var event = new KeyboardEvent('keyup', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });

    assert.equal(button.disabled, false);
    // Length between 2 and 10, empty is disabled
    inputbox.value = '';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, true);

    inputbox.value = '1';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, true);

    inputbox.value = '12';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    inputbox.value = '123';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    inputbox.value = '1234567890';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    inputbox.value = '12345678901';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, true);
  });

  test('launchStkCommand: STK_CMD_GET_INPUT', function(done) {
    window.icc_worker.onmessagereceived = function(message) {
      assert.equal(message, stkTestCommands.STK_CMD_GET_INPUT);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('launchStkCommand: STK_CMD_SET_UP_IDLE_MODE_TEXT', function(done) {
    window.icc_worker.onmessagereceived = function(message) {
      assert.equal(message, stkTestCommands.STK_CMD_SET_UP_IDLE_MODE_TEXT);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_SET_UP_IDLE_MODE_TEXT);
  });

  test('launchStkCommand: STK_CMD_REFRESH', function(done) {
    window.icc_worker.onmessagereceived = function(message) {
      assert.equal(message, stkTestCommands.STK_CMD_REFRESH);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_REFRESH);
  });
});
