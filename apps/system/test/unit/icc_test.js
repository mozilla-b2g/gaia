/* global MocksHelper, MockNavigatorMozIccManager, icc, InputWindowManager,
          MockNavigatorMozMobileConnections, MockNavigatormozSetMessageHandler,
          MockL10n, MockFtuLauncher, MockNavigatorSettings, KeyboardEvent,
          StatusBar */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_system_icc_worker.js');
requireApp('system/test/unit/mock_ftu_launcher.js');
requireApp('system/test/unit/mock_statusbar.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/js/lazy_loader.js');
require('/js/input_window_manager.js');
require('/shared/test/unit/mocks/mock_stk_helper.js');

var mocksForIcc = new MocksHelper([
  'Dump',
  'FtuLauncher',
  'SystemICCWorker',
  'StatusBar',
  'STKHelper'
]).init();

suite('STK (icc) >', function() {
  mocksForIcc.attachTestHelpers();
  var realMozIccManager, realSettings, realL10n,
      realNavigatormozSetMessageHandler, realNavigatormozMobileConnections;
  var stkTestCommands = {};
  var xhrFake, xhrRequests = [];
  var resizeStub;

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

    window.softwareButtonManager = {};
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

    window.softwareButtonManager = null;
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

      STK_CMD_SET_UP_CALL: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_CALL,
          commandQualifier: 0,
          options: {
            confirmMessage: 'STK_CMD_SET_UP_IDLE_MODE_TEXT Unit Test',
            address: '990022'
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

      STK_CMD_SEND_DTMF: {
        iccId: '1010011010',
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SEND_DTMF,
          commandQualifier: 0,
          options: {
            text: 'stk display test text',
            userClear: true,
            duration: {
              timeUnit: navigator.mozIccManager.STK_TIME_UNIT_TENTH_SECOND,
              timeInterval: 5
            }
          }
        }
      }
    };

    xhrFake = sinon.useFakeXMLHttpRequest();
    xhrFake.onCreate = function (xhr) {
      xhrRequests.push(xhr);
    };

    window.inputWindowManager =
      this.sinon.stub(Object.create(InputWindowManager.prototype));

    requireApp('system/js/icc.js', function() {
      resizeStub = this.sinon.stub(icc, 'resize');
      done();
    }.bind(this));
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

  test('hide views when home button pressed and visible', function() {
    this.sinon.stub(icc, 'hideViews');
    icc.icc_view.classList.add('visible');
    var event = new CustomEvent('home');
    icc.handleEvent(event);
    assert.isTrue(icc.hideViews.called);
    icc.icc_view.classList.remove('visible');
  });

  test('does not hide when home and not visible', function() {
    this.sinon.stub(icc, 'hideViews');
    var event = new CustomEvent('home');
    icc.handleEvent(event);
    assert.isFalse(icc.hideViews.called);
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
      navigator.mozIccManager.STK_TIME_UNIT_MINUTE, 1), 60000);
    assert.equal(window.icc.calculateDurationInMS(
      navigator.mozIccManager.STK_TIME_UNIT_MINUTE, 2), 120000);
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

  test('UI: Display Text (timeout 1sec)', function(done) {
    var fakeClock = this.sinon.useFakeTimers(),
        testCmd = stkTestCommands.STK_CMD_DISPLAY_TEXT;
    window.icc.confirm(testCmd, testCmd.command.options.text, null, 1000,
      function(res, value) {
        fakeClock.restore();
        done();
      });
    fakeClock.tick(1000);
  });

  test('UI: Display Text (contents)', function() {
    var testCmd = stkTestCommands.STK_CMD_DISPLAY_TEXT;
    window.icc.confirm(testCmd, testCmd.command.options.text, null, 0,
      function() {});
    assert.equal(document.getElementById('icc-confirm-msg').textContent,
      testCmd.command.options.text);
    assert.equal(document.getElementById('icc-confirm-btn').disabled, false);
    assert.equal(document.getElementById('icc-confirm-btn_close').
      dataset.l10nId, 'close');
  });

  test('UI: Input (timeout 1sec)', function(done) {
    var fakeClock = this.sinon.useFakeTimers(),
        testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, null, 1000,
      stkTestCommands.STK_CMD_GET_INPUT.command.options, function(res, value) {
        fakeClock.restore();
        done();
      });
    fakeClock.tick(1000);
  });

  test('UI: Input (contents)', function() {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, null, 0,
      stkTestCommands.STK_CMD_GET_INPUT.command.options, function() {});

    assert.equal(document.getElementById('icc-input-msg').textContent,
      testCmd.command.options.text);

    var l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.equal(l10nAttrs.id, 'okCharsLeft');
    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      testCmd.command.options.defaultText.length) });
    assert.equal(document.getElementById('icc-input-btn').disabled, false);
    assert.equal(document.getElementById('icc-input-btn_help').dataset.l10nId,
      'help');
  });

  test('UI: Input (checkInputLengthValid)', function() {
    var fakeClock = this.sinon.useFakeTimers();
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, null, 0,
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

    var l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.equal(l10nAttrs.id, 'okCharsLeft');
    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });

    inputbox.value = '1';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, true);

    l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });

    inputbox.value = '12';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });

    inputbox.value = '123';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });

    inputbox.value = '1234567890';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, false);

    l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });

    inputbox.value = '12345678901';
    inputbox.dispatchEvent(event);
    assert.equal(button.disabled, true);

    l10nAttrs = navigator.mozL10n.getAttributes(
      document.getElementById('icc-input-btn'));

    assert.deepEqual(l10nAttrs.args, { n: (testCmd.command.options.maxLength -
      inputbox.value.length) });
  });

  test('launchStkCommand: STK_CMD_DISPLAY_TEXT', function(done) {
    window.icc_worker.onmessagereceived = function(message) {
      assert.equal(message, stkTestCommands.STK_CMD_DISPLAY_TEXT);
      done();
    };
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT);
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

  test('settings visibilitychange - STK_CMD_GET_INPUT', function(done) {
    var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
    window.icc.input(testCmd, testCmd.command.options.text, null, 40000,
      stkTestCommands.STK_CMD_GET_INPUT.command.options,
      function(resultObject) {
        assert.equal(resultObject, null);
        done();
    });
    window.dispatchEvent(new CustomEvent('stkMenuHidden'));
  });

  test('settings visibilitychange - STK_CMD_SET_UP_CALL', function(done) {
    var testCmd = stkTestCommands.STK_CMD_SET_UP_CALL;
    window.icc.asyncConfirm(testCmd, testCmd.command.options.confirmMessage,
      null, function(resultBoolean) {
        assert.equal(resultBoolean, false);
        done();
    });
    window.dispatchEvent(new CustomEvent('stkMenuHidden'));
  });

  test('handleSTKCommand - should call resize', function() {
    launchStkCommand(stkTestCommands.STK_CMD_DISPLAY_TEXT);

    assert.isTrue(resizeStub.calledOnce);
  });

  suite('Resize', function() {
    setup(function() {
      icc.resize.restore();
      window.layoutManager = {
        height: 100
      };
    });

    teardown(function() {
      window.layoutManager = null;
    });

    test('it sets the top depending on the Statusbar', function() {
      StatusBar.height = 13;
      window.icc.resize();
      assert.equal(icc.icc_view.style.top, StatusBar.height + 'px');
    });
  });

  suite('Replace STK messages >', function() {
    var stubResponseSTKCommand;
    var unableToProcess;

    setup(function() {
      icc.hideViews();
      stubResponseSTKCommand = this.sinon.stub(icc, 'responseSTKCommand',
        function(message, response) {
          message.response = true;
        });

      unableToProcess = {
        resultCode:
          navigator.mozIccManager.STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS
        };
    });

    test('Should respond STK_RESULT_TERMINAL_CRNTLY_UNABLE_TO_PROCESS',
      function() {
        icc._currentMessage = stkTestCommands.STK_CMD_GET_INPUT;
        icc.discardCurrentMessageIfNeeded(stkTestCommands.STK_CMD_DISPLAY_TEXT);
        assert.isTrue(stubResponseSTKCommand.calledWith(
        stkTestCommands.STK_CMD_GET_INPUT, unableToProcess));
    });

    test('Should not respond because the message has been already responded',
      function() {
        var testCommand = stkTestCommands.STK_CMD_DISPLAY_TEXT;
        testCommand.response = true;
        icc._currentMessage = testCommand;
        icc.discardCurrentMessageIfNeeded(stkTestCommands.STK_CMD_GET_INPUT);
        assert.isFalse(stubResponseSTKCommand.calledOnce);
    });
  });

  suite('STK messages with icons >', function() {
    var icons = [{
      'pixels':[0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
                0x000000FF,0x000000FF,0x000000FF,0x000000FF,
                0xFFFFFFFF,0x000000FF,0xFFFFFFFF,0x000000FF,
                0xFFFFFFFF,0x000000FF,0x000000FF,0xFFFFFFFF],
      'codingScheme': 'basic',
      'width': 4,
      'height': 4
    }];

    setup(function() {
      icc.hideViews();
      stkTestCommands.STK_CMD_SET_UP_CALL.icons = icons;
      stkTestCommands.STK_CMD_GET_INPUT.icons = icons;
      stkTestCommands.STK_CMD_DISPLAY_TEXT.icons = icons;
      stkTestCommands.STK_CMD_SEND_DTMF.icons = icons;
    });

    teardown(function() {
      delete stkTestCommands.STK_CMD_SET_UP_CALL.icons;
      delete stkTestCommands.STK_CMD_GET_INPUT.icons;
      delete stkTestCommands.STK_CMD_DISPLAY_TEXT.icons;
      delete stkTestCommands.STK_CMD_SEND_DTMF.icons;
    });

    test('UI: icons should be displayed - asyncconfirm', function() {
      var testCmd = stkTestCommands.STK_CMD_SET_UP_CALL;
      window.icc.asyncConfirm(testCmd, testCmd.command.options.confirmMessage,
        testCmd.icons, null);
      var img = document.getElementById('icc-asyncconfirm-icons');
      assert.equal(img.children.length, 1);
    });

    test('UI: icons should not be displayed - asyncconfirm', function() {
      var testCmd = stkTestCommands.STK_CMD_SET_UP_CALL;
      window.icc.asyncConfirm(testCmd, testCmd.command.options.confirmMessage,
        null, null);
      var img = document.getElementById('icc-asyncconfirm-icons');
      assert.equal(img.children.length, 0);
    });

    test('UI: icons should be displayed - confirm', function() {
      var testCmd = stkTestCommands.STK_CMD_DISPLAY_TEXT;
      window.icc.confirm(testCmd, testCmd.command.options.text, testCmd.icons,
        null);
      var img = document.getElementById('icc-confirm-icons');
      assert.equal(img.children.length, 1);
    });

    test('UI: icons should not be displayed - confirm', function() {
      var testCmd = stkTestCommands.STK_CMD_DISPLAY_TEXT;
      window.icc.confirm(testCmd, testCmd.command.options.text, null,
        null);
      var img = document.getElementById('icc-confirm-icons');
      assert.equal(img.children.length, 0);
    });

    test('UI: icons should be displayed - alert', function() {
      var testCmd = stkTestCommands.STK_CMD_SEND_DTMF;
      window.icc.alert(testCmd, testCmd.command.options.text, testCmd.icons);
      var img = document.getElementById('icc-alert-icons');
      assert.equal(img.children.length, 1);
    });

    test('UI: icons should not be displayed - alert', function() {
      var testCmd = stkTestCommands.STK_CMD_SEND_DTMF;
      window.icc.alert(testCmd, testCmd.command.options.text, null);
      var img = document.getElementById('icc-alert-icons');
      assert.equal(img.children.length, 0);
    });

    test('UI: icons should be displayed - input', function() {
      var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
      window.icc.input(testCmd, testCmd.command.options.text, testCmd.icons,
        0, testCmd.command.options, function() {});
      var img = document.getElementById('icc-input-icons');
      assert.equal(img.children.length, 1);
    });

    test('UI: icons should not be displayed - input', function() {
      var testCmd = stkTestCommands.STK_CMD_GET_INPUT;
      window.icc.input(testCmd, testCmd.command.options.text, null,
        0, testCmd.command.options, function() {});
      var img = document.getElementById('icc-input-icons');
      assert.equal(img.children.length, 0);
    });
  });
});
