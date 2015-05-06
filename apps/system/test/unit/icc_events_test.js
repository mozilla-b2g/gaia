'use strict';

/* global MocksHelper, MockNavigatorMozIccManager, MockSystemICC, icc_events,
          MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
          MockNavigatorSettings, telephonyAddCall, MockCall, MockApplications,
          MockDump */

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/dialer/mock_call.js');
require('/shared/test/unit/mocks/dialer/mock_handled_call.js');
require('/apps/system/test/unit/mock_system_icc.js');
require('/apps/system/test/unit/mock_app_window_manager.js');
require('/apps/system/test/unit/mock_applications.js');
require('/apps/system/js/icc_events.js');

var mocksForIcc = new MocksHelper([
  'HandledCall'
]).init();

suite('STK (icc_events) >', function() {
  mocksForIcc.attachTestHelpers();
  var realMozIccManager,
      realApplications,
      realSystemICC,
      realAddIdleObserver,
      realRemoveIdleObserver,
      realMozTelephony,
      realMozSettings,
      realMozMobileConnections;
  var stkTestCommands = {},
    fakeBrowserApp,
    idleObserverEventListeners = [],
    triggerIdleObserverIdle,
    triggerIdleObserverActive,
    iccId1 = 0, conn1,
    iccId2 = 1, conn2;

  suiteSetup(function() {
    MockDump.mSuiteSetup();

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realApplications = window.applications;
    window.applications = MockApplications;

    realSystemICC = window.icc;
    window.icc = MockSystemICC(MockNavigatorMozIccManager,
      MockNavigatorMozMobileConnections);

    realAddIdleObserver = navigator.addIdleObserver;
    navigator.addIdleObserver = function(idleObject) {
      if (idleObserverEventListeners) {
        idleObserverEventListeners[idleObserverEventListeners.length] =
          idleObject;
      }
    };

    realRemoveIdleObserver = navigator.removeIdleObserver;
    navigator.removeIdleObserver = function(idleObject) {
      if (idleObserverEventListeners) {
        var idx = idleObserverEventListeners.indexOf(idleObject);
        idleObserverEventListeners.splice(idx, 1);
      }
    };

    triggerIdleObserverIdle = function() {
      if (!idleObserverEventListeners) {
        return;
      }
      idleObserverEventListeners.forEach(function(idleObject) {
        var callback = idleObject.onidle;
        if (typeof callback === 'function') {
          callback();
        }
      });
    };

    triggerIdleObserverActive = function() {
      if (!idleObserverEventListeners) {
        return;
      }
      idleObserverEventListeners.forEach(function(idleObject) {
        var callback = idleObject.onactive;
        if (typeof callback === 'function') {
          callback();
        }
      });
    };

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozMobileConnections = navigator.mozMobileConnections;

    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    conn1 = new window.MockMobileconnection();
    conn1.iccId = 0;
    conn1.iccInfo = {
      'iccid': 0
    };
    conn1.voice = {
      connected: true,
      emergencyCallsOnly: false,
      network: {
        mcc: 'mcc',
        mnc: 'mnc'
      },
      cell: {
        gsmLocationAreaCode: 'gsmLocationAreaCode',
        gsmCellId: 'gsmCellId'
      }
    };
    navigator.mozMobileConnections.mAddMobileConnection(conn1, 0);

    conn2 = new window.MockMobileconnection();
    conn2.iccId = 1;
    conn2.iccInfo = {
      'iccid': 1
    };
    conn2.voice = {
      connected: true,
      emergencyCallsOnly: false,
      network: {
        mcc: 'mcc',
        mnc: 'mnc'
      },
      cell: {
        gsmLocationAreaCode: 'gsmLocationAreaCode',
        gsmCellId: 'gsmCellId'
      }
    };
    navigator.mozMobileConnections.mAddMobileConnection(conn2, 1);

  });

  suiteTeardown(function() {
    MockDump.mSuiteTeardown();

    MockNavigatorMozIccManager.mTeardown();
    navigator.mozIccManager = realMozIccManager;

    MockApplications.mTeardown();
    window.applications = MockApplications;

    MockSystemICC.mTeardown();
    window.icc = realSystemICC;

    navigator.addIdleObserver = realAddIdleObserver;

    navigator.removeIdleObserver = realRemoveIdleObserver;

    MockNavigatorMozTelephony.mTeardown();
    navigator.mozTelephony = realMozTelephony;

    MockNavigatorSettings.mTeardown();
    navigator.mozSettings = realMozSettings;

    MockNavigatorMozMobileConnections.mTeardown();
    navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    fakeBrowserApp = {
      'isActivity': false,
      'url': 'app://fakeapp1.gaiamobile.org/pick.html',
      'name': 'Fake App 1',
      'manifestURL': 'app://fakeapp1.gaiamobile.org/manifest.webapp',
      'origin': 'app://fakeapp1.gaiamobile.org',
      'manifest': {
        'name': 'Fake App 1',
        'permissions': {
          'browser': 1
        }
      },
      target: {}
    };
    MockApplications.mRegisterMockApp(fakeBrowserApp);

    window.navigator.mozIccManager.addIcc(iccId1);
    window.navigator.mozIccManager.addIcc(iccId2);

    stkTestCommands = {
      EVENTS_SET_ALL: {
        iccId: iccId1,
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_EVENT_LIST,
          commandQualifier: 0,
          options: {
            eventList: [0, 1, 2, 3, 4, 5, 6, 7, 8]
          }
        }
      },

      EVENTS_CLEAR_ALL: {
        iccId: iccId2,
        command: {
          commandNumber: 1,
          typeOfCommand: navigator.mozIccManager.STK_CMD_SET_UP_EVENT_LIST,
          commandQualifier: 0,
          options: {
            eventList: []
          }
        }
      }
    };
  });

  test('STK_EVENT_TYPE_MT_CALL', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1),
        callingNumber = '12334';
    sinon.spy(icc_events, 'handleCallsChanged');
    message.command.options.eventList = [
      MockNavigatorMozIccManager.STK_EVENT_TYPE_MT_CALL
    ];

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleCallsChanged.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_MT_CALL
      );
      assert.equal(res.number, callingNumber);
      assert.equal(res.isIssuedByRemote, true);
      assert.equal(res.error, null);
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleCallsChanged should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    var mockCall = new MockCall(callingNumber, 'incoming', iccId1);
    telephonyAddCall.call(this, mockCall);
    navigator.mozTelephony.mTriggerCallsChanged();

    assert.isTrue(icc_events.handleCallsChanged.calledOnce);

    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleCallsChanged.restore();
    done();
  });

  test('STK_EVENT_TYPE_CALL_CONNECTED', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1),
        callingNumber = '12334';
    sinon.spy(icc_events, 'handleCallsChanged');
    message.command.options.eventList = [
      MockNavigatorMozIccManager.STK_EVENT_TYPE_CALL_CONNECTED
    ];

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleCallsChanged.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_CALL_CONNECTED
      );
      assert.equal(res.number, callingNumber);
      assert.equal(res.isIssuedByRemote, true);
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleCallsChanged should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    var mockCall = new MockCall(callingNumber, 'incoming', iccId1);
    telephonyAddCall.call(this, mockCall);
    navigator.mozTelephony.mTriggerCallsChanged();

    assert.isTrue(icc_events.handleCallsChanged.calledOnce);
    mockCall.answer();
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleCallsChanged.restore();
    done();
  });

  test('STK_EVENT_TYPE_CALL_DISCONNECTED', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1),
        callingNumber = '12334';
    sinon.spy(icc_events, 'handleCallsChanged');
    message.command.options.eventList = [
      MockNavigatorMozIccManager.STK_EVENT_TYPE_CALL_DISCONNECTED
    ];

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleCallsChanged.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_CALL_DISCONNECTED
      );
      assert.equal(res.number, callingNumber);
      assert.equal(res.isIssuedByRemote, true);
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleCallsChanged should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    var mockCall = new MockCall(callingNumber, 'incoming', iccId1);
    telephonyAddCall.call(this, mockCall);
    navigator.mozTelephony.mTriggerCallsChanged();

    assert.isTrue(icc_events.handleCallsChanged.calledOnce);
    mockCall.answer();
    mockCall.hangUp();
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleCallsChanged.restore();
    done();
  });

  test('STK_EVENT_TYPE_LOCATION_STATUS - STK_SERVICE_STATE_NORMAL',
    function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleLocationStatus');
    conn1.voice.connected = true;
    conn1.voice.emergencyCallsOnly = false;

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleLocationStatus.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_LOCATION_STATUS
      );
      assert.equal(
        res.locationStatus,
        MockNavigatorMozIccManager.STK_SERVICE_STATE_NORMAL
      );
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleLocationStatus should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    navigator.mozMobileConnections[message.iccId].
      triggerEventListeners('voicechange', {
        type: 'voicechange'
      });
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleLocationStatus.restore();
    done();
  });

  test('STK_EVENT_TYPE_LOCATION_STATUS - STK_SERVICE_STATE_LIMITED',
    function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleLocationStatus');
    conn1.voice.connected = false;
    conn1.voice.emergencyCallsOnly = true;

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleLocationStatus.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_LOCATION_STATUS
      );
      assert.equal(
        res.locationStatus,
        MockNavigatorMozIccManager.STK_SERVICE_STATE_LIMITED
      );
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleLocationStatus should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    navigator.mozMobileConnections[message.iccId].
      triggerEventListeners('voicechange', {
        type: 'voicechange'
      });
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleLocationStatus.restore();
    done();
  });

  test('STK_EVENT_TYPE_USER_ACTIVITY', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleUserActivityEvent');

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleUserActivityEvent.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_USER_ACTIVITY
      );
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleUserActivityEvent should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    triggerIdleObserverIdle();
    triggerIdleObserverActive();
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleUserActivityEvent.restore();
    done();
  });

  test('STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleIdleScreenAvailableEvent');

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleIdleScreenAvailableEvent.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_IDLE_SCREEN_AVAILABLE
      );
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleIdleScreenAvailableEvent should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    window.dispatchEvent(new CustomEvent('homescreenopened'));
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleIdleScreenAvailableEvent.restore();
    done();
  });

  test('STK_EVENT_TYPE_LANGUAGE_SELECTION', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleLanguageSelectionEvent');
    conn1.voice.connected = true;
    conn1.voice.emergencyCallsOnly = false;

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleLanguageSelectionEvent.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_LANGUAGE_SELECTION
      );
      assert.equal(res.language, 'en');
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleLanguageSelectionEvent should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    navigator.mozSettings.mTriggerObservers('language.current', {
      settingValue: 'en'
    });
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleLanguageSelectionEvent.restore();
    done();
  });

  test('STK_EVENT_TYPE_BROWSER_TERMINATION', function(done) {
    var message = stkTestCommands.EVENTS_SET_ALL,
        icc1 = window.icc.getIcc(iccId1);
    sinon.spy(icc_events, 'handleBrowserTerminationEvent');

    icc1.sendStkEventDownload = function(res) {
      assert.isTrue(icc_events.handleBrowserTerminationEvent.calledOnce);
      assert.equal(
        res.eventType,
        MockNavigatorMozIccManager.STK_EVENT_TYPE_BROWSER_TERMINATION
      );
      assert.equal(
        res.terminationCause,
        MockNavigatorMozIccManager.STK_BROWSER_TERMINATION_CAUSE_USER
      );
    };
    sinon.spy(icc1, 'sendStkEventDownload');

    // Do 5 times here, because we want to make sure that
    // handleBrowserTerminationEvent should be triggered once only.
    for (var i = 0; i < 5; i++) {
      icc_events.register(message, message.command.options.eventList);
    }

    var evtDetail = {
      detail: fakeBrowserApp
    };
    window.dispatchEvent(new CustomEvent('appterminated', evtDetail));
    assert.isTrue(icc1.sendStkEventDownload.calledOnce);
    icc1.sendStkEventDownload.restore();
    icc_events.handleBrowserTerminationEvent.restore();
    done();
  });

  test('Clear all events', function(done) {
    var message = stkTestCommands.EVENTS_CLEAR_ALL,
        icc1 = window.icc.getIcc(iccId1);

    icc1.sendStkEventDownload = function() {};
    sinon.spy(icc1, 'sendStkEventDownload');
    sinon.spy(icc_events, 'registerCallChanged');

    icc_events.register(message, message.command.options.eventList);
    assert.isFalse(icc_events.registerCallChanged.called);
    assert.isFalse(icc1.sendStkEventDownload.called);

    icc1.sendStkEventDownload.restore();
    icc_events.registerCallChanged.restore();
    done();
  });

});
