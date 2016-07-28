/* global MocksHelper, MockGeolocation, MockNavigatormozSetMessageHandler,
   MockSettingsHelper, MockNavigatorSettings, FindMyDevice, MockMozAlarms,
   IAC_API_WAKEUP_REASON_LOGIN, IAC_API_WAKEUP_REASON_LOGOUT,
   IAC_API_WAKEUP_REASON_TRY_DISABLE, IAC_API_WAKEUP_REASON_ENABLED_CHANGED,
   IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED, Commands
*/

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_async_storage.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/findmydevice_iac_api.js');
require('/shared/test/unit/mocks/mock_moz_alarms.js');

var mocksForFindMyDevice = new MocksHelper([
  'asyncStorage',
  'Dump',
  'Geolocation',
  'SettingsHelper'
]).init();

suite('FindMyDevice >', function() {
  var realMozId;
  var realMozSettings;
  var realMozSetMessageHandler;
  var realMozAlarms;
  var realNavigatorOnLine;
  var realCommands;
  var observerSpy;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realMozId = navigator.mozId;
    // attempting to stub only the request method of mozId,
    // as in |sinon.stub(navigator.mozId, 'request', ...)|,
    // causes an exception to be raised, so we replace the
    // entire mozId object.
    navigator.mozId = {
      request: sinon.stub(),
      watch: sinon.stub()
    };

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realMozAlarms = navigator.mozAlarms;
    navigator.mozAlarms = MockMozAlarms;

    realNavigatorOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      fakeOnLine: true,
      configurable: true,
      get: function() { return this.fakeOnLine; },
      set: function(status) { this.fakeOnLine = !!status; }
    });

    window.Config = {
      api_url: 'https://find.firefox.com',
      api_version: 'v0'
    };

    observerSpy = sinon.spy(MockNavigatorSettings, 'addObserver');

    // We require findmydevice.js here and not above because
    // we want to make sure all of our dependencies have already
    // been loaded.
    require('/js/findmydevice.js', function() {
      // We stub navigator.mozId.watch above, so FindMyDevice.init()
      // is effectively a no-op. We don't need to fully initialize FMD for
      // these tests, so just register for the events we care about below.
      FindMyDevice._observeSettings();
      FindMyDevice._initMessageHandlers();
      done();
    });
  });

  suiteTeardown(function() {
    observerSpy.restore();

    delete window.Config;

    navigator.mozId = realMozId;

    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();

    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mTeardown();

    navigator.mozAlarms = realMozAlarms;

    if (realNavigatorOnLine) {
      Object.defineProperty(navigator, 'onLine', realNavigatorOnLine);
    }
  });

  setup(function(done) {
    this.sinon.stub(FindMyDevice, '_reportDisabled');
    this.sinon.stub(FindMyDevice, '_replyAndFetchCommands');

    realCommands = window.Commands;
    window.Commands = {
      invokeCommand: this.sinon.stub(),
      deviceHasPasscode: null
    };

    // XXX(ggp) force re-creation of the SettingsHelper objects
    // used by FMD, since MockSettingsHelper invalidates all objects
    // in its mTeardown.
    FindMyDevice._initSettings(done);

    navigator.onLine = true;
  });

  teardown(function() {
    FindMyDevice._enabled = false;
    FindMyDevice._registered = false;
    FindMyDevice._loggedIn = false;
    FindMyDevice._state = null;
    window.Commands = realCommands;
  });

  function sendWakeUpMessage(reason) {
    var port = {};
    MockNavigatormozSetMessageHandler.mTrigger('connection',
      {port: port, keyword: 'findmydevice-wakeup'});
    port.onmessage({data: reason});
  }

  test('ensure retry counter is reset on enable', function() {
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);

    MockSettingsHelper('findmydevice.retry-count').get(
      function(val) {
        assert.equal(val, 0, 'retry count should be 0');
      });
  });

  test('retryCount is not incremented on error if registered', function() {
    FindMyDevice._registered = true;
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);

    this.sinon.stub(FindMyDevice, 'beginHighPriority');
    this.sinon.stub(FindMyDevice, 'endHighPriority');

    // simulate 3 failed requests
    FindMyDevice._handleServerError({status:401});
    FindMyDevice._handleServerError({status:401});
    FindMyDevice._handleServerError({status:401});

    MockSettingsHelper('findmydevice.retry-count').get(
      function(val) {
        assert.equal(val, 0, 'retry count should be 0');
      });
  });

  test('retryCount is incremented on error when not registered', function() {
    FindMyDevice._registered = false;
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);

    this.sinon.stub(FindMyDevice, 'beginHighPriority');
    this.sinon.stub(FindMyDevice, 'endHighPriority');

    // simulate 3 failed requests
    FindMyDevice._handleServerError({status:401});
    FindMyDevice._handleServerError({status:401});
    FindMyDevice._handleServerError({status:401});

    MockSettingsHelper('findmydevice.retry-count').get(
      function(val) {
        assert.equal(val, 3, 'retry count should be 3');
      });
  });

  test('retryCount is not incremented when offline', function() {
    FindMyDevice._registered = false;
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);

    this.sinon.stub(FindMyDevice, 'beginHighPriority');
    this.sinon.stub(FindMyDevice, 'endHighPriority');
    navigator.onLine = false;

    // Simulate 3 failed requests
    FindMyDevice._handleServerError({status: 401});
    FindMyDevice._handleServerError({status: 401});
    FindMyDevice._handleServerError({status: 401});

    MockSettingsHelper('findmydevice.retry-count').get(
      function(val) {
        assert.equal(val, 0, 'retry count should be 0');
      });
  });

  test('fields from coordinates are included in server response', function() {
    FindMyDevice._registered = true;
    FindMyDevice._enabled = true;

    FindMyDevice._replyCallback('t', true, MockGeolocation.fakePosition);
    sinon.assert.called(FindMyDevice._replyAndFetchCommands);
    assert.deepEqual(FindMyDevice._reply.t, {
      ok: true,
      la: MockGeolocation.fakePosition.coords.latitude,
      lo: MockGeolocation.fakePosition.coords.longitude,
      acc: MockGeolocation.fakePosition.coords.accuracy,
      ti: MockGeolocation.fakePosition.timestamp
    });
  });

  test('error message is included in the server response', function() {
    FindMyDevice._registered = true;
    FindMyDevice._enabled = true;

    var message = 'error message';
    FindMyDevice._replyCallback('t', false, message);
    sinon.assert.called(FindMyDevice._replyAndFetchCommands);
    assert.equal(FindMyDevice._reply.t.error, message);
  });

  suite('settings observers', function() {
    test('Observes findmydevice.registered', function() {
      sinon.assert.calledWith(observerSpy, 'findmydevice.registered');
      assert.isTrue('_registered' in FindMyDevice);
      assert.equal('object', typeof FindMyDevice._registeredHelper);
      assert.notEqual(null, FindMyDevice._registeredHelper);
    });

    test('Observes findmydevice.enabled', function() {
      sinon.assert.calledWith(observerSpy, 'findmydevice.enabled');
      assert.isTrue('_enabled' in FindMyDevice);
      assert.equal('object', typeof FindMyDevice._enabledHelper);
      assert.notEqual(null, FindMyDevice._enabledHelper);
    });

    test('Observes findmydevice.current-clientid', function() {
      sinon.assert.calledWith(observerSpy, 'findmydevice.current-clientid');
      assert.isTrue('_currentClientID' in FindMyDevice);
      assert.equal('object', typeof FindMyDevice._currentClientIDHelper);
      assert.notEqual(null, FindMyDevice._currentClientIDHelper);
    });

    test('Observes findmydevice.can-disable', function() {
      sinon.assert.calledWith(observerSpy, 'findmydevice.can-disable');
      assert.isTrue('_canDisable' in FindMyDevice);
      assert.equal('object', typeof FindMyDevice._canDisableHelper);
      assert.notEqual(null, FindMyDevice._canDisableHelper);
    });
  });

  suite('settings handlers', function() {
    var endHighPriorityStub;

    suite('Changes to findmydevice.registered', function() {
      var contactServerSpy, loadStateSpy, currentIdHelperSpy;
      var _registered = {};

      setup(function() {
        contactServerSpy    = this.sinon.spy(FindMyDevice, '_contactServer');
        loadStateSpy        = this.sinon.spy(FindMyDevice, '_loadState');
        currentIdHelperSpy  =
          this.sinon.spy(FindMyDevice._currentClientIDHelper, 'set');
        endHighPriorityStub = this.sinon.stub(FindMyDevice, 'endHighPriority');
      });

      suite('when not registered', function() {
        setup(function() {
          _registered = { settingValue: false};
        });

        test('contact server', function() {
          FindMyDevice._onRegisteredChanged(_registered);
          sinon.assert.calledOnce(contactServerSpy);
          sinon.assert.notCalled(loadStateSpy);
          sinon.assert.notCalled(currentIdHelperSpy);
        });

        test('end wakelock section', function() {
          FindMyDevice._onRegisteredChanged(_registered);
          sinon.assert.calledWith(endHighPriorityStub, 'clientLogic');
          sinon.assert.notCalled(loadStateSpy);
          sinon.assert.notCalled(currentIdHelperSpy);
        });
      });

      suite('when registered', function() {
        setup(function() {
          _registered = { settingValue: true};
        });

        test('does load state', function() {
          FindMyDevice._onRegisteredChanged(_registered);
          sinon.assert.calledOnce(loadStateSpy);
        });

        test('does contact server', function() {
          FindMyDevice._onRegisteredChanged(_registered);
          sinon.assert.calledOnce(contactServerSpy);
        });

        test('does set empty current id', function() {
          FindMyDevice._onRegisteredChanged(_registered);
          sinon.assert.calledOnce(currentIdHelperSpy);
          sinon.assert.calledWith(currentIdHelperSpy, '');
        });
      });
    });

    test('Changes to findmydevice.enabled', function() {
      assert.isTrue(true, 'nothing to do');
    });

    suite('Changes to findmydevice.current-clientid', function() {
      var _currentClientId = {};
      var refreshClientStub;

      setup(function() {
        endHighPriorityStub = this.sinon.stub(FindMyDevice, 'endHighPriority');
        refreshClientStub   =
          this.sinon.stub(FindMyDevice, '_refreshClientIDIfRegistered');
      });

      suite('logged and no clientid', function() {
        var oldLogged;

        setup(function() {
          _currentClientId       = { settingValue: ''};
          oldLogged              = FindMyDevice._loggedIn;
          FindMyDevice._loggedIn = true;
        });

        teardown(function() {
          FindMyDevice._loggedIn = oldLogged;
        });

        test('client id refresh', function() {
          FindMyDevice._onClientIDChanged(_currentClientId);
          sinon.assert.calledOnce(refreshClientStub);
          sinon.assert.calledWith(refreshClientStub, false);
        });

        test('end of wakelock section', function() {
          FindMyDevice._onClientIDChanged(_currentClientId);
          sinon.assert.calledWith(endHighPriorityStub, 'clientLogic');
        });
      });

      suite('not logged/has clientid and registered', function() {
        var oldLogged, oldRegistered, oldState;

        setup(function() {
          _currentClientId         = { settingValue: 'cid'};
          oldLogged                = FindMyDevice._loggedIn;
          oldRegistered            = FindMyDevice._registered;
          oldState                 = FindMyDevice._state;
          FindMyDevice._loggedIn   = false;
          FindMyDevice._registered = true;
          FindMyDevice._state      = { };
        });

        teardown(function() {
          FindMyDevice._loggedIn   = oldLogged;
          FindMyDevice._registered = oldRegistered;
          FindMyDevice._state      = oldState;
        });

        suite('calls to canDisableHelper', function() {
          var canDisableSpy;

          setup(function() {
            canDisableSpy =
              this.sinon.spy(FindMyDevice._canDisableHelper, 'set');
          });

          suite('with everything true', function() {
            setup(function() {
              FindMyDevice._loggedIn        = true;
              FindMyDevice._state.clientid  = 'cid';
            });

            test('proper call to canDisableHelper', function() {
              FindMyDevice._onClientIDChanged(_currentClientId);
              sinon.assert.calledOnce(canDisableSpy);
              sinon.assert.calledWith(canDisableSpy, true);
            });
          });

          suite('with loggedin false and matching clientid', function() {
            setup(function() {
              FindMyDevice._loggedIn        = false;
              FindMyDevice._state.clientid  = 'cid';
            });

            test('proper call to canDisableHelper', function() {
              FindMyDevice._onClientIDChanged(_currentClientId);
              sinon.assert.calledOnce(canDisableSpy);
              sinon.assert.calledWith(canDisableSpy, false);
            });
          });

          suite('with loggedin false and non matching clientid', function() {
            setup(function() {
              FindMyDevice._loggedIn        = false;
              FindMyDevice._state.clientid  = '';
            });

            test('proper call to canDisableHelper', function() {
              FindMyDevice._onClientIDChanged(_currentClientId);
              sinon.assert.calledOnce(canDisableSpy);
              sinon.assert.calledWith(canDisableSpy, false);
            });
          });

          suite('with loggedin true and non matching clientid', function() {
            setup(function() {
              FindMyDevice._loggedIn        = true;
              FindMyDevice._state.clientid  = '';
            });

            test('proper call to canDisableHelper', function() {
              FindMyDevice._onClientIDChanged(_currentClientId);
              sinon.assert.calledOnce(canDisableSpy);
              sinon.assert.calledWith(canDisableSpy, false);
            });
          });
        });

        test('keep wakelock section', function() {
          FindMyDevice._onClientIDChanged(_currentClientId);
          sinon.assert.notCalled(endHighPriorityStub);
        });
      });

      suite('none of the above', function() {
        var oldLogged, oldRegistered;

        setup(function() {
          _currentClientId         = { settingValue: 'cid'};
          oldLogged                = FindMyDevice._loggedIn;
          oldRegistered            = FindMyDevice._registered;
          FindMyDevice._loggedIn   = false;
          FindMyDevice._registered = false;
        });

        teardown(function() {
          FindMyDevice._loggedIn   = oldLogged;
          FindMyDevice._registered = oldRegistered;
        });

        test('end of wakelock section', function() {
          FindMyDevice._onClientIDChanged(_currentClientId);
          sinon.assert.calledWith(endHighPriorityStub, 'clientLogic');
          sinon.assert.notCalled(refreshClientStub);
        });
      });
    });

    suite('Changes to findmydevice.can-disable', function() {
      var _canDisable = {};
      var enabledSpy;
      var oldDisableAttempt;

      setup(function() {
        endHighPriorityStub = this.sinon.stub(FindMyDevice, 'endHighPriority');
        enabledSpy          =
          this.sinon.spy(FindMyDevice._enabledHelper, 'set');
        oldDisableAttempt   = FindMyDevice._disableAttempt;
      });

      teardown(function() {
        FindMyDevice._disableAttempt = oldDisableAttempt;
      });

      suite('can-disabled changed to true', function() {
        setup(function() {
          _canDisable = { settingValue: true};
        });

        test('with disable attempt', function() {
          FindMyDevice._disableAttempt = true;
          FindMyDevice._onCanDisableChanged(_canDisable);
          sinon.assert.calledWith(enabledSpy, false);
        });

        test('without disable attempt', function() {
          FindMyDevice._disableAttempt = false;
          FindMyDevice._onCanDisableChanged(_canDisable);
          sinon.assert.notCalled(enabledSpy);
        });

        test('reset stuff', function() {
          FindMyDevice._onCanDisableChanged(_canDisable);
          assert.isFalse(FindMyDevice._disableAttempt,
            'set disableAttempt to false');
          sinon.assert.calledOnce(endHighPriorityStub, 'end wakelock section');
        });
      });

      suite('can-disabled changed to false', function() {
        setup(function() {
          _canDisable = { settingValue: false};
        });

        test('with disable attempt', function() {
          FindMyDevice._disableAttempt = true;
          FindMyDevice._onCanDisableChanged(_canDisable);
          sinon.assert.notCalled(enabledSpy);
        });

        test('without disable attempt', function() {
          FindMyDevice._disableAttempt = false;
          FindMyDevice._onCanDisableChanged(_canDisable);
          sinon.assert.notCalled(enabledSpy);
        });

        test('reset stuff', function() {
          FindMyDevice._onCanDisableChanged(_canDisable);
          assert.isFalse(FindMyDevice._disableAttempt,
            'set disableAttempt to false');
          sinon.assert.calledOnce(endHighPriorityStub, 'end wakelock section');
        });
      });
    });
  });

  suite('findmydevice.current-clientid behavior', function() {
    setup(function() {
      this.sinon.spy(FindMyDevice._currentClientIDHelper, 'set');
    });

    test('invalidate client id when logged in', function() {
      sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOGIN);
      assert.isTrue(FindMyDevice._loggedIn, 'not logged in after login event');
      sinon.assert.calledWith(FindMyDevice._currentClientIDHelper.set, '');
    });

    test('invalidate client id when logged out', function() {
      sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOGOUT);
      assert.isFalse(FindMyDevice._loggedIn, 'logged in after logout event');
      sinon.assert.calledWith(FindMyDevice._currentClientIDHelper.set, '');
    });

    test('refresh the current clientid after (re-)registering',
    function() {
      FindMyDevice._enabled = true;
      FindMyDevice._registered = true;
      this.sinon.stub(FindMyDevice, '_loadState', function(cb) { cb(); });
      FindMyDevice._onRegisteredChanged({settingValue: true});
      sinon.assert.calledWith(FindMyDevice._currentClientIDHelper.set, '');
    });
  });

  suite('findmydevice.can-disable behavior', function() {
    setup(function() {
      this.sinon.spy(FindMyDevice._canDisableHelper, 'set');
    });

    test('set findmydevice.can-disable to false when logged out', function() {
      FindMyDevice._registered = true;
      FindMyDevice._loggedIn = false;
      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: ''});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, false);
    });

    test('don\'t set findmydevice.can-disable on logout if not registered',
    function() {
      FindMyDevice._loggedIn = false;
      FindMyDevice._registered = false;
      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: ''});
      sinon.assert.notCalled(FindMyDevice._canDisableHelper.set);
    });

    test('allow disabling when clientid matches the state', function() {
      FindMyDevice._loggedIn = true;
      FindMyDevice._registered = true;
      FindMyDevice._state = {clientid: 'clientid'};

      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: 'clientid'});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, true);
    });

    test('disallow disabling when clientid doesn\'t match the state',
    function() {
      FindMyDevice._loggedIn = true;
      FindMyDevice._registered = true;
      FindMyDevice._state = {clientid: 'wrong clientid'};

      MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: 'clientid'});
      sinon.assert.calledWith(FindMyDevice._canDisableHelper.set, false);
    });
  });

  test('request client id when invalidated', function() {
    FindMyDevice._loggedIn = true;
    FindMyDevice._registered = true;
    FindMyDevice._state = {clientid: 'clientid'};

    this.sinon.stub(FindMyDevice, 'beginHighPriority');
    this.sinon.stub(FindMyDevice, 'endHighPriority');
    this.sinon.spy(FindMyDevice, '_refreshClientIDIfRegistered');
    MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
      {settingValue: ''});
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, false);
    sinon.assert.calledWith(navigator.mozId.request, {});
    sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
    sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');
    sinon.assert.calledOnce(FindMyDevice.endHighPriority);
    sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
  });

  test('refresh authentication when attempting to disable', function() {
    FindMyDevice._loggedIn = true;
    FindMyDevice._registered = true;

    this.sinon.spy(FindMyDevice, '_refreshClientIDIfRegistered');
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_TRY_DISABLE);
    assert.isTrue(FindMyDevice._disableAttempt);
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, true);
    assert.isTrue(
      navigator.mozId.request.calledWithMatch(
        {refreshAuthentication: 0}));
  });

  test('setting an alarm releases a wakelock', function() {
    var clock = this.sinon.useFakeTimers();
    this.sinon.stub(FindMyDevice, 'endHighPriority');
    FindMyDevice._scheduleAlarm('ping');
    clock.tick();
    sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
    clock.restore();
  });

  test('contact the server on alarm', function() {
    this.sinon.stub(FindMyDevice, '_contactServer');
    this.sinon.stub(FindMyDevice, '_refreshClientIDIfRegistered');
    MockNavigatormozSetMessageHandler.mTrigger('alarm');
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, false);
    sinon.assert.called(FindMyDevice._contactServer);
  });

  test('report to the server when disabled', function() {
    FindMyDevice._registered = true;
    MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
      {settingValue: false});
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
    sinon.assert.called(FindMyDevice._reportDisabled);
  });

  test('track and ring are cancelled on LOCKSCREEN_CLOSED, passcode set',
  function() {
    this.sinon.stub(Commands, 'deviceHasPasscode', function() {return true;});
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
    sinon.assert.calledTwice(Commands.invokeCommand);
    sinon.assert.calledWith(Commands.invokeCommand, 'ring', [0]);
    sinon.assert.calledWith(Commands.invokeCommand, 'track', [0]);
  });

  test('track and ring continue on LOCKSCREEN_CLOSED, no passcode set',
  function() {
    this.sinon.stub(Commands, 'deviceHasPasscode', function() {return false;});
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
    sinon.assert.notCalled(Commands.invokeCommand);
  });

  test('wakelocks are released on unregistered clientID change', function() {
    FindMyDevice._registered = false;
    this.sinon.stub(FindMyDevice, 'endHighPriority');
    MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
        {settingValue: ''});
    sinon.assert.calledOnce(FindMyDevice.endHighPriority);
    sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
  });

  test('wakelocks are released when registering while already registering',
  function() {
    this.sinon.stub(FindMyDevice, 'endHighPriority');
    FindMyDevice._registering = true;
    FindMyDevice._register();
    sinon.assert.calledOnce(FindMyDevice.endHighPriority);
    sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
  });

  suite('testing command flow', function() {
    var serverResponse = {};
    var commandSpy;

    setup(function() {
      FindMyDevice._enabled = true;
      commandSpy = this.sinon.spy(FindMyDevice, '_processCommands');
    });

    suite('set alarm on server interaction', function() {
      var alarmSpy;

      setup(function() {
        serverResponse = {t: {d: 60}};
        alarmSpy   = this.sinon.spy(FindMyDevice, '_scheduleAlarm');
      });

      suite('With FMD enabled', function() {
        setup(function() {
          FindMyDevice._handleServerResponse(serverResponse);
        });

        test('alarm is set on successful server response', function() {
          sinon.assert.calledOnce(commandSpy);
          sinon.assert.calledWith(commandSpy, serverResponse);
          sinon.assert.calledOnce(Commands.invokeCommand);
          sinon.assert.calledWith(Commands.invokeCommand, 'track');
          sinon.assert.calledWith(alarmSpy, 'ping');
        });
      });

      suite('With FMD disabled', function() {
        setup(function() {
          FindMyDevice._enabled = false;
          FindMyDevice._handleServerResponse(serverResponse);
        });

        teardown(function() {
          FindMyDevice._enabled = true;
        });

        test('alarm is set on server response even when disabled', function() {
          sinon.assert.notCalled(commandSpy);
          sinon.assert.notCalled(Commands.invokeCommand);
          sinon.assert.calledWith(alarmSpy, 'ping');
        });
      });
    });

    suite('Processing of erase command', function() {
      setup(function() {
        serverResponse = {e: {}};
        FindMyDevice._handleServerResponse(serverResponse);
      });

      test('erase command invoked', function() {
        sinon.assert.calledOnce(commandSpy);
        sinon.assert.calledWith(commandSpy, serverResponse);
        sinon.assert.calledOnce(Commands.invokeCommand);
        sinon.assert.calledWith(Commands.invokeCommand, 'erase');
      });
    });

    suite('Processing of killswitch command', function() {
      setup(function() {
        serverResponse = {k: {}};
        FindMyDevice._handleServerResponse(serverResponse);
      });

      test('killswitch command invoked', function() {
        sinon.assert.calledOnce(commandSpy);
        sinon.assert.calledWith(commandSpy, serverResponse);
        sinon.assert.calledOnce(Commands.invokeCommand);
        sinon.assert.calledWith(Commands.invokeCommand, 'killswitch');
      });
    });

    suite('Processing of lock command', function() {
      setup(function() {
        serverResponse = {l: {m: 'message', c: '1234'}};
        FindMyDevice._handleServerResponse(serverResponse);
      });

      test('lock command invoked', function() {
        sinon.assert.calledOnce(commandSpy);
        sinon.assert.calledWith(commandSpy, serverResponse);
        sinon.assert.calledOnce(Commands.invokeCommand);
        sinon.assert.calledWith(Commands.invokeCommand, 'lock');

        var args = Commands.invokeCommand.firstCall.args[1];
        assert.equal(args[0], 'message');
        assert.equal(args[1], '1234');
      });
    });

    suite('Processing of ring command', function() {
      setup(function() {
        serverResponse = {r: {d: 5}};
        FindMyDevice._handleServerResponse(serverResponse);
      });

      test('ring command invoked', function() {
        sinon.assert.calledOnce(commandSpy);
        sinon.assert.calledWith(commandSpy, serverResponse);
        sinon.assert.calledOnce(Commands.invokeCommand);
        sinon.assert.calledWith(Commands.invokeCommand, 'ring');

        var args = Commands.invokeCommand.firstCall.args[1];
        assert.equal(args[0], 5);
      });
    });

    suite('Processing of track command', function() {
      setup(function() {
        serverResponse = {t: {d: 7}};
        FindMyDevice._handleServerResponse(serverResponse);
      });

      test('track command invoked', function() {
        sinon.assert.calledOnce(commandSpy);
        sinon.assert.calledWith(commandSpy, serverResponse);
        sinon.assert.calledOnce(Commands.invokeCommand);
        sinon.assert.calledWith(Commands.invokeCommand, 'track');

        var args = Commands.invokeCommand.firstCall.args[1];
        assert.equal(args[0], 7);
      });
    });
  });
});
