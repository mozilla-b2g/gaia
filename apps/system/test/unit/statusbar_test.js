'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_mobile_operator.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('system/shared/test/unit/mocks/mock_icc_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_telephony.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/js/statusbar.js');
requireApp('system/js/lockscreen.js');

var mocksForStatusBar = new MocksHelper([
  'SettingsListener',
  'MobileOperator',
  'IccHelper',
  'LockScreen'
]).init();

suite('system/Statusbar', function() {
  var fakeStatusBarNode;

  var realMozL10n, realMozMobileConnection, realMozTelephony, fakeIcons = [];

  mocksForStatusBar.attachTestHelpers();
  suiteSetup(function() {
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
  });

  setup(function() {
    fakeStatusBarNode = document.createElement('div');
    fakeStatusBarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusBarNode);

    StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
      var elt;
      if (elementName == 'system-downloads' ||
          elementName == 'network-activity') {
        elt = document.createElement('canvas');
      } else {
        elt = document.createElement('div');
      }
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

// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 840500.
    test('incrementing then decrementing twice then incrementing should ' +
         'display the icon', function() {
      StatusBar.incSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.decSystemDownloads();
      StatusBar.incSystemDownloads();
      assert.isFalse(fakeIcons['system-downloads'].hidden);
    });
  });

  suite('time bar', function() {
    setup(function() {
      StatusBar.clock.stop();
      StatusBar.screen = document.createElement('div');
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('first launch', function() {
      MockLockScreen.locked = true;
      StatusBar.init();
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('lock', function() {
      var evt = new CustomEvent('lock');
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('unlock', function() {
      var evt = new CustomEvent('unlock');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('attentionscreen show', function() {
      var evt = new CustomEvent('attentionscreenshow');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('attentionsceen hide', function() {
      var evt = new CustomEvent('attentionscreenhide');
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('emergency call when locked', function() {
      var evt = new CustomEvent('lockpanelchange', {
        detail: {
          panel: 'emergency-call'
        }
      });
      StatusBar.screen.classList.add('locked');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('moztime change', function() {
      var evt = new CustomEvent('moztimechange');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('screen enable but screen is unlocked', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: true
        }
      });
      MockLockScreen.locked = false;
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('screen enable and screen is locked', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: true
        }
      });
      MockLockScreen.locked = true;
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('screen disable', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: false
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
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

      IccHelper.mProps['cardState'] = 'absent';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'absent';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'ready';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'absent';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'ready';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'ready';
      IccHelper.mProps['iccInfo'] = {};

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

      IccHelper.mProps['cardState'] = 'ready';
      IccHelper.mProps['iccInfo'] = {};

      StatusBar.update.signal.call(StatusBar);

      assert.notEqual(dataset.roaming, 'true');
      assert.equal(dataset.level, -1);
      assert.equal(dataset.emergency, 'true');
      assert.notEqual(dataset.searching, 'true');
    });

    test('emergency calls, avoid infinite callback loop', function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: false,
        relSignalStrength: 80,
        emergencyCallsOnly: true,
        state: 'notSearching',
        roaming: false,
        network: {}
      };

      IccHelper.mProps['cardState'] = 'pinRequired';
      IccHelper.mProps['iccInfo'] = {};

      var mockTel = MockNavigatorMozTelephony;

      StatusBar.update.signal.call(StatusBar);
      assert.equal(mockTel.mCountEventListener('callschanged', StatusBar), 1);

      // Bug 880390: On B2G18 adding a 'callschanged' listener can trigger
      // another event immediately.  To avoid an infinite loop, the listener
      // must only be added once.  Simulate this immediate event here and then
      // check that we still only have one listener.

      var evt = new CustomEvent('callschanged');
      mockTel.mTriggerEvent(evt);
      assert.equal(mockTel.mCountEventListener('callschanged', StatusBar), 1);
    });
  }),

  suite('operator name', function() {
    setup(function() {
      MockNavigatorMozMobileConnection.voice = {
        connected: true,
        network: {
          shortName: 'Fake short',
          longName: 'Fake long',
          mnc: '10' // VIVO
        },
        cell: {
          gsmLocationAreaCode: 71 // BA
        }
      };

      IccHelper.mProps['iccInfo'] = {
        isDisplaySpnRequired: false,
        spn: 'Fake SPN'
      };
    });

    test('Connection without region', function() {
      MockMobileOperator.mOperator = 'Orange';
      var evt = new CustomEvent('iccinfochange');
      StatusBar.handleEvent(evt);
      assert.include(fakeIcons.label.textContent, 'Orange');
    });
    test('Connection with region', function() {
      MockMobileOperator.mOperator = 'Orange';
      MockMobileOperator.mRegion = 'PR';
      var evt = new CustomEvent('iccinfochange');
      StatusBar.handleEvent(evt);
      var label_content = fakeIcons.label.textContent;
      assert.include(label_content, 'Orange');
      assert.include(label_content, 'PR');
    });
  });

  suite('media information', function() {
    test('geolocation is activating', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'geolocation-status',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.geolocation.hidden, false);
    });
    test('camera is recording', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'recording-status',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.recording.hidden, false);
    });
    test('usb is unmounting', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'volume-state-changed',
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.usb.hidden, false);
    });
    test('headphones is plugged in', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'headphones-status-changed',
          state: 'on'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.headphones.hidden, false);
    });
    test('audio player is playing', function() {
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'audio-channel-changed',
          channel: 'content'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.playing.hidden, false);
    });
  });
});
