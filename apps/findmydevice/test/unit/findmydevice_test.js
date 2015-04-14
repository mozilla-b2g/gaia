/* global MocksHelper, MockGeolocation, MockNavigatormozSetMessageHandler,
   MockSettingsHelper, MockNavigatorSettings, MockPromise, FindMyDevice,
   MockMozAlarms, IAC_API_WAKEUP_REASON_LOGIN, IAC_API_WAKEUP_REASON_LOGOUT,
   IAC_API_WAKEUP_REASON_TRY_DISABLE, IAC_API_WAKEUP_REASON_ENABLED_CHANGED,
   IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED, Commands
*/

'use strict';

require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_geolocation.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/findmydevice_iac_api.js');
require('/shared/test/unit/mocks/mock_moz_alarms.js');
require('/shared/test/unit/mocks/mock_promise.js');

var mocksForFindMyDevice = new MocksHelper([
  'Geolocation', 'Dump', 'SettingsHelper'
]).init();

suite('FindMyDevice >', function() {
  var realMozId;
  var realMozSettings;
  var realMozSetMessageHandler;
  var realMozAlarms;
  var realNavigatorOnLine;
  var realCommands;
  var realPromise;

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

    // We require findmydevice.js here and not above because
    // we want to make sure all of our dependencies have already
    // been loaded.
    require('/js/findmydevice.js', function() {
      // We stub navigator.mozId.watch above, so FindMyDevice.init()
      // is effectively a no-op. We don't need to fully initialize FMD for
      // these tests, so just register for the events we care about below.
      FindMyDevice._initSettings();
      FindMyDevice._observeSettings();
      FindMyDevice._initMessageHandlers();
      done();
    });
  });

  suiteTeardown(function() {
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

  setup(function() {
    realCommands = window.Commands;
    window.Commands = {
      invokeCommand: this.sinon.stub(),
      deviceHasPasscode: null
    };

    // XXX(ggp) force re-creation of the SettingsHelper objects
    // used by FMD, since MockSettingsHelper invalidates all objects
    // in its mTeardown.
    FindMyDevice._initSettings();

    navigator.onLine = true;

    realPromise = window.Promise;
    window.Promise = this.sinon.spy(MockPromise);
  });

  teardown(function() {
    FindMyDevice._enabled = false;
    FindMyDevice._registered = false;
    FindMyDevice._loggedIn = false;
    FindMyDevice._state = null;
    window.Commands = realCommands;
    window.Promise = realPromise;
  });

  function sendWakeUpMessage(reason) {
    var port = {};
    MockNavigatormozSetMessageHandler.mTrigger('connection',
      {port: port, keyword: 'findmydevice-wakeup'});
    port.onmessage({data: reason});
  }

  suite('wakelocks are correctly grabbed and released', function() {
    var fakeClock;

    setup(function() {
      fakeClock = this.sinon.useFakeTimers();
      this.sinon.stub(FindMyDevice, 'beginHighPriority');
      this.sinon.stub(FindMyDevice, 'endHighPriority');
    });

    teardown(function() {
      fakeClock.restore();
    });

    test('LockedSettingsHelper locks/unlocks on get()', function() {
      var lsh = FindMyDevice._makeLockedSettingsHelper('findmydevice.enabled');
      lsh.get();

      var p = window.Promise.firstCall.returnValue;
      p.mExecuteCallback(function resolve() {
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');
        sinon.assert.notCalled(FindMyDevice.endHighPriority);
      });

      fakeClock.tick();
      sinon.assert.calledOnce(FindMyDevice.endHighPriority);
      sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
    });

    test('LockedSettingsHelper locks on set(), unlocks in observer',
    function() {
      var lsh = FindMyDevice._makeLockedSettingsHelper('findmydevice.enabled');
      var observer = this.sinon.spy(function() {
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');
        sinon.assert.notCalled(FindMyDevice.endHighPriority);
      });
      lsh.addObserver(observer);

      lsh.set();
      var p = window.Promise.firstCall.returnValue;
      p.mExecuteCallback(function resolve() {
        // Promise must resolve after calling observer
        sinon.assert.called(observer);
        sinon.assert.notCalled(FindMyDevice.endHighPriority);
      });

      MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
        {settingValue: true});

      fakeClock.tick();
      sinon.assert.calledOnce(FindMyDevice.endHighPriority);
      sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
    });

    suite('_contactServer grabs and releases a wakelock', function() {
      var replyAndFetchCommandsPromise;
      setup(function() {
        FindMyDevice._enabled = true;
        FindMyDevice._registered = true;

        replyAndFetchCommandsPromise = MockPromise();
        this.sinon.stub(FindMyDevice, '_replyAndFetchCommands',
          () => replyAndFetchCommandsPromise);
      });

      test('on success', function() {
        FindMyDevice._contactServer();
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');
        replyAndFetchCommandsPromise.mFulfillToValue(null);
        sinon.assert.calledOnce(FindMyDevice.endHighPriority);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
      });

      test('on failure', function() {
        FindMyDevice._contactServer();
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');
        replyAndFetchCommandsPromise.mRejectToError(null);
        sinon.assert.calledOnce(FindMyDevice.endHighPriority);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
      });
    });

    suite('_refreshClientIDIfRegistered grabs and releases a wakelock',
    function() {
      var realRequester;

      setup(function() {
        FindMyDevice._registered = true;
        FindMyDevice._loggedIn = true;
        realRequester = window.Requester;
        window.Requester = {
          promisePost: () => MockPromise()
        };
      });

      teardown(function() {
        window.Requester = realRequester;
      });

      test('on success', function() {
        FindMyDevice._refreshClientIDIfRegistered(false);
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');

        var assertionPromise = window.Promise.firstCall.returnValue;
        assertionPromise.mFulfillToValue('assertion');

        var requesterPromise = assertionPromise.mGetNextPromise();
        requesterPromise.mFulfillToValue();

        sinon.assert.calledOnce(FindMyDevice.endHighPriority);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
      });

      test('when FxA fails', function() {
        this.sinon.spy(FindMyDevice, '_cancelClientIDRefresh');
        FindMyDevice._refreshClientIDIfRegistered(false);
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');

        var assertionPromise = window.Promise.firstCall.returnValue;
        assertionPromise.mRejectToError();

        sinon.assert.called(FindMyDevice._cancelClientIDRefresh);
        var cancelPromise = assertionPromise.mGetNextPromise();

        cancelPromise.mFulfillToValue();
        sinon.assert.calledOnce(FindMyDevice.endHighPriority);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
      });

      test('when the server fails', function() {
        FindMyDevice._refreshClientIDIfRegistered(false);
        sinon.assert.calledOnce(FindMyDevice.beginHighPriority);
        sinon.assert.calledWith(FindMyDevice.beginHighPriority, 'clientLogic');

        var assertionPromise = window.Promise.firstCall.returnValue;
        assertionPromise.mFulfillToValue();

        var requesterPromise = assertionPromise.mGetNextPromise();
        requesterPromise.mRejectToError();

        sinon.assert.calledOnce(FindMyDevice.endHighPriority);
        sinon.assert.calledWith(FindMyDevice.endHighPriority, 'clientLogic');
      });
    });
  });

  suite('retry counter behavior', function() {
    setup(function() {
      // simplify testing, we don't need LockedSettingsHelper or Promises
      FindMyDevice._retryCountHelper = MockSettingsHelper(
        'findmydevice.retry-count');
      this.sinon.stub(FindMyDevice, '_scheduleAlarm', () => {
        return {
          then: cb => cb()
        };
      });
      this.sinon.stub(FindMyDevice, '_contactServer');
    });

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
      FindMyDevice._enabled = true;
      FindMyDevice._registered = false;
      FindMyDevice._retryCount = 0;

      this.sinon.spy(FindMyDevice._retryCountHelper, 'set');

      // simulate 3 failed requests
      for (var i = 1; i < 4; i++) {
        FindMyDevice._handleServerError({status:401});
        assert.equal(FindMyDevice._retryCountHelper.set.callCount, i);
        MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
          {settingValue: FindMyDevice._retryCountHelper.set.lastCall.args[0]});
      }

      MockSettingsHelper('findmydevice.retry-count').get(
        function(val) {
          assert.equal(val, 3, 'retry count should be 3');
        });
    });

    test('retryCount is not incremented when offline', function() {
      FindMyDevice._registered = false;
      sendWakeUpMessage(IAC_API_WAKEUP_REASON_ENABLED_CHANGED);

      navigator.onLine = false;
      this.sinon.stub(FindMyDevice._retryCountHelper, 'set');

      // Simulate 3 failed requests
      FindMyDevice._handleServerError({status: 401});
      FindMyDevice._handleServerError({status: 401});
      FindMyDevice._handleServerError({status: 401});

      assert.isTrue(FindMyDevice._retryCountHelper.set.notCalled);
    });
  });

  test('fields from coordinates are included in server response', function() {
    FindMyDevice._registered = true;
    FindMyDevice._enabled = true;
    this.sinon.stub(FindMyDevice, '_replyAndFetchCommands',
      () => Promise.resolve());

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
    this.sinon.stub(FindMyDevice, '_replyAndFetchCommands',
      () => Promise.resolve());

    var message = 'error message';
    FindMyDevice._replyCallback('t', false, message);
    sinon.assert.called(FindMyDevice._replyAndFetchCommands);
    assert.equal(FindMyDevice._reply.t.error, message);
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
      this.sinon.stub(FindMyDevice, '_contactServer');
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

    this.sinon.spy(FindMyDevice, '_refreshClientIDIfRegistered');
    MockNavigatorSettings.mTriggerObservers('findmydevice.current-clientid',
      {settingValue: ''});
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, false);

    var p = window.Promise.firstCall.returnValue;
    p.mExecuteCallback(function resolve() {
      sinon.assert.calledWith(navigator.mozId.request, {});
    });
  });

  test('refresh authentication when attempting to disable', function() {
    FindMyDevice._loggedIn = true;
    FindMyDevice._registered = true;

    this.sinon.spy(FindMyDevice, '_refreshClientIDIfRegistered');
    sendWakeUpMessage(IAC_API_WAKEUP_REASON_TRY_DISABLE);
    assert.isTrue(FindMyDevice._disableAttempt);
    sinon.assert.calledWith(FindMyDevice._refreshClientIDIfRegistered, true);

    var p = window.Promise.firstCall.returnValue;
    p.mExecuteCallback(function resolve() {
      assert.isTrue(
        navigator.mozId.request.calledWithMatch(
          {refreshAuthentication: 0}));
    });
  });

  suite('set alarm on server interaction', function() {
    var response = {t: {d: 60}};

    setup(function() {
      this.sinon.stub(FindMyDevice, '_processCommands');
      this.sinon.stub(FindMyDevice, '_scheduleAlarm', () => Promise.resolve());
    });

    test('alarm is set on successful server response', function() {
      FindMyDevice._enabled = true;
      FindMyDevice._handleServerResponse(response);
      sinon.assert.calledWith(FindMyDevice._processCommands, response);
      sinon.assert.calledWith(FindMyDevice._scheduleAlarm, 'ping');
    });

    test('alarm is set on server response even when disabled', function() {
      FindMyDevice._enabled = false;
      FindMyDevice._handleServerResponse(response);
      sinon.assert.notCalled(FindMyDevice._processCommands);
      sinon.assert.calledWith(FindMyDevice._scheduleAlarm, 'ping');
    });
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
    this.sinon.stub(FindMyDevice, '_reportDisabled', () => Promise.resolve());
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
});
