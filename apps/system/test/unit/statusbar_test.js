/* globals FtuLauncher, MockAppWindowManager, MockL10n, MockMobileOperator,
           MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
           MockSettingsListener, MocksHelper, MockSIMSlot, MockSIMSlotManager,
           MockSystem, MockTouchForwarder, SimPinDialog, StatusBar, System */

'use strict';

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require(
  '/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/test/unit/mock_app_window_manager.js');
require('/test/unit/mock_ftu_launcher.js');
require('/test/unit/mock_touch_forwarder.js');
require('/test/unit/mock_sim_pin_dialog.js');

var mocksForStatusBar = new MocksHelper([
  'FtuLauncher',
  'SettingsListener',
  'MobileOperator',
  'SIMSlotManager',
  'AppWindowManager',
  'TouchForwarder',
  'SimPinDialog'
]).init();

suite('system/Statusbar', function() {
  var mobileConnectionCount = 2;
  var fakeStatusBarNode, fakeTopPanel, fakeStatusBarBackground,
      fakeStatusBarIcons, fakeStatusBarConnections,
      fakeStatusBarCallForwardings, fakeStatusBarTime, fakeStatusBarLabel,
      fakeStatusBarBattery;
  var realMozL10n, realMozMobileConnections, realMozTelephony, fakeIcons = [];

  function prepareDOM() {
    for (var i = 1; i < mobileConnectionCount; i++) {
      MockNavigatorMozMobileConnections.mAddMobileConnection();
    }

    fakeStatusBarNode = document.createElement('div');
    fakeStatusBarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusBarNode);

    fakeTopPanel = document.createElement('div');
    fakeTopPanel.id = 'top-panel';
    document.body.appendChild(fakeTopPanel);

    fakeStatusBarBackground = document.createElement('div');
    fakeStatusBarBackground.id = 'statusbar-background';
    document.body.appendChild(fakeStatusBarBackground);

    fakeStatusBarIcons = document.createElement('div');
    fakeStatusBarIcons.id = 'statusbar-icons';
    document.body.appendChild(fakeStatusBarIcons);

    fakeStatusBarConnections = document.createElement('div');
    fakeStatusBarConnections.id = 'statusbar-connections';
    document.body.appendChild(fakeStatusBarConnections);

    fakeStatusBarCallForwardings = document.createElement('div');
    fakeStatusBarCallForwardings.id = 'statusbar-call-forwardings';
    document.body.appendChild(fakeStatusBarCallForwardings);

    fakeStatusBarTime = document.createElement('div');
    fakeStatusBarTime.id = 'statusbar-time';
    document.body.appendChild(fakeStatusBarTime);

    fakeStatusBarLabel = document.createElement('div');
    fakeStatusBarLabel.id = 'statusbar-label';
    document.body.appendChild(fakeStatusBarLabel);

    fakeStatusBarBattery = document.createElement('div');
    fakeStatusBarBattery.id = 'statusbar-battery';
    document.body.appendChild(fakeStatusBarBattery);
  }

  mocksForStatusBar.attachTestHelpers();

  setup(function(done) {
    window.System = MockSystem;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    prepareDOM();

    requireApp('system/js/statusbar.js', statusBarReady);

    function statusBarReady() {

      StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
        var elt =document.getElementById('statusbar-' + elementName);
        if (elt) {
          elt.parentNode.removeChild(elt);
        }
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

      var signalElements = document.querySelectorAll('.statusbar-signal');
      var dataElements = document.querySelectorAll('.statusbar-data');

      fakeIcons.signals = {};
      Array.prototype.slice.call(signalElements).forEach(
        function(signal, index) {
          fakeIcons.signals[mobileConnectionCount - index - 1] = signal;
        }
      );
      fakeIcons.data = {};
      Array.prototype.slice.call(dataElements).forEach(function(data, index) {
        fakeIcons.data[mobileConnectionCount - index - 1] = data;
      });

      done();
    }
  });

  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    System.locked = false;
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozTelephony = realMozTelephony;
  });

  suite('airplane mode icon', function() {
    test('turning on airplane mode makes icon appear', function() {
      MockSettingsListener.mCallbacks['airplaneMode.enabled'](true);
      assert.isFalse(StatusBar.icons.flightMode.hidden);
    });
  });

  suite('init', function() {
    test('signal and data icons are created correctly', function() {
      assert.equal(Object.keys(fakeIcons.signals).length,
        mobileConnectionCount);
      assert.equal(Object.keys(fakeIcons.data).length, mobileConnectionCount);
    });
  });

  suite('StatusBar height', function() {
    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return true;
        }
      };

      this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
      StatusBar.screen = document.createElement('div');
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('Active app is fullscreen', function() {
      assert.equal(StatusBar.height, 0);
    });
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
      System.locked = true;
      StatusBar.init();
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('lock', function() {
      System.locked = true;
      var evt = new CustomEvent('lockscreen-appopened');
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('unlock', function() {
      var evt = new CustomEvent('lockscreen-appclosed');
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
      // Test this when lockscreen is off.
      System.locked = false;
      var evt = new CustomEvent('attentionscreenhide');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
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
    test('moztime change while lockscreen is unlocked', function() {
      this.sinon.useFakeTimers();
      System.locked = false;
      var evt = new CustomEvent('moztimechange');
      StatusBar.handleEvent(evt);
      this.sinon.clock.tick();
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
      this.sinon.clock.restore();
    });
    test('screen enable but screen is unlocked', function() {
      var evt = new CustomEvent('screenchange', {
        detail: {
          screenEnabled: true
        }
      });
      System.locked = false;
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
      System.locked = true;
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
    var mockSimSlots;
    setup(function() {
      mockSimSlots = [];
      for (var i = 0; i < mobileConnectionCount; i++) {
        var mockSIMSlot =
          new MockSIMSlot(MockNavigatorMozMobileConnections[i], i);
        mockSimSlots.push(mockSIMSlot);
      }
    });

    teardown(function() {
      mockSimSlots = null;
    });

    function slotIndexTests(slotIndex) {
      suite('slot: ' + slotIndex, function() {
        var dataset;
        setup(function() {
          dataset = fakeIcons.signals[slotIndex].dataset;
          MockSIMSlotManager.mInstances = mockSimSlots;
        });

        test('no network without sim, not searching', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: null,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = null;
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.isUndefined(dataset.level);
          assert.notEqual(dataset.searching, 'true');
        });

        test('no network without sim, searching', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: null,
            emergencyCallsOnly: false,
            state: 'searching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = null;
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.isUndefined(dataset.level);
          assert.notEqual(dataset.searching, 'true');
        });

        test('no network with sim, sim locked', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: null,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          StatusBar.update.signal.call(StatusBar);

          assert.equal(fakeIcons.signals[slotIndex].hidden, true);
        });

        test('searching', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: null,
            emergencyCallsOnly: false,
            state: 'searching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, -1);
          assert.equal(dataset.searching, 'true');
        });

        test('emergency calls only, no sim', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = null;
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(true);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.isUndefined(dataset.level);
          assert.notEqual(dataset.searching, 'true');
        });

        test('emergency calls only, with sim', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          StatusBar.update.signal.call(StatusBar);

          assert.equal(fakeIcons.signals[slotIndex].hidden, true);
        });

        test('emergency calls only, in call', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          MockNavigatorMozTelephony.active = {
            state: 'connected',
            serviceId: slotIndex
          };

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, 4);
          assert.notEqual(dataset.searching, 'true');
        });

        test('emergency calls only, dialing', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          MockNavigatorMozTelephony.active = {
            state: 'dialing',
            serviceId: slotIndex
          };

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, 4);
          assert.notEqual(dataset.searching, 'true');
        });

        test('emergency calls, passing a call', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          StatusBar.update.signal.call(StatusBar);

          var activeCall = {
            state: 'dialing',
            serviceId: slotIndex
          };

          MockNavigatorMozTelephony.active = activeCall;
          MockNavigatorMozTelephony.calls = [activeCall];

          var evt = new CustomEvent('callschanged');
          MockNavigatorMozTelephony.mTriggerEvent(evt);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, 4);
          assert.notEqual(dataset.searching, 'true');
        });

        test('normal carrier', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: true,
            relSignalStrength: 80,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, 4);
          assert.notEqual(dataset.searching, 'true');
        });

        test('airplane mode', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: true,
            relSignalStrength: 80,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          MockSettingsListener.mCallbacks['airplaneMode.enabled'](true);

          assert.isFalse(StatusBar.icons.flightMode.hidden);
          assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
        });

        test('roaming', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: true,
            relSignalStrength: 80,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: true,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          StatusBar.update.signal.call(StatusBar);

          assert.equal(dataset.roaming, 'true');
          assert.equal(dataset.level, 4);
          assert.notEqual(dataset.searching, 'true');
        });

        test('emergency calls, roaming', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: true,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          StatusBar.update.signal.call(StatusBar);

          assert.notEqual(dataset.roaming, 'true');
          assert.equal(dataset.level, -1);
          assert.notEqual(dataset.searching, 'true');
        });

        test('emergency calls, avoid infinite callback loop', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 80,
            emergencyCallsOnly: true,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'pinRequired';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);
          sinon.stub(mockSimSlots[slotIndex], 'isLocked').returns(true);

          var mockTel = MockNavigatorMozTelephony;

          StatusBar.update.signal.call(StatusBar);
          assert.equal(mockTel.mCountEventListener('callschanged',
                                                   StatusBar), 1);

          // Bug 880390: On B2G18 adding a 'callschanged' listener can trigger
          // another event immediately.  To avoid an infinite loop, the
          // listener must only be added once.  Simulate this immediate event
          // here and then check that we still only have one listener.

          var evt = new CustomEvent('callschanged');
          mockTel.mTriggerEvent(evt);
          assert.equal(mockTel.mCountEventListener('callschanged',
                                                   StatusBar), 1);
        });

        test('EVDO connection, show data call signal strength', function() {
          MockNavigatorMozMobileConnections[slotIndex].voice = {
            connected: false,
            relSignalStrength: 0,
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          MockNavigatorMozMobileConnections[slotIndex].data = {
            connected: true,
            relSignalStrength: 80,
            type: 'evdo',
            emergencyCallsOnly: false,
            state: 'notSearching',
            roaming: false,
            network: {}
          };

          mockSimSlots[slotIndex].simCard.cardState = 'ready';
          mockSimSlots[slotIndex].simCard.iccInfo = {};
          sinon.stub(mockSimSlots[slotIndex], 'isAbsent').returns(false);

          StatusBar.update.signal.call(StatusBar);
          assert.equal(dataset.level, 4);
        });
      });
    }

    for (var i = 0; i < mobileConnectionCount; i++) {
      slotIndexTests(i);
    }
  });

  suite('Icon Data', function() {
    var mobileDataIconTypesOrig = {};

    suiteSetup(function() {
      for (var key in StatusBar.mobileDataIconTypes) {
        mobileDataIconTypesOrig[key] = StatusBar.mobileDataIconTypes[key];
      }
    });

    suiteTeardown(function() {
      for (var key in mobileDataIconTypesOrig) {
        StatusBar.mobileDataIconTypes[key] = mobileDataIconTypesOrig[key];
      }
    });

    setup(function() {
      for (var key in StatusBar.mobileDataIconTypes) {
        StatusBar.mobileDataIconTypes[key] = mobileDataIconTypesOrig[key];
      }
    });

    teardown(function() {
      StatusBar.settingValues = {};
    });

    var testCases = [
      {
        title: 'No setting value >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
        },
        expectVal: {
          'lte': '4G',
          'ehrpd': '4G',
          'hspa+': 'H+',
          'hsdpa': 'H', 'hsupa': 'H', 'hspa': 'H',
          'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev',
          'umts': '3G',
          'edge': 'E',
          'gprs': '2G',
          '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x'
        }
      },
      {
        title: 'Change all values >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'EvChng', 'evdoa': 'EvChng', 'evdob': 'EvChng',
          'umts': '3GChng',
          'edge': 'EChng',
          'gprs': '2GChng',
          '1xrtt': '1xChng', 'is95a': '1xChng', 'is95b': '1xChng'
        },
        expectVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'EvChng', 'evdoa': 'EvChng', 'evdob': 'EvChng',
          'umts': '3GChng',
          'edge': 'EChng',
          'gprs': '2GChng',
          '1xrtt': '1xChng', 'is95a': '1xChng', 'is95b': '1xChng'
        }
      },
      {
        title: 'Change some values >',
        setting: 'operatorResources.data.icon',
        fc: 'iconData',
        inputVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng'
        },
        expectVal: {
          'lte': '4GChng',
          'ehrpd': '4GChng',
          'hspa+': 'H+Chng',
          'hsdpa': 'HChng', 'hsupa': 'HChng', 'hspa': 'HChng',
          'evdo0': 'Ev', 'evdoa': 'Ev', 'evdob': 'Ev',
          'umts': '3G',
          'edge': 'E',
          'gprs': '2G',
          '1xrtt': '1x', 'is95a': '1x', 'is95b': '1x'
        }
      }
    ];

    testCases.forEach(function(testCase) {
      test(testCase.title, function() {
        StatusBar.settingValues[testCase.setting] = testCase.inputVal;
        StatusBar.update[testCase.fc].call(StatusBar);
        assert.deepEqual(StatusBar.mobileDataIconTypes, testCase.expectVal);
      });
    });
  });

  suite('call forwarding', function() {
    setup(function() {
      var defaultValue = [];
      for (var i = 0; i < mobileConnectionCount; i++) {
        defaultValue.push(false);
      }
      StatusBar.settingValues['ril.cf.enabled'] = defaultValue;
    });

    function slotIndexTests(slotIndex) {
      suite('slot: ' + slotIndex, function() {
        test('call forwarding enabled', function() {
          StatusBar.settingValues['ril.cf.enabled'][slotIndex] = true;
          StatusBar.update.callForwarding.call(StatusBar);
          assert.isFalse(StatusBar.icons.callForwardings[slotIndex].hidden);
        });

        test('call forwarding disabled', function() {
          StatusBar.settingValues['ril.cf.enabled'][slotIndex] = false;
          StatusBar.update.callForwarding.call(StatusBar);
          assert.isTrue(StatusBar.icons.callForwardings[slotIndex].hidden);
        });
      });
    }

    for (var i = 0; i < mobileConnectionCount; i++) {
      slotIndexTests(i);
    }
  });

  suite('data connection', function() {
    function slotIndexTests(slotIndex) {
      suite('slot: ' + slotIndex, function() {
        suite('data connection unavailable', function() {
          teardown(function() {
            StatusBar.settingValues = {};
          });

          test('radio disabled', function() {
            StatusBar.settingValues['ril.radio.disabled'] = true;
            StatusBar.update.data.call(StatusBar);
            assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
            // Just because radio is disabled doesn't mean we're in airplane
            // mode.
            assert.isTrue(StatusBar.icons.flightMode.hidden);
          });

          test('data disabled', function() {
            StatusBar.settingValues['ril.data.enabled'] = false;
            StatusBar.update.data.call(StatusBar);
            assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
          });

          test('data not connected', function() {
            MockNavigatorMozMobileConnections[slotIndex].data =
              { connected: false };
            StatusBar.update.data.call(StatusBar);
            assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
          });

          test('wifi icon is displayed', function() {
            StatusBar.icons.wifi.hidden = false;
            StatusBar.update.data.call(StatusBar);
            assert.isTrue(StatusBar.icons.data[slotIndex].hidden);
          });
        });

        suite('data connection available', function() {
          setup(function() {
            StatusBar.settingValues['ril.radio.disabled'] = false;
            StatusBar.settingValues['ril.data.enabled'] = true;
            StatusBar.icons.wifi.hidden = true;
          });

          teardown(function() {
            StatusBar.settingValues = {};
          });

          test('type lte', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'lte'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '4G');
          });

          // GSM
          test('type hspa+', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'hspa+'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H+');
          });

          test('type hsdpa', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'hsdpa'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
          });

          test('type hsupa', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'hsupa'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
          });

          test('type hspa', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'hspa'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, 'H');
          });

          test('type umts', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'umts'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '3G');
          });

          test('type edge', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'edge'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, 'E');
          });

          test('type gprs', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'gprs'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '2G');
          });

          // CDMA
          test('type 1xrtt', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: '1xrtt'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
          });

          test('type is95a', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'is95a'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
          });

          test('type is95b', function() {
            MockNavigatorMozMobileConnections[slotIndex].data = {
              connected: true,
              type: 'is95b'
            };
            StatusBar.update.data.call(StatusBar);
            assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
          });

          // CDMA related to calls
          suite('CDMA network types when there is a call',
            function() {
              test('type ehrpd', function() {
                MockNavigatorMozTelephony.calls = [{}];
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'ehrpd'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent,
                             '4G');
            });

            test('type evdo0', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdo0'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });

            test('type evdoa', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdoa'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });

            test('type evdob', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdob'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });

            test('type 1xrtt', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: '1xrtt'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });

            test('type is95a', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95a'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });

            test('type is95b', function() {
              MockNavigatorMozTelephony.calls = [{}];
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95b'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '');
            });
          });

          suite('CDMA network types when there is no call',
            function() {
              test('type ehrpd', function() {
                MockNavigatorMozMobileConnections[slotIndex].data = {
                  connected: true,
                  type: 'ehrpd'
                };
                StatusBar.update.data.call(StatusBar);
                assert.equal(StatusBar.icons.data[slotIndex].textContent,
                             '4G');
            });

            test('type evdo0', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdo0'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
            });

            test('type evdoa', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdoa'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
            });

            test('type evdob', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'evdob'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, 'Ev');
            });

            test('type 1xrtt', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: '1xrtt'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });

            test('type is95a', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95a'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });

            test('type is95b', function() {
              MockNavigatorMozMobileConnections[slotIndex].data = {
                connected: true,
                type: 'is95b'
              };
              StatusBar.update.data.call(StatusBar);
              assert.equal(StatusBar.icons.data[slotIndex].textContent, '1x');
            });
          });
        });
      });
    }

    for (var i = 0; i < mobileConnectionCount; i++) {
      slotIndexTests(i);
    }
  });

  suite('operator name', function() {
    setup(function() {
      MockNavigatorMozMobileConnections[0].voice = {
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
    });

    suite('single sim', function() {
      var conn;
      setup(function() {
        conn = MockNavigatorMozMobileConnections[1];
        MockNavigatorMozMobileConnections.mRemoveMobileConnection(1);
      });
      teardown(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 1);
      });

      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.include(label_content, 'Orange');
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.include(label_content, 'Orange');
        assert.include(label_content, 'PR');
      });
    });

    suite('multiple sims', function() {
      test('Connection without region', function() {
        MockMobileOperator.mOperator = 'Orange';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.equal(-1, label_content.indexOf('Orange'));
      });

      test('Connection with region', function() {
        MockMobileOperator.mOperator = 'Orange';
        MockMobileOperator.mRegion = 'PR';
        var evt = new CustomEvent('simslot-iccinfochange');
        StatusBar.handleEvent(evt);
        var label_content = fakeIcons.label.textContent;
        assert.equal(-1, label_content.indexOf('Orange'));
        assert.equal(-1, label_content.indexOf('PR'));
      });
    });
  });

  suite('media information', function() {
    var fakeClock;
    var recordingSpy;

    setup(function() {
      fakeClock = this.sinon.useFakeTimers();
      recordingSpy = this.sinon.spy(StatusBar.update, 'recording');
    });

    teardown(function() {
      StatusBar.recordingCount = 0;
      fakeClock.restore();
    });

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

    test('media_recording is activating', function() {
      var evt = new CustomEvent('recordingEvent', {
        detail: {
          type: 'recording-state-changed',
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

  suite('fullscreen mode >', function() {
    function forgeTouchEvent(type, x, y) {
        var touch = document.createTouch(window, null, 42, x, y,
                                         x, y, x, y,
                                         0, 0, 0, 0);
        var touchList = document.createTouchList(touch);
        var touches = (type == 'touchstart' || type == 'touchmove') ?
                           touchList : null;
        var changed = (type == 'touchmove') ?
                           null : touchList;

        var e = document.createEvent('TouchEvent');
        e.initTouchEvent(type, true, true,
                         null, null, false, false, false, false,
                         touches, null, changed);

        return e;
    }

    function forgeMouseEvent(type, x, y) {
      var e = document.createEvent('MouseEvent');

      e.initMouseEvent(type, true, true, window, 1, x, y, x, y,
                       false, false, false, false, 0, null);

      return e;
    }

    function fakeDispatch(type, x, y) {
      var e;
      if (type.startsWith('mouse')) {
        e = forgeMouseEvent(type, x, y);
      } else {
        e = forgeTouchEvent(type, x, y);
      }
      StatusBar.panelHandler(e);

      return e;
    }

    // Making sure the time-bounded features won't have side effects
    // outside of this suite.
    setup(function() {
      this.sinon.useFakeTimers();
    });

    teardown(function() {
      this.sinon.clock.tick(10000);
    });

    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return false;
        },
        iframe: document.createElement('iframe')
      };

      this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
      this.sinon.stub(StatusBar.element, 'getBoundingClientRect').returns({
        height: 10
      });

      StatusBar.screen = document.createElement('div');
    });

    test('the status bar should not close if the current app is not fullscreen',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      StatusBar.show();

      var evt = new CustomEvent('utilitytrayhide');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should show when utilitytray is showing',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      StatusBar.hide();

      var evt = new CustomEvent('utilitytrayshow');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should show when attentionscreen is showing',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      StatusBar.hide();

      var evt = new CustomEvent('attentionscreenshow');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should be hidden when attentionscreen is hidden',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      StatusBar.show();

      var evt = new CustomEvent('attentionscreenhide');
      StatusBar.handleEvent(evt);

      assert.isTrue(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should be hidden when app is opening in fullscreen',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      StatusBar.show();

      var evt = new CustomEvent('appopened', { detail: app });
      StatusBar.handleEvent(evt);

      assert.isTrue(StatusBar.element.classList.contains('invisible'));
    });

    test('the status bar should show when app is opening not in fullscreen',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      StatusBar.show();

      var evt = new CustomEvent('appopened', { detail: app });
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });

    suite('Revealing the StatusBar >', function() {
      var transitionEndSpy;
      setup(function() {
        transitionEndSpy = this.sinon.spy(StatusBar.element,
                                          'addEventListener');
      });

      function assertStatusBarReleased() {
        assert.equal(StatusBar.element.style.transform, '');
        assert.equal(StatusBar.element.style.transition, '');

        // We remove the background after the transition
        assert.isTrue(StatusBar.element.classList.contains('dragged'));
        transitionEndSpy.yield();
        assert.isFalse(StatusBar.element.classList.contains('dragged'));
      }

      teardown(function() {
        StatusBar.element.style.transition = '';
        StatusBar.element.style.transform = '';
      });

      test('it should translate the statusbar on touchmove', function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        var transform = 'translateY(calc(5px - 100%))';

        assert.equal(StatusBar.element.style.transform, transform);
        fakeDispatch('touchend', 100, 5);
      });

      test('it should set the dragged class on touchstart', function() {
        fakeDispatch('touchstart', 100, 0);
        assert.isTrue(StatusBar.element.classList.contains('dragged'));
        fakeDispatch('touchend', 100, 5);
      });

      test('it should not translate the statusbar more than its height',
      function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        fakeDispatch('touchmove', 100, 15);
        var transform = 'translateY(calc(10px - 100%))';

        assert.equal(StatusBar.element.style.transform, transform);
        fakeDispatch('touchend', 100, 15);
      });

      test('it should not reveal when ftu is running', function() {
        FtuLauncher.mIsRunning = true;
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        assert.equal(StatusBar.element.style.transform, '');
        FtuLauncher.mIsRunning = false;
      });

      suite('after the gesture', function() {
        suite('when the StatusBar is not fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchend', 100, 5);
          });

          test('it should hide it right away', function() {
            assertStatusBarReleased();
          });
        });

        suite('when the StatusBar is fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchmove', 100, 15);
            fakeDispatch('touchend', 100, 15);
          });

          test('it should not hide it right away', function() {
            var transform = 'translateY(calc(10px - 100%))';
            assert.equal(StatusBar.element.style.transform, transform);
            assert.equal(StatusBar.element.style.transition,
                         'transform 0s ease 0s');
          });

          test('but after 5 seconds', function() {
            this.sinon.clock.tick(5000);
            assertStatusBarReleased();
          });

          test('or if the user interacts with the app', function() {
            // We're faking a touchstart event on the app iframe
            var iframe = StatusBar._touchForwarder.destination;
            StatusBar._touchForwarder.destination = window;

            var e = forgeTouchEvent('touchstart', 100, 100);
            window.dispatchEvent(e);

            assertStatusBarReleased();
            StatusBar._touchForwarder.destination = iframe;
          });
        });
      });
    });

    test('it should prevent default on mouse events keep the focus on the app',
    function() {
      var mousedown = fakeDispatch('mousedown', 100, 0);
      var mousemove = fakeDispatch('mousemove', 100, 2);
      var mouseup = fakeDispatch('mouseup', 100, 2);

      assert.isTrue(mousedown.defaultPrevented);
      assert.isTrue(mousemove.defaultPrevented);
      assert.isTrue(mouseup.defaultPrevented);
    });

    suite('Touch forwarding >', function() {
      var forwardSpy;

      setup(function() {
        forwardSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
      });

      test('it should prevent default on all touch events to prevent reflows',
      function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        var touchmove = fakeDispatch('touchmove', 100, 2);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.isTrue(touchstart.defaultPrevented);
        assert.isTrue(touchmove.defaultPrevented);
        assert.isTrue(touchend.defaultPrevented);
      });

      test('it should set the destination of the TouchForwarder on touchstart',
      function() {
        fakeDispatch('touchstart', 100, 0);
        assert.equal(StatusBar._touchForwarder.destination, app.iframe);
        fakeDispatch('touchend', 100, 0);
      });

      test('it should forward taps to the app', function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 2);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.isTrue(forwardSpy.calledTwice);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], touchend);
      });

      suite('if it\'s not a tap and the statusbar is not fully displayed',
      function() {
        test('it should not forward any events', function() {
          fakeDispatch('touchstart', 100, 0);
          fakeDispatch('touchmove', 100, 8);
          fakeDispatch('touchend', 100, 8);

          assert.isTrue(forwardSpy.notCalled);
        });
      });

      test('it should forward touchmove once the statusbar is shown',
      function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 6);
        var secondMove = fakeDispatch('touchmove', 100, 12);
        var thirdMove = fakeDispatch('touchmove', 100, 18);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.equal(forwardSpy.callCount, 4);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], secondMove);
        call = forwardSpy.getCall(2);
        assert.equal(call.args[0], thirdMove);
        call = forwardSpy.getCall(3);
        assert.equal(call.args[0], touchend);
      });
    });
  });

  suite('not fullscreen mode >', function() {
    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return true;
        },
        iframe: document.createElement('iframe')
      };

      this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
      StatusBar.screen = document.createElement('div');
    });

    test('the status bar should not be hidden when attentionscreen is hidden',
    function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      StatusBar.show();

      var evt = new CustomEvent('attentionscreenhide');
      StatusBar.handleEvent(evt);

      assert.isFalse(StatusBar.element.classList.contains('invisible'));
    });
  });

  suite('NFC', function() {
    test('NFC is off', function() {
      var evt = new CustomEvent('nfc-state-changed', {
        detail: {
          active: false
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.nfc.hidden, true);
    });

    test('NFC is on', function() {
      var evt = new CustomEvent('nfc-state-changed', {
        detail: {
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.nfc.hidden, false);
    });
  });

  suite('Wifi', function() {
    test('Wifi status change event', function() {
      var spyUpdateWifi = this.sinon.spy(StatusBar.update, 'wifi');
      var evt = new CustomEvent('wifi-statuschange');
      StatusBar.handleEvent(evt);
      assert.isTrue(spyUpdateWifi.called);
    });
  });

  suite('Appearance', function() {
    test('set opaque should render properly', function() {
      StatusBar.setAppearance('opaque');
      assert.isTrue(StatusBar.background.classList.contains('opaque'));
    });

    test('set semi-transparent should render properly', function() {
      StatusBar.setAppearance('semi-transparent');
      assert.isFalse(StatusBar.background.classList.contains('opaque'));
    });

    test('simpinshow event should set opaque', function() {
      StatusBar.handleEvent({type: 'simpinshow'});
      assert.isTrue(StatusBar.background.classList.contains('opaque'));
    });

    test('simpinclose event should set semi-transparent', function() {
      StatusBar.handleEvent({type: 'simpinclose'});
      assert.isFalse(StatusBar.background.classList.contains('opaque'));
    });

    suite('iac-change-appearance-statusbar event', function() {
      test('should keep semi-transparent on SIM unlocked', function() {
        SimPinDialog.visible = false;
        StatusBar.handleEvent({
          type: 'iac-change-appearance-statusbar',
          detail: 'semi-transparent'
        });

        assert.isFalse(StatusBar.background.classList.contains('opaque'));
      });

      test('should keep opaque on SIM unlocked', function() {
        SimPinDialog.visible = false;
        StatusBar.handleEvent({
          type: 'iac-change-appearance-statusbar',
          detail: 'opaque'
        });

        assert.isTrue(StatusBar.background.classList.contains('opaque'));
      });

      test('should set opaque when SIM is locked', function() {
        StatusBar.background.classList.remove('opaque');
        SimPinDialog.visible = true;
        StatusBar.handleEvent({
          type: 'iac-change-appearance-statusbar',
          detail: 'semi-transparent'
        });

        assert.isTrue(StatusBar.background.classList.contains('opaque'));
      });
    });
  });
});
