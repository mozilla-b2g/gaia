// Internet Sharing Test
'use strict';

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/test/unit/mock_asyncStorage.js');

var mocksForInternetSharing = new MocksHelper([
  'asyncStorage',
  'IccHelper'
]).init();

suite('internet sharing > ', function() {
  // keys for settings
  const KEY_USB_TETHERING = 'tethering.usb.enabled';
  const KEY_WIFI_HOTSPOT = 'tethering.wifi.enabled';
  // prefix for asyncStorage
  const PREFIX_ASYNC_STORAGE_USB = 'tethering.usb.simstate.card-';
  const PREFIX_ASYNC_STORAGE_WIFI = 'tethering.wifi.simstate.card-';
  // id for asyncStorage
  const TEST_ABSENT = 'absent';
  const TEST_ICCID1 = 'iccid-1';
  const TEST_ICCID2 = 'iccid-2';

  var realSettings;

  suiteSetup(function(done) {
    // Unfortunately, for asyncStorage scoping reasons, we can't simply
    // use 'attachTestHelpers' anywhere in the internet sharing tests.
    mocksForInternetSharing.suiteSetup();

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    requireApp('system/js/internet_sharing.js', done);
  });

  suiteTeardown(function() {
    mocksForInternetSharing.suiteTeardown();
    navigator.mozSettings = realSettings;
  });
  // helper function for batch assertion of asyncStorage
  function assertAynscStorageEquals(testSet) {
    testSet.forEach(function(item) {
      asyncStorage.getItem(item.key, function(value) {
        assert.equal(value, item.result);
      });
    });
  }
  // helper function for batch assertion of mozSettings
  function assertSettingsEquals(testSet) {
    var mSettings = MockNavigatorSettings.mSettings;
    testSet.forEach(function(item) {
      assert.equal(mSettings[item.key], item.result);
    });
  }
  // helper to change card state
  function changeCardState(state, iccid) {
    MockIccHelper.mProps['cardState'] = state;
    MockIccHelper.mProps['iccInfo'] = {'iccid': iccid};
    MockIccHelper.mTriggerEventListeners('cardstatechange', {});
  }
  // helper to change single key-value of mozSettings
  function changeSettings(key, value) {
    var cset = {};
    cset[key] = value;
    MockNavigatorSettings.createLock().set(cset);
  }
  // suite 1 from no sim card to sim card inserted, and re-inserted again.
  suite('from null sim to sim 1 >>', function() {

    suiteSetup(function() {
      mocksForInternetSharing.setup();
    });

    suiteTeardown(function() {
      mocksForInternetSharing.teardown();
    });

    // fresh startup
    test('null sim no settings', function() {
      // empty start
      var mEventListeners = MockIccHelper.mEventListeners;
      var mObservers = MockNavigatorSettings.mObservers;

      assert.ok(
        mEventListeners['cardstatechange'].length > 0);
      assert.ok(
        mObservers[KEY_USB_TETHERING].length > 0);
      assert.ok(
        mObservers[KEY_WIFI_HOTSPOT].length > 0);
    });
    // card state from null to unknown(sim found, but not initialized)
    test('unknown sim no settings', function() {
      changeCardState('unknown', null);
      var mEventListeners = MockIccHelper.mEventListeners;
      var mObservers = MockNavigatorSettings.mObservers;
      assert.ok(
        mEventListeners['cardstatechange'].length > 0);
      assert.ok(
        mObservers[KEY_USB_TETHERING].length > 0);
      assert.ok(
        mObservers[KEY_WIFI_HOTSPOT].length > 0);
    });
    // card state from unknown to pinRequired
    test('sim1 pinRequired no settings', function() {
      changeCardState('pinRequired', null);

      var mEventListeners = MockIccHelper.mEventListeners;
      var mObservers = MockNavigatorSettings.mObservers;
      assert.ok(
        mEventListeners['cardstatechange'].length > 0);
      assert.ok(
        mObservers[KEY_USB_TETHERING].length > 0);
      assert.ok(
        mObservers[KEY_WIFI_HOTSPOT].length > 0);

      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // user typed pin, enter ready state
    test('sim1 ready no settings', function() {
      // use null iccid for initialization test.
      changeCardState('ready', null);

      // ready state, wait for iccInfo ready.
      var mEventListeners = MockIccHelper.mEventListeners;
      assert.ok(MockIccHelper.oniccinfochange ||
                mEventListeners['iccinfochange'].length == 1);

      // add iccInfo
      MockIccHelper.mProps['iccInfo'] = {dummy: 'dummyValue'};
      MockIccHelper.mTriggerEventListeners('iccinfochange', {});
      assert.ok(MockIccHelper.oniccinfochange ||
                mEventListeners['iccinfochange'].length == 1);

      // add iccid
      MockIccHelper.mProps['iccInfo'] = {iccid: TEST_ICCID1};
      MockIccHelper.mTriggerEventListeners('iccinfochange', {});
      assert.ok(!MockIccHelper.oniccinfochange ||
                mEventListeners['iccinfochange'].length == 0);

      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // user change usb tethering to true
    test('sim1 ready, usb tethering enable', function() {
      changeSettings(KEY_USB_TETHERING, true);
      var testSet = [
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID1, 'result': true},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID1, 'result': false},
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID2, 'result': null},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID2, 'result': null}];
      assertAynscStorageEquals(testSet);
    });
    // user remove sim 1
    test('sim1 removed', function() {
      changeCardState(null, null);
      IccHelper.mProps['cardState'] = null;
      IccHelper.mProps['iccInfo'] = {};
      IccHelper.mTriggerEventListeners('cardstatechange', {});
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // sim 1 inserted, usb tethering should be enabled
    test('sim1 inserted, usb tethering enabled', function() {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': true},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // sim 1 inserted, disable usb tethering, re-insert sim 1.
    test('disable usb tethering, sim1 re-insert', function() {

      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      // disable usb
      changeSettings(KEY_USB_TETHERING, false);
      // remove sim 1
      changeCardState(null, null);
      // everything is disblaed
      assertSettingsEquals(testSet);
      // insert sim 1
      changeCardState('ready', TEST_ICCID1);
      // everything is disabled
      assertSettingsEquals(testSet);
    });
  });
  // switching test for 2 sim and no sim
  suite('switch between sim1, sim2, and null >>', function() {
    suiteSetup(function() {
      // we need to keep asyncStorage under this suite.
      mocksForInternetSharing.setup();
      // setting up:
      // null, pinRequired, pukRequired...(non-ready): usb enabled
      // sim1: wifi hotspot enabled
      // sim2: nothing enabled
      changeCardState(null, null);
      changeSettings(KEY_USB_TETHERING, true);
      changeSettings(KEY_WIFI_HOTSPOT, false);

      changeCardState('ready', TEST_ICCID1);
      changeSettings(KEY_USB_TETHERING, false);
      changeSettings(KEY_WIFI_HOTSPOT, true);

      changeCardState('ready', TEST_ICCID2);
      changeSettings(KEY_USB_TETHERING, false);
      changeSettings(KEY_WIFI_HOTSPOT, false);
    });

    suiteTeardown(function() {
      // we need to keep asyncStorage under this suite.
      mocksForInternetSharing.teardown();
    });
    // test initial state
    test('test asyncStorage', function() {
      var testSet = [
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ABSENT, 'result': true},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ABSENT, 'result': false},
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID1, 'result': false},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID1, 'result': true},
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID2, 'result': false},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID2, 'result': false}];
      assertAynscStorageEquals(testSet);
    });
    // switch to sim1
    test('switch to sim1, test state', function() {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': true}];
      assertSettingsEquals(testSet);
    });
    // switch to sim2
    test('switch to sim2, test state', function() {
      changeCardState('ready', TEST_ICCID2);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // switch to no sim
    test('switch to no sim, test state', function() {
      changeCardState(null, null);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': true},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      assertSettingsEquals(testSet);
    });
    // switch back to sim1
    test('switch back to sim1, test state', function() {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': true}];
      assertSettingsEquals(testSet);
    });
    // other locked states with sim1
    test('test locked state with sim1', function() {
      var lockedCardState = ['pinRequired',
                             'pukRequired',
                             'networkLocked',
                             'corporateLocked',
                             'serviceProviderLocked'];
      // all states linked with null simcard.
      var testSet = [{'key': KEY_USB_TETHERING, 'result': true},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      lockedCardState.forEach(function(state) {
        changeCardState(state, TEST_ICCID1);
        assertSettingsEquals(testSet);
      });
    });
  });
});
mocha.setup({ignoreLeaks: false});

