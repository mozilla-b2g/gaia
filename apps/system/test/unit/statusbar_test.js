'use strict';

requireApp('system/test/unit/mock_settings_listener.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_mobile_operator.js');
requireApp('system/test/unit/mocks_helper.js');

requireApp('system/js/statusbar.js');

var mocksForStatusBar = ['SettingsListener', 'MobileOperator'];

mocksForStatusBar.forEach(function(mockName) {
  if (! window[mockName]) {
    window[mockName] = null;
  }
});

suite('system/Statusbar', function() {
  var fakeStatusBarNode;
  var mocksHelper;

  var realSettingsListener, realMozL10n, realMozMobileConnection,
      realMozTelephony,
      fakeIcons = [];

  suiteSetup(function() {
    mocksHelper = new MocksHelper(mocksForStatusBar);
    mocksHelper.suiteSetup();
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozTelephony = realMozTelephony;
    window.SettingsListener = realSettingsListener;
  });

  setup(function() {
    mocksHelper.setup();
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
    mocksHelper.teardown();
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
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'absent';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('no network without sim, searching', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'searching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'absent';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('no network with sim', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'pinRequired';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.equal(dataset.level, -1);
      assert.notEqual(dataset.searching, 'true');
    });

    test('searching', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: null,
        emergencyCallsOnly: false,
        state: 'searching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'ready';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.equal(dataset.level, -1);
      assert.equal(dataset.searching, 'true');
    });

    test('emergency calls only, no sim', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'absent';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.notEqual(dataset.emergency, 'true');
      assert.isUndefined(dataset.level);
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, with sim', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'pinRequired';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.emergency, 'true');
      assert.equal(dataset.level, '-1');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, in call', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'pinRequired';
      MockNavigatorMozMobileConnection.iccInfo = {};

      MockNavigatorMozTelephony.active = {
        state: 'connected'
      };

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls only, dialing', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'pinRequired';
      MockNavigatorMozMobileConnection.iccInfo = {};

      MockNavigatorMozTelephony.active = {
        state: 'dialing'
      };

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls, passing a call', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'pinRequired';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      var activeCall = {
        state: 'dialing'
      };

      MockNavigatorMozTelephony.active = activeCall;
      MockNavigatorMozTelephony.calls = [activeCall];

      var evt = new CustomEvent('callschanged');
      MockNavigatorMozTelephony.mTriggerEvent(evt);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('normal carrier', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: true,
        relSignalStrength: 80,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'ready';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('roaming', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: true,
        relSignalStrength: 80,
        emergencyCallsOnly: false,
        state: 'notSearching',
        roaming: true,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'ready';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.equal(dataset.roaming, 'true');
      assert.equal(dataset.level, 4);
      assert.notEqual(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls, roaming', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: true,
        network: {}
      };

      MockNavigatorMozMobileConnection.cardState = 'ready';
      MockNavigatorMozMobileConnection.iccInfo = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, -1);
      assert.equal(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });
  }),

  suite('operator name', function() {
    setup(function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: true,
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: 10 // VIVO
        },
        cell: {
          gsmLocationAreaCode: 71 // BA
        }
      }

      MockNavigatorMozMobileConnection.iccInfo = {
        isDisplaySpnRequired: false,
        spn: 'Fake SPN'
      }
    });

    test('Connection without region', function() {
      MobileOperator.mOperator = 'Orange';
      var evt = new CustomEvent('iccinfochange');
      StatusBar.handleEvent(evt);
      assert.include(fakeIcons.label.textContent, 'Orange');
    });
    test('Connection with region', function() {
      MobileOperator.mOperator = 'Orange';
      MobileOperator.mRegion = 'PR';
      var evt = new CustomEvent('iccinfochange');
      StatusBar.handleEvent(evt);
      var label_content = fakeIcons.label.textContent;
      assert.include(label_content, 'Orange');
      assert.include(label_content, 'PR');
    });
  });
});
