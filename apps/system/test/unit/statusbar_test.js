'use strict';

requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');

requireApp('system/js/statusbar.js');

if (!window.SettingsListener) {
  window.SettingsListener = null;
}

suite('system/Statusbar', function() {
  var fakeStatusBarNode;
  var realSettingsListener, realMozL10n, realMozMobileConnection,
      realMozTelephony,
      fakeIcons = [];

  suiteSetup(function() {
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozTelephony = realMozTelephony;
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
    fakeStatusBarNode = document.createElement('div');
    fakeStatusBarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusBarNode);

    StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt = document.createElement('div');
      elt.id = 'statusbar-' + elementName;
      elt.hidden = true;
      fakeStatusBarNode.appendChild(elt);
      fakeIcons[elementName] = elt;
    });

    // executing init again
    StatusBar.init();
  });
  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozMobileConnection.mTeardown();
  });

  suite('system-downloads', function() {
    test('incrementing should display the icon', function() {
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing then decrementing should not display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing twice then decrementing once should display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
    test('incrementing then decrementing twice should not display the icon',
      function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      assert.isTrue(fakeIcons['system-downloads'].hidden);
    });

    /* JW: testing that we can't have a negative counter */
    test('incrementing then decrementing twice then incrementing should ' +
         'display the icon', function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
  });

  suite('signal icon', function() {
    var dataset;
    setup(function() {
      dataset = fakeIcons.signal.dataset;
    });

    test('no network without sim, not searching', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('absent');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('no network without sim, searching', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'searching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('absent');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('no network with sim', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('pinRequired');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.equal(dataset.level, -1);
      assert.notEqual(dataset.searching, 'true');
    });

    test('searching', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'searching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('ready');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.equal(dataset.level, -1);
      assert.equal(dataset.searching, 'true');
    });

    test('emergency calls only, no sim', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('absent');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, with sim', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('pinRequired');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.emergency, 'true');
      assert.equal(dataset.level, '-1');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, in call', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('pinRequired');
      MockNavigatorMozMobileConnection.mNextIccInfo({});
      MockNavigatorMozTelephony.mNextActive({
        state: 'connected'
      });


      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, dialing', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('pinRequired');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      MockNavigatorMozTelephony.mNextActive({
        state: 'dialing'
      });

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls, passing a call', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('pinRequired');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      var activeCall = {
        state: 'dialing'
      };

      MockNavigatorMozTelephony.mNextActive(activeCall);
      MockNavigatorMozTelephony.mNextCalls([activeCall]);
      var evt = new CustomEvent('callschanged');
      MockNavigatorMozTelephony.mTriggerEvent(evt);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('normal carrier', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: true,
        relSignalStrength: 80,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('ready');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('roaming', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: true,
        relSignalStrength: 80,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: true,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('ready');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.equal(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls, roaming', function() {
      MockNavigatorMozMobileConnection.mNextVoice({
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: true,
        network: {}
      });

      MockNavigatorMozMobileConnection.mNextCardState('ready');
      MockNavigatorMozMobileConnection.mNextIccInfo({});

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, -1);
      assert.equal(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

  });
});
