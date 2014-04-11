/* global MocksHelper, MockNavigatorMozIccManager, icc, MockIccHelper,
          MockNavigatorMozMobileConnections, MockNavigatormozSetMessageHandler,
          MockL10n, MockFtuLauncher, MockNavigatorSettings */
'use strict';

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc_worker.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');


mocha.globals(['FtuLaucher', 'icc_worker', 'icc', 'IccHelper']);

var mocksForIcc = new MocksHelper([
  'Dump',
  'FtuLauncher',
  'SystemICCWorker'
]).init();

suite('STK (icc) >', function() {
  mocksForIcc.attachTestHelpers();
  var realMozIccManager, realSettings, realL10n, realIccHelper,
      realNavigatormozSetMessageHandler, realNavigatormozMobileConnections;
  var stkTestCommands = {};

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

    MockIccHelper.mSuiteSetup();
    realIccHelper = window.IccHelper;
    window.IccHelper = MockIccHelper;
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

    window.IccHelper = realIccHelper;
    MockIccHelper.mSuiteTeardown();
  });

  setup(function(done) {
    MockFtuLauncher.mIsRunning = false;

    requireApp('system/js/icc.js', done);
  });

  function launchStkCommand(cmd) {
    icc.handleSTKCommand(cmd);
  }

  setup(function() {
    window.navigator.mozIccManager.addIcc('1010011010');

    stkTestCommands.STK_CMD_GET_INPUT = {
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
      };
  });

  test('getIccInfo', function(done) {
    window.icc.getIccInfo();
    setTimeout(function() {
      assert.equal(window.icc._defaultURL,
        'http://www.mozilla.org/en-US/firefoxos/');
      done();
    }, 100);
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
    window.IccHelper.sendStkResponse = function(cmd, res) {
      assert.equal(res, 'dummy');
      done();
    };
    icc.responseSTKCommand('dummy');
  });

  test('terminateResponse', function(done) {
    window.IccHelper.sendStkResponse = function(cmd, res) {
      assert.equal(res.resultCode,
        navigator.mozIccManager.STK_RESULT_UICC_SESSION_TERM_BY_USER);
      done();
    };
    icc.terminateResponse(stkTestCommands.STK_CMD_GET_INPUT);
  });

  test('backResponse', function(done) {
    window.IccHelper.sendStkResponse = function(cmd, res) {
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

  test('UI: Input (timeout 1sec)', function(done) {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd.options.text, 1000,
      stkTestCommands.STK_CMD_GET_INPUT.options, function(res, value) {
        assert.isTrue(true);
        done();
      });
  });

  test('UI: Input (contents)', function(done) {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd.options.text, 0,
      stkTestCommands.STK_CMD_GET_INPUT.options, function() {});

    // We need to wait because workaround. See bug #818270. Followup: #895314
    // See function workaround_bug818270 in icc.js
    setTimeout(function() {
      assert.equal(document.getElementById('icc-input-msg').textContent,
        testCmd.options.text);
      assert.equal(document.getElementById('icc-input-btn').textContent, 'OK');
      assert.equal(document.getElementById('icc-input-btn').disabled, false);
      assert.equal(document.getElementById('icc-input-btn_back').textContent,
        'Back');
      assert.equal(document.getElementById('icc-input-btn_help').textContent,
        'Help');
      done();
    }, 600);
  });

  test('UI: Input (checkInputLengthValid)', function() {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd.options.text, 0,
      stkTestCommands.STK_CMD_GET_INPUT.options, function() {});

    var button = document.getElementById('icc-input-btn');
    var inputbox = document.getElementById('icc-input-box');

    // We need to wait because workaround. See bug #818270. Followup: #895314
    // See function workaround_bug818270 in icc.js
    setTimeout(function() {
      // Using default string shall be enabled
      assert.equal(button.disabled, false);
      // Length between 3 and 10, empty is disabled
      inputbox.value = '';
      assert.equal(button.disabled, true);
      inputbox.value = '1';
      assert.equal(button.disabled, true);
      inputbox.value = '12';
      assert.equal(button.disabled, true);
      inputbox.value = '123';
      assert.equal(button.disabled, false);
      inputbox.value = '1234567890';
      assert.equal(button.disabled, false);
      inputbox.value = '12345678901';
      assert.equal(button.disabled, true);
    }, 600);
  });

  test('launchStkCommand: STK_CMD_GET_INPUT', function(done) {
    window.icc_worker.onmessagereceived = function(message) {
      assert.equal(message, stkTestCommands.STK_CMD_GET_INPUT);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_GET_INPUT);
  });

});
