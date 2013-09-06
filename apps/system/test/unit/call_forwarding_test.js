'use strict';

mocha.globals(['IccHelper', 'asyncStorage']);

requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

var MockMozSettings = {
  _listeners: {},

  addObserver: function addObserver(event, listener) {
    this._listeners[event] = listener;
  },
  createLock: function createLock(event, listener) {
    return MockLock;
  }
};

var MockAsyncStorage = {
  _get_listeners: {},
  _set_listeners: {},

  getItem: function getItem(event, listener) {
    this._get_listeners[event] = listener;
  },
  setItem: function setItem(event, listener) {
    this._set_listeners[event] = listener;
  }
};

var MockMozMobileConnection = {
  _listeners: {},
  addEventListener: function addEventListener(event, listener) {
    this._listeners[event] = listener;
  }
};

suite('Call Forwarding >', function() {
  var realMozSettings;
  var realMozMobileConnection;
  var realIccHelper;
  var realAsyncStorage;

  setup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockMozSettings;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockMozMobileConnection;

    realIccHelper = window.IccHelper;
    window.IccHelper = MockIccHelper;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockAsyncStorage;

    MockLock.clear();
    MockIccHelper.mProps.cardState = 'ready';
    MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo';

    requireApp('system/js/call_forwarding.js', done);
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozMobileConnection = realMozMobileConnection;
    window.IccHelper = realIccHelper;
    window.asyncStorage = realAsyncStorage;
  });

  suite('race codition check', function() {
    test('test mozSettings', function() {
      assert.equal(typeof navigator.mozSettings, 'object');
    });

    test('test mozMobileConnection', function() {
      assert.equal(typeof navigator.mozMobileConnection, 'object');
    });

    test('test IccHelper', function() {
      assert.equal(typeof IccHelper, 'object');
    });

    test('test Callback stack length', function() {
      assert.equal(MockIccHelper.mEventListeners['cardstatechange'].length, 1);
      assert.equal(MockIccHelper.mEventListeners['iccinfochange'].length, 1);
    });
  });

  suite('init', function() {
    setup(function() {
      MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo_of_cardstatechange';
      MockIccHelper.mEventListeners['cardstatechange'][MockIccHelper.
        mEventListeners['cardstatechange'].length - 1]();

      MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo_of_iccinfochange';
      MockIccHelper.mEventListeners['iccinfochange'][MockIccHelper.
        mEventListeners['iccinfochange'].length - 1]();
    });

    test('test lock ril.cf.enabled is false', function() {
      //assert.isFalse(MockLock.locks[0]['ril.cf.enabled']);
    });

    test('test initCallForwardingIconState has been excuted', function() {
      MockLock.clear();
      MockAsyncStorage._get_listeners['ril.cf.enabled.dummy_iccInfo'](true);
      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);

      MockLock.clear();
      MockAsyncStorage
        ._get_listeners['ril.cf.enabled.dummy_iccInfo_of_cardstatechange'](true);
      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);

      MockLock.clear();
      MockAsyncStorage
        ._get_listeners['ril.cf.enabled.dummy_iccInfo_of_iccinfochange'](true);
      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);
    });
  });

  suite('test mozMobileConnection event cfstatechange', function() {
    test('CALL_FORWARD_REASON_UNCONDITIONAL & CALL_FORWARD_ACTION_ENABLE',
    function() {
      var fakeEvent = {
        reason: 0, // _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL
        success: true,
        action: 1 // _cfAction.CALL_FORWARD_ACTION_ENABLE
      };
      MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo_of_cfstatechange';
      MockLock.clear();

      MockMozMobileConnection._listeners['cfstatechange'](fakeEvent);

      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);
      assert.isTrue(MockAsyncStorage
        ._set_listeners['ril.cf.enabled.dummy_iccInfo_of_cfstatechange']);
    });

    test('CALL_FORWARD_REASON_UNCONDITIONAL & CALL_FORWARD_ACTION_REGISTRATION',
    function() {
      var fakeEvent = {
        reason: 0, // _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL
        success: true,
        action: 3 // _cfAction.CALL_FORWARD_ACTION_REGISTRATION
      };
      MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo_of_cfstatechange';
      MockLock.clear();

      MockMozMobileConnection._listeners['cfstatechange'](fakeEvent);

      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);
      assert.isTrue(MockAsyncStorage
        ._set_listeners['ril.cf.enabled.dummy_iccInfo_of_cfstatechange']);
    });

    test('event.success is false',
    function() {
      var fakeEvent = {
        reason: 0, // _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL
        success: false,
        action: 3 // _cfAction.CALL_FORWARD_ACTION_REGISTRATION
      };
      MockIccHelper.mProps.iccInfo.iccid = 'dummy_iccInfo_of_cfstatechange';
      MockLock.clear();

      MockMozMobileConnection._listeners['cfstatechange'](fakeEvent);

      assert.isFalse(MockLock.locks[0]['ril.cf.enabled']);
      assert.isFalse(MockAsyncStorage
        ._set_listeners['ril.cf.enabled.dummy_iccInfo_of_cfstatechange']);
    });
  });

  suite('test mozSettings observer ril.cf.carrier.enabled', function() {
    test('test event.settingValue is true', function() {
      var fakeEvent = {
        settingValue: true
      };
      MockIccHelper.mProps.iccInfo.iccid =
        'dummy_iccInfo_of_mozSettings_observer';
      MockLock.clear();

      MockMozSettings._listeners['ril.cf.carrier.enabled'](fakeEvent);

      assert.isTrue(MockLock.locks[0]['ril.cf.enabled']);
      assert.isTrue(MockAsyncStorage
        ._set_listeners['ril.cf.enabled.dummy_iccInfo_of_mozSettings_observer']);
    });
  });
});

