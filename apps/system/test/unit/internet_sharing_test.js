'use strict';
/* global asyncStorage */
/* global IccHelper */
/* global InternetSharing */
/* global AirplaneMode */
/* global MockIccHelper */
/* global MockL10n */
/* global MocksHelper */
/* global MockNavigatorSettings */
/* global MockNavigatorMozMobileConnections */
/* global MockModalDialog */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/test/unit/mock_airplane_mode.js');
requireApp('system/test/unit/mock_asyncStorage.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/js/internet_sharing.js');

var mocksForInternetSharing = new MocksHelper([
  'AirplaneMode',
  'ModalDialog',
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
  const MOBILE_CONNECTION_COUNT = 2;

  var realSettings, realL10n, subject, realMozMobileConnections;
  var getDUNConnectionSpy;

  suiteSetup(function() {
    // Unfortunately, for asyncStorage scoping reasons, we can't simply
    // use 'attachTestHelpers' anywhere in the internet sharing tests.
    mocksForInternetSharing.suiteSetup();
    // we need MockIccHelper properly set
    mocksForInternetSharing.setup();

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    for (var i = 0; i < MOBILE_CONNECTION_COUNT; i++) {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
      MockNavigatorMozMobileConnections[i].data = {
        connected: !i,
        type: (!i ? 'evdo0' : undefined)
      };
    }
    subject = new InternetSharing();
    subject.start();
  });

  setup(function() {
    getDUNConnectionSpy = this.sinon.spy(subject, 'getDUNConnection');
  });

  suiteTeardown(function() {
    // we need MockIccHelper properly reset
    mocksForInternetSharing.teardown();
    mocksForInternetSharing.suiteTeardown();
    navigator.mozSettings = realSettings;
    navigator.mozL10n = realL10n;
    MockNavigatorMozMobileConnections.mTeardown();
    navigator.mozMobileConnections = realMozMobileConnections;
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
    MockIccHelper.mProps.cardState = state;
    MockIccHelper.mProps.iccInfo = {'iccid': iccid};
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

    // fresh startup
    test('null sim no settings', function() {
      // empty start
      var mEventListeners = MockIccHelper.mEventListeners;
      var mObservers = MockNavigatorSettings.mObservers;

      assert.ok(
        mEventListeners.cardstatechange.length > 0);
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
        mEventListeners.cardstatechange.length > 0);
      assert.ok(
        mObservers[KEY_USB_TETHERING].length > 0);
      assert.ok(
        mObservers[KEY_WIFI_HOTSPOT].length > 0);
    });
    // card state from unknown to pinRequired
    test('sim1 pinRequired no settings', function(done) {
      changeCardState('pinRequired', null);

      var mEventListeners = MockIccHelper.mEventListeners;
      var mObservers = MockNavigatorSettings.mObservers;
      assert.ok(
        mEventListeners.cardstatechange.length > 0);
      assert.ok(
        mObservers[KEY_USB_TETHERING].length > 0);
      assert.ok(
        mObservers[KEY_WIFI_HOTSPOT].length > 0);

      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // user typed pin, enter ready state
    test('sim1 ready no settings', function(done) {
      // use null iccid for initialization test.
      changeCardState('ready', null);

      // ready state, wait for iccInfo ready.
      var mEventListeners = MockIccHelper.mEventListeners;
      assert.ok(MockIccHelper.oniccinfochange ||
                mEventListeners.iccinfochange.length == 1);

      // add iccInfo
      MockIccHelper.mProps.iccInfo = {dummy: 'dummyValue'};
      MockIccHelper.mTriggerEventListeners('iccinfochange', {});
      assert.ok(MockIccHelper.oniccinfochange ||
                mEventListeners.iccinfochange.length == 1);

      // add iccid
      MockIccHelper.mProps.iccInfo = {iccid: TEST_ICCID1};
      MockIccHelper.mTriggerEventListeners('iccinfochange', {});
      assert.ok(!MockIccHelper.oniccinfochange ||
                mEventListeners.iccinfochange.length === 0);

      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // user change usb tethering to true
    test('sim1 ready, usb tethering enable', function(done) {
      changeSettings(KEY_USB_TETHERING, true);
      var testSet = [
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID1, 'result': true},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID1, 'result': false},
        {'key': PREFIX_ASYNC_STORAGE_USB + TEST_ICCID2, 'result': null},
        {'key': PREFIX_ASYNC_STORAGE_WIFI + TEST_ICCID2, 'result': null}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertAynscStorageEquals(testSet);
      }).then(done, done);
    });
    // user remove sim 1
    test('sim1 removed', function(done) {
      changeCardState(null, null);
      IccHelper.mProps.cardState = null;
      IccHelper.mProps.iccInfo = {};
      IccHelper.mTriggerEventListeners('cardstatechange', {});
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // sim 1 inserted, usb tethering should be enabled
    test('sim1 inserted, usb tethering enabled', function(done) {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': true},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // sim 1 removed, disable usb tethering.
    test('disable usb tethering, sim1 removed', function(done) {
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      // disable usb
      changeSettings(KEY_USB_TETHERING, false);
      // remove sim 1
      changeCardState(null, null);
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });

    // sim 1 re-inserted, disable usb tethering.
    test('disable usb tethering, sim1 re-inserted', function(done) {
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      // disable usb
      changeSettings(KEY_USB_TETHERING, false);
      // re-insert sim 1
      changeCardState('ready', TEST_ICCID1);
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
  });
  // switching test for 2 sim and no sim
  suite('switch between sim1, sim2, and null >>', function() {
    suiteSetup(function() {
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
    test('switch to sim1, test state', function(done) {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': true}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // switch to sim2
    test('switch to sim2, test state', function(done) {
      changeCardState('ready', TEST_ICCID2);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // switch to no sim
    test('switch to no sim, test state', function(done) {
      changeCardState(null, null);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': false}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // switch back to sim1
    test('switch back to sim1, test state', function(done) {
      changeCardState('ready', TEST_ICCID1);
      var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                     {'key': KEY_WIFI_HOTSPOT, 'result': true}];
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });
    // other locked states with sim1
    var lockedCardState = ['pinRequired',
                           'pukRequired',
                           'networkLocked',
                           'corporateLocked',
                           'serviceProviderLocked',
                           'network1Locked',
                           'network2Locked',
                           'hrpdNetworkLocked',
                           'ruimCorporateLocked',
                           'ruimServiceProviderLocked'];
    // all states linked with null simcard.
    var testSet = [{'key': KEY_USB_TETHERING, 'result': false},
                   {'key': KEY_WIFI_HOTSPOT, 'result': false}];
    lockedCardState.forEach(function(state) {
      test('test locked state with sim1 '+ state, function(done) {
        changeCardState(state, TEST_ICCID1);
        getDUNConnectionSpy.lastCall.returnValue.then(function() {
          assertSettingsEquals(testSet);
        }).then(done, done);
      });
    });
  });

  suite('wifi hotspot', function() {
    var testSet = [{'key': KEY_WIFI_HOTSPOT, 'result': false}];
    test('can\'t turn on hotspot when APM is on', function(done) {
      AirplaneMode.enabled = true;
      subject.internetSharingSettingsChangeHanlder({
        settingName: 'wifi',
        settingValue: true
      });
      getDUNConnectionSpy.lastCall.returnValue.then(function() {
        assertSettingsEquals(testSet);
      }).then(done, done);
    });

    test('can\'t turn on hotspot when there is no sim (APM is off)',
      function(done) {
        AirplaneMode.enabled = false;
        subject.internetSharingSettingsChangeHanlder({
          settingName: 'wifi',
          settingValue: true
        });
        getDUNConnectionSpy.lastCall.returnValue.then(function() {
          assertSettingsEquals(testSet);
        }).then(done, done);
    });

    suite('no data connection', function() {
      var modalDialogSpy;
      setup(function() {
        MockNavigatorMozMobileConnections[0].data = {
          connected: true,
          type: 'gprs'
        };
        changeSettings(KEY_USB_TETHERING, true);
        changeSettings(KEY_WIFI_HOTSPOT, true);
        AirplaneMode.enabled = false;
        modalDialogSpy = this.sinon.spy(MockModalDialog, 'alert');
      });

      test('can\'t turn on hotspot when there is no data connection',
        function() {
          subject.internetSharingSettingsChangeHanlder({
            settingName: 'wifi',
            settingValue: true
          });
          getDUNConnectionSpy.lastCall.returnValue.then(function() {
            assertSettingsEquals(testSet);
          });
      });

      test('should open the modal dialog', function() {
        var title = 'no-connectivity-head';
        var buttonText = 'ok';
        var message = 'no-connectivity-message-wifi-tethering';
        subject.internetSharingSettingsChangeHanlder({
          settingName: 'wifi',
          settingValue: true
        });
        getDUNConnectionSpy.lastCall.returnValue.then(function() {
          assert.isTrue(modalDialogSpy.calledWith(title,
            message, { title: buttonText }));
        });
      });

      test('can\'t turn on hotspot when there is no data connection',
        function() {
          subject.internetSharingSettingsChangeHanlder({
            settingName: 'usb',
            settingValue: true
          });
          getDUNConnectionSpy.lastCall.returnValue.then(function() {
            assertSettingsEquals(testSet);
          });
      });

      test('should open the modal dialog', function() {
        var title = 'no-connectivity-head';
        var buttonText = 'ok';
        var message = 'no-connectivity-message-usb-tethering';
        subject.internetSharingSettingsChangeHanlder({
          settingName: 'usb',
          settingValue: true
        });
        getDUNConnectionSpy.lastCall.returnValue.then(function() {
          assert.isTrue(modalDialogSpy.calledWith(title,
            message, { title: buttonText }));
        });
      });
    });
  });
});
