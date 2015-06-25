/* globals FtuLauncher, MockL10n, MockMobileOperator, MockLayoutManager,
           MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
           MockSettingsListener, MocksHelper, MockSIMSlot, MockSIMSlotManager,
           MockService, StatusBar, Service,
           MockNfcManager, MockMobileconnection, MockAppWindowManager,
           MockNavigatorBattery, UtilityTray, MockAppWindow, layoutManager */
'use strict';

require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require(
  '/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_app_window_manager.js');
require('/test/unit/mock_ftu_launcher.js');
require('/test/unit/mock_nfc_manager.js');
require('/test/unit/mock_touch_forwarder.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_layout_manager.js');
require('/test/unit/mock_navigator_battery.js');
require('/test/unit/mock_app_window.js');

var mocksForStatusBar = new MocksHelper([
  'SettingsListener',
  'MobileOperator',
  'SIMSlotManager',
  'UtilityTray',
  'LayoutManager',
  'NavigatorBattery',
  'AppWindow',
  'Service',
  'FtuLauncher'
]).init();

suite('system/Statusbar', function() {
  var mobileConnectionCount = 2;
  var fakeStatusBarNode, fakeTopPanel, fakeStatusBarBackground,
      fakeStatusBarIcons, fakeStatusbarIconsMaxWrapper, fakeStatusbarIconsMax,
      fakeStatusbarIconsMinWrapper, fakeStatusbarIconsMin,
      fakeStatusBarConnections, fakeStatusBarCallForwardings, fakeStatusBarTime,
      fakeStatusBarLabel, fakeStatusBarBattery;
  var realMozL10n, realMozMobileConnections, realMozTelephony, fakeIcons = [],
      realNfcManager, realLayoutManager, realNavigatorBattery;

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

    fakeStatusbarIconsMaxWrapper = document.createElement('div');
    fakeStatusbarIconsMaxWrapper.id = 'statusbar-maximized-wrapper';
    fakeStatusBarIcons.appendChild(fakeStatusbarIconsMaxWrapper);

    fakeStatusbarIconsMinWrapper = document.createElement('div');
    fakeStatusbarIconsMinWrapper.id = 'statusbar-minimized-wrapper';
    fakeStatusBarIcons.appendChild(fakeStatusbarIconsMinWrapper);

    fakeStatusbarIconsMax = document.createElement('div');
    fakeStatusbarIconsMax.id = 'statusbar-maximized';
    fakeStatusbarIconsMaxWrapper.appendChild(fakeStatusbarIconsMax);

    fakeStatusbarIconsMin = document.createElement('div');
    fakeStatusbarIconsMin.id = 'statusbar-minimized';
    fakeStatusbarIconsMinWrapper.appendChild(fakeStatusbarIconsMin);

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
    this.sinon.useFakeTimers();

    window.Service = MockService;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;
    realLayoutManager = window.layoutManager;
    window.layoutManager = MockLayoutManager;
    realNavigatorBattery = navigator.battery;
    Object.defineProperty(navigator, 'battery', {
      writable: true
    });
    navigator.battery = MockNavigatorBattery;

    realNfcManager = window.nfcManager;
    window.nfcManager = new MockNfcManager();
    sinon.spy(window.nfcManager, 'isActive');
    window.appWindowManager = new MockAppWindowManager();

    prepareDOM();

    requireApp('system/js/clock.js', function() {
      requireApp('system/js/statusbar.js', statusBarReady);
    });

    function statusBarReady() {

      StatusBar.ELEMENTS.forEach(function testAddElement(elementName) {
        var elt = document.getElementById('statusbar-' + elementName);
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
        elt.style = 'width: 10px;';
        elt.hidden = true;
        fakeStatusBarNode.appendChild(elt);
        fakeIcons[elementName] = elt;
      });

      // executing init again
      StatusBar.init();
      StatusBar.finishInit();

      var signalElements = document.querySelectorAll('.statusbar-signal');
      var dataElements = document.querySelectorAll('.statusbar-data');
      var roamingElems = document.querySelectorAll('.sb-icon-roaming');

      fakeIcons.signals = {};
      fakeIcons.roaming = {};
      Array.prototype.slice.call(signalElements).forEach(
        function(signal, index) {
          fakeIcons.signals[mobileConnectionCount - index - 1] = signal;
        }
      );
      fakeIcons.data = {};
      Array.prototype.slice.call(dataElements).forEach(function(data, index) {
        fakeIcons.data[mobileConnectionCount - index - 1] = data;
      });

      Array.prototype.slice.call(roamingElems).forEach(function(data, index) {
        fakeIcons.roaming[mobileConnectionCount - index - 1] = data;
      });

      StatusBar._paused = 0;

      done();
    }
  });

  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
    MockNavigatorMozTelephony.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    MockNavigatorBattery.mTeardown();
    Service.locked = false;
    Service.currentApp = null;
    navigator.mozL10n = realMozL10n;
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozTelephony = realMozTelephony;
    window.layoutManager = realLayoutManager;
    navigator.battery = realNavigatorBattery;
    window.nfcManager.isActive.restore();
    window.nfcManager = realNfcManager;
  });

  suite('airplane mode icon', function() {
    test('turning on airplane mode makes icon appear', function() {
      MockSettingsListener.mCallbacks['airplaneMode.status']('enabled');
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

  suite('Emergency Call', function() {
    test('Statechanged event should update the notification', function() {
      this.sinon.stub(StatusBar, 'updateEmergencyCbNotification');
      var evt = new CustomEvent('emergencycallbackstatechanged', {
        detail: true
      });
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.updateEmergencyCbNotification
            .calledWith(true));
    });
  });

  suite('init when FTU is running', function() {
    setup(function() {
      this.sinon.stub(StatusBar, 'finishInit');
      this.sinon.stub(StatusBar, 'setAppearance');
    });

    teardown(function() {
      StatusBar.finishInit.restore();
      StatusBar.setAppearance.restore();
    });

    test('skipping FTU finishes initialization', function() {
      var evt = new CustomEvent('ftuskip');
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.finishInit.called);
    });

    test('finish init immediately during upgrade', function() {
      FtuLauncher.mIsUpgrading = true;
      var evt = new CustomEvent('ftuopen');
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.finishInit.called);
    });

    test('finish init only after ftu', function() {
      FtuLauncher.mIsUpgrading = false;
      var evt = new CustomEvent('ftuopen');
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.finishInit.notCalled);
      evt = new CustomEvent('ftudone');
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.finishInit.called);
    });

    test('handles apptitlestatechanged on ftu', function() {
      FtuLauncher.mIsUpgrading = false;
      var evt = new CustomEvent('apptitlestatechanged');
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.setAppearance.called);
    });
  });

  suite('handle FTU progress events', function() {
    setup(function() {
      this.sinon.stub(StatusBar, 'addSettingsListener');
    });

    test('connections display after languages step', function() {
      this.sinon.stub(StatusBar, 'createConnectionsElements');
      this.sinon.stub(StatusBar, 'addConnectionsListeners');
      var evt = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#languages'
        }
      });
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.createConnectionsElements.called);
      assert.isTrue(StatusBar.addConnectionsListeners.called);
      assert.isTrue(StatusBar.addSettingsListener
                    .calledWith('ril.data.enabled'));
    });

    test('wifi step activates wifi', function() {
      this.sinon.stub(StatusBar, 'setActiveWifi');
      var evt = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#wifi'
        }
      });
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.setActiveWifi.called);
      assert.isTrue(StatusBar.addSettingsListener
                    .calledWith('wifi.enabled'));
    });

    test('timezone step activates time', function() {
      this.sinon.stub(StatusBar, 'toggleTimeLabel');
      var evt = new CustomEvent('iac-ftucomms', {
        detail: {
          type: 'step',
          hash: '#date_and_time'
        }
      });
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.toggleTimeLabel.called);
    });
  });

  suite('StatusBar height', function() {
    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return true;
        },
        isFullScreenLayout: function() {
          return true;
        },
        getTopMostWindow: function() {
          return app;
        },

        element: document.createElement('div')
      };

      Service.currentApp = app;
      StatusBar.screen = document.createElement('div');
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('Active app is fullscreen', function() {
      assert.equal(StatusBar.height, 0);
    });
  });

  suite('Statusbar should reflect fullscreen state', function() {
    var app;

    setup(function() {
      app = new MockAppWindow();
      MockService.currentApp = app;
      MockService.mTopMostWindow = app;
    });

    teardown(function() {
      StatusBar.element.classList.remove('fullscreen');
      StatusBar.element.classList.remove('fullscreen-layout');
    });

    test('Launch a non-fullscreen app', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      StatusBar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen'));
    });

    test('Launch a fullscreen app', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      StatusBar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(StatusBar.element.classList.contains('fullscreen'));
    });

    test('Launch a fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      StatusBar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(StatusBar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a non-fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      StatusBar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen-layout'));
    });

    test('Back to home should remove fullscreen state', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      StatusBar.handleEvent(new CustomEvent('appopened', {detail: app}));
      var home = new MockAppWindow();
      StatusBar.handleEvent(new CustomEvent('homescreenopened',
        { detail: home }));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a fullscreen activity', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      StatusBar.handleEvent(new CustomEvent('hierarchytopmostwindowchanged',
        {detail: app}));
      assert.isTrue(StatusBar.element.classList.contains('fullscreen'));
      assert.isTrue(StatusBar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a non-fullscreen activity', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      StatusBar.handleEvent(new CustomEvent('hierarchytopmostwindowchanged',
        {detail: app}));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen-layout'));
    });

    test('stackchanged', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      var event = new CustomEvent('stackchanged');
      StatusBar.handleEvent(event);
      assert.isTrue(StatusBar.element.classList.contains('fullscreen'));
      assert.isTrue(StatusBar.element.classList.contains('fullscreen-layout'));
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
    var app;
    setup(function() {
      app = {
        getTopMostWindow: function() {
          return app;
        }
      };
      Service.currentApp = app;
      StatusBar.clock.stop();
      StatusBar.screen = document.createElement('div');
      MockService.currentApp = app;
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('first launch', function() {
      Service.locked = true;
      StatusBar.init();
      StatusBar.finishInit();
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('lock', function() {
      Service.locked = true;
      var setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      var evt = new CustomEvent('lockscreen-appopened');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
    });
    test('unlock', function() {
      var evt = new CustomEvent('lockscreen-appclosing');
      var setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
    });
    test('attention opening', function() {
      var evt = new CustomEvent('attentionopened');
      StatusBar.handleEvent(evt);
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
      assert.equal(StatusBar.element.classList.contains('maximized'), true);
      assert.equal(StatusBar.element.classList.contains('light'), false);
    });
    test('attentionsceen hide', function() {
      // Test this when lockscreen is off.
      Service.locked = false;
      var evt = new CustomEvent('attentionclosed');
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
      Service.locked = false;
      var evt = new CustomEvent('moztimechange');
      StatusBar.handleEvent(evt);
      this.sinon.clock.tick();
      assert.notEqual(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, false);
      this.sinon.clock.restore();
    });
    test('timeformatchange while timeformat changed', function() {
      var evt = new CustomEvent('timeformatchange');
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
      Service.locked = false;
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
      this.sinon.spy(StatusBar, '_updateIconVisibility');
      Service.locked = true;
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.clock.timeoutID, null);
      assert.equal(StatusBar.icons.time.hidden, true);
      assert.isTrue(StatusBar._updateIconVisibility.called);
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

          MockSettingsListener.mCallbacks['airplaneMode.status']('enabled');

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

          assert.equal(fakeIcons.roaming[0].hidden, false);
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

    test('createCallForwardingsElements shouldn\'t display icons', function() {
      StatusBar.createCallForwardingsElements();
      assert.isTrue(StatusBar.icons.callForwardings.hidden);
    });

    function slotIndexTests(slotIndex) {
      suite('slot: ' + slotIndex, function() {
        test('call forwarding enabled', function() {
          StatusBar.settingValues['ril.cf.enabled'][slotIndex] = true;
          StatusBar.update.callForwarding.call(StatusBar);
          assert.isFalse(
            StatusBar.icons.callForwardingsElements[slotIndex].hidden);
        });

        test('call forwarding disabled', function() {
          StatusBar.settingValues['ril.cf.enabled'][slotIndex] = false;
          StatusBar.update.callForwarding.call(StatusBar);
          assert.isTrue(
            StatusBar.icons.callForwardingsElements[slotIndex].hidden);
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

      test('dataset-multiple is set to false', function() {
        StatusBar.updateConnectionsVisibility();
        assert.equal(fakeIcons.connections.dataset.multiple, 'false');
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

      test('multiple is set to true if any active sim', function() {
        fakeIcons.signals[0].dataset.inactive = 'false';
        StatusBar.updateConnectionsVisibility();
        assert.equal(fakeIcons.connections.dataset.multiple, 'true');
      });

      test('multiple is set to false if no SIM insterted', function() {
        StatusBar.updateConnectionsVisibility();
        assert.equal(fakeIcons.connections.dataset.multiple, 'false');
      });
    });
  });

  suite('media information', function() {
    var recordingSpy;

    setup(function() {
      recordingSpy = this.sinon.spy(StatusBar.update, 'recording');
    });

    teardown(function() {
      StatusBar.recordingCount = 0;
      StatusBar.playingActive = false;
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
      StatusBar.recordingActive = false;
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'audio-channel-changed',
          channel: 'content'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.playing.hidden, false);
    });

    test('audio player is not playing while recording', function() {
      StatusBar.recordingActive = true;
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'audio-channel-changed',
          channel: 'content'
        }
      });
      StatusBar.handleEvent(evt);
      assert.equal(StatusBar.icons.playing.hidden, true);
    });

    test('repeat audio-channel-changed event', function() {
      StatusBar.recordingActive = false;
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'audio-channel-changed',
          channel: 'content'
        }
      });
      var updatePlayingSpy = sinon.spy(StatusBar.update, 'playing');
      StatusBar.handleEvent(evt);
      StatusBar.handleEvent(evt);
      assert.equal(updatePlayingSpy.callCount, 1);
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

    var app;
    setup(function() {
      app = new MockAppWindow();
      MockService.mTopMostWindow = app;
      this.sinon.stub(app, 'handleStatusbarTouch');
      this.sinon.stub(StatusBar.element, 'getBoundingClientRect').returns({
        height: 10
      });

      StatusBar.screen = document.createElement('div');
    });

    suite('Revealing the StatusBar >', function() {
      setup(function() {
        StatusBar._cacheHeight = 24;
      });

      teardown(function() {
        this.sinon.clock.tick(10000);
        StatusBar.element.style.transition = '';
        StatusBar.element.style.transform = '';
      });

      test('it should translate the statusbar on touchmove', function() {
        fakeDispatch('touchstart', 100, 0);
        var evt = fakeDispatch('touchmove', 100, 5);
        assert.isTrue(app.handleStatusbarTouch.calledWith(evt, 24));
        fakeDispatch('touchend', 100, 5);
      });

      test('it should bypass touchstart event', function() {
        var evt = fakeDispatch('touchstart', 100, 0);
        assert.isTrue(app.handleStatusbarTouch.calledWith(evt, 24));
      });

      test('it should not translate the statusbar more than its height',
      function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        var evt = fakeDispatch('touchmove', 100, 15);
        assert.isTrue(app.handleStatusbarTouch.calledWith(evt, 24));
        fakeDispatch('touchend', 100, 15);
      });

      test('it should not stop the propagation of the events once revealed',
      function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        fakeDispatch('touchmove', 100, 24);
        fakeDispatch('touchend', 100, 5);

        var fakeEvt = {
          stopImmediatePropagation: function() {},
          preventDefault: function() {},
          type: 'fake'
        };
        this.sinon.spy(fakeEvt, 'stopImmediatePropagation');
        StatusBar.panelHandler(fakeEvt);
        sinon.assert.notCalled(fakeEvt.stopImmediatePropagation);
      });

      test('it should not reveal when ftu is running', function() {
        FtuLauncher.mIsRunning = true;
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 100);

        assert.isFalse(app.handleStatusbarTouch.called);
        FtuLauncher.mIsRunning = false;
      });

      test('it should not forward events when the tray is opened', function() {
        UtilityTray.active = true;
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 100);

        assert.isFalse(app.handleStatusbarTouch.called);
        UtilityTray.active = false;
      });
    });
  });

  suite('NFC', function() {
    setup(function() {
      sinon.spy(StatusBar, 'setActiveNfc');
    });

    teardown(function() {
      StatusBar.setActiveNfc.restore();
    });

    test('checks initial state from nfcManager', function() {
      StatusBar.init();
      StatusBar.finishInit();
      assert.isTrue(window.nfcManager.isActive.called);
    });

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

    test('should call to setActiveNfc when changing', function() {
      var evt = new CustomEvent('nfc-state-changed', {
        detail: {
          active: true
        }
      });
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.setActiveNfc.calledWith(evt.detail.active));
    });
  });

  suite('setActiveNfc', function() {
    setup(function() {
      sinon.spy(StatusBar.update, 'nfc');
    });

    teardown(function() {
      StatusBar.update.nfc.restore();
    });

    test('should set nfcActive', function() {
      var isActive = true;
      StatusBar.nfcActive = false;
      StatusBar.setActiveNfc(isActive);
      assert.equal(StatusBar.nfcActive, isActive);
    });

    test('should update the icon', function() {
      StatusBar.setActiveNfc(true);
      assert.isTrue(StatusBar.update.nfc.called);
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

  suite('Time format', function() {
    test('should be 24 hour', function() {
      var timeFormat = StatusBar._getTimeFormat('shortTimeFormat24');
      assert.equal(timeFormat, 'shortTimeFormat24');
    });

    test('should be 12 hour with AM/PM', function() {
      StatusBar.settingValues['statusbar.show-am-pm'] = true;

      var timeFormat = StatusBar._getTimeFormat('123 %p');
      assert.equal(timeFormat, '123 <span>%p</span>');
    });

    test('should be 12 hour without AM/PM', function() {
      StatusBar.settingValues['statusbar.show-am-pm'] = false;

      var timeFormat = StatusBar._getTimeFormat('123 %p');
      assert.equal(timeFormat, '123');
    });
  });

  suite('Icons', function() {
    test('visibility should be updated on screen resize', function() {
      var spyUpdateIconVisibility =
        this.sinon.spy(StatusBar, '_updateIconVisibility');

      var evt = new CustomEvent('system-resize');
      StatusBar.handleEvent(evt);
      assert.isTrue(spyUpdateIconVisibility.called);
    });

    test('visibility update should get the status bars width', function() {
      var spyGetMaximizedStatusBarWidth =
        this.sinon.spy(StatusBar, '_getMaximizedStatusBarWidth');

      StatusBar._updateIconVisibility();
      assert.isTrue(spyGetMaximizedStatusBarWidth.called);
    });

    suite('when only 2 icons fit in the maximized status bar', function() {
      var iconWithPriority1;
      var iconWithPriority2;
      var iconWithPriority3;
      var getMaximizedStatusBarWidthStub;

      setup(function() {
        // Reset all the icons to be hidden.
        StatusBar.PRIORITIES.forEach(function(iconObj) {
          var iconId = iconObj[0];
          StatusBar.icons[StatusBar.toCamelCase(iconId)].hidden = true;
        });

        iconWithPriority1 =
          StatusBar.icons[StatusBar.toCamelCase(StatusBar.PRIORITIES[0][0])];
        iconWithPriority2 =
          StatusBar.icons[StatusBar.toCamelCase(StatusBar.PRIORITIES[1][0])];
        iconWithPriority3 =
          StatusBar.icons[StatusBar.toCamelCase(StatusBar.PRIORITIES[2][0])];

        iconWithPriority1.hidden = false;
        iconWithPriority2.hidden = false;
        iconWithPriority3.hidden = false;

        // The maximized status bar can fit icons with priority 1 and 2.
        getMaximizedStatusBarWidthStub = sinon.stub(StatusBar,
          '_getMaximizedStatusBarWidth', function() {
            return StatusBar._getIconWidth(StatusBar.PRIORITIES[0]) +
              StatusBar._getIconWidth(StatusBar.PRIORITIES[1]);
          });
        // The minimized status bar can only fit the highest priority icon.
        StatusBar._minimizedStatusBarWidth = StatusBar._getIconWidth(
          StatusBar.PRIORITIES[0]);

        StatusBar._updateIconVisibility();
      });

      teardown(function() {
        getMaximizedStatusBarWidthStub.restore();
      });

      test('the maximized status bar should hide icon #3', function() {
        StatusBar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[0][0]));
        // Icon #2 is visible in the maximized status bar.
        assert.isFalse(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[1][0]));
        // Icon #3 is hidden in the maximized status bar.
        assert.isTrue(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[2][0]));
      });

      test('the minimized status bar should hide icon #2', function() {
        StatusBar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[0][0]));
        // Icon #2 is hidden in the minimized status bar.
        assert.isTrue(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[1][0]));
        // Icon #2 is not hidden in the minimized status bar.
        assert.isFalse(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + StatusBar.PRIORITIES[2][0]));
      });
    });
  });

  suite('_getIconWidth', function() {
    test('should return the stored value for fixed size icons', function() {
      // Get the index of emergency cb icon in StatusBar.PRIORITIES.
      var iconIndex;
      StatusBar.PRIORITIES.some(function(iconObj, i) {
        if (iconObj[0] === 'emergency-cb-notification') {
          iconIndex = i;
          return true;
        }
        return false;
      });

      var emergencyCbNotificationIcon = StatusBar.icons.emergencyCbNotification;
      emergencyCbNotificationIcon.hidden = false;

      assert.ok(StatusBar.PRIORITIES[iconIndex][1]);
      assert.equal(StatusBar._getIconWidth(StatusBar.PRIORITIES[iconIndex]),
          16 + 4);
    });

    test('should compute the width of variable size icons', function() {
      // Get the index of time icon in StatusBar.PRIORITIES.
      var iconIndex;
      StatusBar.PRIORITIES.some(function(iconObj, i) {
        if (iconObj[0] === 'time') {
          iconIndex = i;
          return true;
        }
        return false;
      });

      var timeIcon = StatusBar.icons.time;
      timeIcon.hidden = false;

      assert.isNull(StatusBar.PRIORITIES[iconIndex][1]);
      assert.equal(StatusBar._getIconWidth(StatusBar.PRIORITIES[iconIndex]),
        timeIcon.clientWidth);
    });
  });

  suite('_updateMinimizedStatusBarWidth', function() {
    var app;
    setup(function() {
      app = getMockApp();
      Service.currentApp = app;
    });

    test('does not update minimizedWidth when maximized', function() {
      var unchangedValue = '#';
      StatusBar._minimizedStatusBarWidth = unchangedValue;
      this.sinon.stub(StatusBar, '_updateIconVisibility');
      Service.currentApp = app;
      StatusBar._updateMinimizedStatusBarWidth();
      assert.equal(unchangedValue, StatusBar._minimizedStatusBarWidth);
      assert.isTrue(StatusBar._updateIconVisibility.calledOnce);
    });

    test('minimizedWidth when minimized when rocketbar', function() {
      var mockedWidth = 100;
      this.sinon.stub(app._topWindow.appChrome, 'isMaximized')
        .returns(false);
      layoutManager.width = 123;
      app._topWindow.appChrome.element = getMockChrome(mockedWidth);
      StatusBar._updateMinimizedStatusBarWidth();
      var expectedValue = layoutManager.width - mockedWidth - 5 - 3;
      assert.equal(StatusBar._minimizedStatusBarWidth, expectedValue);
    });

    test('minimizedWidth when minimized without rocketbar', function() {
      var mockedWidth = 1234;
      this.sinon.stub(app._topWindow.appChrome, 'isMaximized')
        .returns(false);
      this.sinon.stub(StatusBar, '_getMaximizedStatusBarWidth')
        .returns(mockedWidth);
      Service.currentApp = app;
      StatusBar._updateMinimizedStatusBarWidth();
      assert.equal(StatusBar._minimizedStatusBarWidth, mockedWidth);
    });
  });

  suite('setAppearance', function() {
    var app;
    setup(function() {
      StatusBar.element.classList.remove('light');
      StatusBar.element.classList.remove('maximized');
      app = getMockApp();
      MockService.currentApp = app;
      MockService.mTopMostWindow = app;
    });

    test('setAppearance light and maximized', function() {
      MockService.currentApp = app;
      var spyTopUseLightTheming = this.sinon.spy(app._topWindow.appChrome,
                                                 'useLightTheming');
      var spyTopIsMaximized = this.sinon.spy(app._topWindow.appChrome,
                                             'isMaximized');
      var spyParentIsMaximized = this.sinon.spy(app.appChrome, 'isMaximized');

      StatusBar.setAppearance();
      assert.isTrue(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
      assert.isTrue(spyTopUseLightTheming.calledOnce);
      assert.isFalse(spyTopIsMaximized.called);
      assert.isTrue(spyParentIsMaximized.calledOnce);
    });

    test('setAppearance no appChrome', function() {
      MockService.mTopMostWindow = {
        isFullScreen: function isFullScreen() {
          return false;
        },
        isFullScreenLayout: function isFullScreenLayout() {
          return false;
        },
        getTopMostWindow: function getTopMostWindow() {
          return this;
        }
      };
      StatusBar.setAppearance();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isFalse(StatusBar.element.classList.contains('maximized'));
    });

    test('setAppearance currenApp != getTopMostWindow', function() {
      var topMost = new MockAppWindow();
      topMost.appChrome = {
        useLightTheming: this.sinon.stub().returns(true),
        isMaximized: this.sinon.stub().returns(true),
        isFullScreen: this.sinon.stub().returns(false),
        isFullScreenLayout: this.sinon.stub().returns(false)
      };

      MockService.mTopMostWindow = {
        getTopMostWindow: function getTopMostWindow() {
          return topMost;
        },
        appChrome: {
          useLightTheming: this.sinon.stub().returns(false),
          isMaximized: this.sinon.stub().returns(false)
        }
      };

      StatusBar.setAppearance();
      assert.isTrue(StatusBar.element.classList.contains('light'));
      assert.isFalse(StatusBar.element.classList.contains('maximized'));
    });

    test('setAppearance homescreen', function() {
      MockService.mTopMostWindow = {
        isHomescreen: true,
        isFullScreen: this.sinon.stub().returns(false),
        isFullScreenLayout: this.sinon.stub().returns(false),
        getTopMostWindow: function getTopMostWindow() {
          return this;
        }
      };
      StatusBar.setAppearance();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
    });

    test('setAppearance fullscreen', function() {
      this.sinon.stub(MockService.currentApp._topWindow, 'isFullScreen')
        .returns(true);
      StatusBar.setAppearance(app);
      assert.isTrue(StatusBar.element.classList.contains('fullscreen'));
      assert.isTrue(MockService.currentApp._topWindow.isFullScreen.calledOnce);
    });

    test('setAppearance fullscreenLayout', function() {
      var stub = this.sinon.stub(MockService.currentApp._topWindow,
        'isFullScreenLayout').returns(true);
      StatusBar.setAppearance(app);
      assert.isTrue(StatusBar.element.classList.contains('fullscreen-layout'));
      assert.isTrue(stub.calledOnce);
    });
  });

  suite('setAppearance with no top most window', function() {
    setup(function() {
      MockService.currentApp = getMockApp();
      MockService.mTopMostWindow = null;
    });

    test('does not add light or maximized appearance', function() {
      StatusBar.element.classList.remove('light');
      StatusBar.element.classList.remove('maximized');
      StatusBar.setAppearance();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isFalse(StatusBar.element.classList.contains('maximized'));
    });

    test('does not remove light or maximized appearance', function() {
      StatusBar.element.classList.add('light');
      StatusBar.element.classList.add('maximized');
      StatusBar.setAppearance();
      assert.isTrue(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
    });
  });

  suite('lockscreen support', function() {
    var lockscreenApp, app, cloneStatusbarStub;

    function lockScreen() {
      var evt = new CustomEvent('lockscreen-appopened', {
        detail: lockscreenApp
      });
      MockService.currentApp = app;
      MockService.mTopMostWindow = app;
      StatusBar.handleEvent(evt);
    }

    function unlockScreen() {
      var evt = new CustomEvent('lockscreen-appclosing');
      StatusBar.handleEvent(evt);
      MockService.currentApp = null;
    }

    function emitStatusbarEvent(evtType) {
      window.dispatchEvent(new CustomEvent(evtType));
    }

    setup(function() {
      lockscreenApp = getApp(false, true);
      app = getApp(false, false);
      cloneStatusbarStub = this.sinon.spy(StatusBar, 'cloneStatusbar');
    });

    teardown(function() {
      cloneStatusbarStub.restore();
    });

    test('should set the lockscreen icons color', function() {
      lockScreen();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
      unlockScreen();
    });

    test('should do nothing when is locked', function() {
      lockScreen();
      StatusBar.setAppearance();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
      unlockScreen();
    });

    test('should set the active app color when closing', function() {
      var evt = new CustomEvent('lockscreen-appclosing');
      StatusBar.handleEvent(evt);
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isFalse(StatusBar.element.classList.contains('maximized'));
    });

    test('Locking screen while opening utility tray should not block the ' +
      'status bar', function() {
      emitStatusbarEvent('utilitytraywillshow');
      assert.isFalse(cloneStatusbarStub.called);

      emitStatusbarEvent('utility-tray-abortopen');
      assert.isTrue(cloneStatusbarStub.called);
    });

    test('Locking screen while closing utility tray should not block the ' +
      'status bar', function() {
      emitStatusbarEvent('utilitytraywillhide');
      assert.isFalse(cloneStatusbarStub.called);

      emitStatusbarEvent('utility-tray-abortclose');
      assert.isTrue(cloneStatusbarStub.called);
    });

    function getApp(light, maximized) {
      return {
        getTopMostWindow: function() {
          return this;
        },
        appChrome: {
          useLightTheming: function useLightTheming() {
            return light;
          },
          isMaximized: function isMaximized() {
            return maximized;
          }
        },
        isFullScreen: function isFullScreen() {
          return false;
        },
        isFullScreenLayout: function isFullScreenLayout() {
          return false;
        }
      };
    }
  });

  suite('updateSignalIcon', function() {
    var mockIcon = {},
        connInfo = {
          relSignalStrength: 75,
          roaming: true,
          network: {
            shortName: 'name'
          }
        };

    setup(function() {
      sinon.stub(MockL10n, 'get').returns('test');
      mockIcon.dataset = {};
      mockIcon.setAttribute = sinon.spy();
    });

    teardown(function() {
      MockL10n.get.restore();
    });

    test('should set the data-level attribute', function() {
      StatusBar.updateSignalIcon(mockIcon, connInfo);
      assert.equal(mockIcon.dataset.level, 4);
    });

    test('roaming visibility with one sim', function() {
      fakeIcons.roaming[0].hidden = connInfo.roaming;
      StatusBar.updateSignalIcon(mockIcon, connInfo);
      assert.equal(fakeIcons.roaming[0].hidden, !connInfo.roaming);
    });

    test('roaming visibility with multisim', function() {
      mockIcon.dataset.index = 2;
      fakeIcons.roaming[1].hidden = connInfo.roaming;
      StatusBar.updateSignalIcon(mockIcon, connInfo);
      assert.equal(fakeIcons.roaming[1].hidden, !connInfo.roaming);
    });

    test('should remove the searching dataset', function() {
      mockIcon.dataset.searching = true;
      StatusBar.updateSignalIcon(mockIcon, connInfo);
      assert.isTrue(!mockIcon.dataset.searching);
    });

    test('should set the aria-label', function() {
      mockIcon.dataset.searching = true;
      StatusBar.updateSignalIcon(mockIcon, connInfo);
      assert.isTrue(MockL10n.get.calledWith('statusbarSignalRoaming', {
        level: mockIcon.dataset.level,
        operator: connInfo.network && connInfo.network.shortName
      }));
      sinon.assert.calledWith(mockIcon.setAttribute, 'aria-label', 'test');
    });
  });

  suite('handle events', function() {
    var app;
    var setAppearanceStub;
    var pauseUpdateStub;
    var resumeUpdateStub;

    function testEventThatHides(event) {
      var evt = new CustomEvent(event);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
      StatusBar.handleEvent(evt);
      assert.isTrue(StatusBar.element.classList.contains('hidden'));
    }

    function triggerEvent(event) {
      // XXX: Use MockAppWindow instead
      var currentApp = {
        getTopMostWindow: function getTopMostWindow() {
          return this._topWindow;
        },
        isFullScreen: function() {},
        isFullScreenLayout: function() {}
      };
      Service.currentApp = currentApp;
      var evt = new CustomEvent(event, {detail: currentApp});
      StatusBar.element.classList.add('hidden');
      StatusBar.handleEvent(evt);
    }

    function testEventThatShows(event) {
      triggerEvent(event);
      assert.isTrue(setAppearanceStub.called);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
    }

    function testEventThatNotShowsIfSwipeDetected(event) {
      var currentApp = {
        getTopMostWindow: function getTopMostWindow() {
          return this._topWindow;
        }
      };
      Service.currentApp = currentApp;
      var evt = new CustomEvent(event, {detail: currentApp});
      StatusBar.element.classList.add('hidden');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
      assert.isTrue(StatusBar.element.classList.contains('hidden'));
    }

    function dispatchEdgeSwipeEvent(event) {
      var evt = new CustomEvent(event);
      StatusBar.handleEvent(evt);
    }

    function testEventThatPause(event) {
      var evt = new CustomEvent(event);
      StatusBar.handleEvent(evt);
      assert.isTrue(pauseUpdateStub.called);
      assert.equal(pauseUpdateStub.args[0], event);

      StatusBar.resumeUpdate();
    }

    function testEventThatResume(event) {
      StatusBar.pauseUpdate();

      var evt = new CustomEvent(event);
      StatusBar.handleEvent(evt);
      assert.isTrue(resumeUpdateStub.called);
      assert.equal(resumeUpdateStub.args[0], event);
      assert.isFalse(StatusBar.isPaused());
    }

    function testEventThatResumeIfNeeded(event) {
      var evt = new CustomEvent(event);
      StatusBar.handleEvent(evt);
      assert.isTrue(resumeUpdateStub.called);
      assert.equal(resumeUpdateStub.args[0], event);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
    }

    setup(function() {
      app = {
        isFullScreen: function() {},
        isFullScreenLayout: function() {}
      };
      MockService.currentApp = app;
      setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      pauseUpdateStub = this.sinon.stub(StatusBar, 'pauseUpdate');
      resumeUpdateStub = this.sinon.stub(StatusBar, 'resumeUpdate');
      StatusBar._pausedForGesture = false;
    });

    test('stackchanged', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      StatusBar.element.classList.add('hidden');
      var event = new CustomEvent('stackchanged');
      StatusBar.handleEvent(event);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen-layout'));
      assert.isTrue(setAppearanceStub.called);
    });

    test('rocketbar-deactivated', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      StatusBar.element.classList.add('hidden');
      var event = new CustomEvent('rocketbar-deactivated');
      StatusBar.handleEvent(event);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen'));
      assert.isFalse(StatusBar.element.classList.contains('fullscreen-layout'));
      assert.isTrue(setAppearanceStub.called);
    });

    test('sheets-gesture-end', function() {
      StatusBar.element.classList.add('hidden');
      var event = new CustomEvent('sheets-gesture-end');
      StatusBar.handleEvent(event);
      assert.isFalse(StatusBar.element.classList.contains('hidden'));
    });

    test('homescreenopening', function() {
      testEventThatHides.bind(this)('homescreenopening');
    });

    test('appopening', function() {
      testEventThatHides.bind(this)('appopening');
    });

    test('sheets-gesture-begin', function() {
      testEventThatHides.bind(this)('sheets-gesture-begin');
    });

    test('homescreenopened', function() {
      testEventThatShows.bind(this)('homescreenopened');
    });

    test('appopened', function() {
      testEventThatShows.bind(this)('appopened');
    });

    test('appchromecollapsed', function() {
      var stub = this.sinon.spy(StatusBar, '_updateMinimizedStatusBarWidth');
      triggerEvent.bind(this)('appchromecollapsed');
      assert.isTrue(stub.calledOnce);
      assert.isTrue(setAppearanceStub.calledOnce);
    });

    // We should not rely on ativityterminated events for statusbar appearance
    // changes but instead rely on hierarchytopmostwindowchanged, bug 1143926.
    test('activityterminated', function() {
      triggerEvent.bind(this)('activityterminated');
      assert.isFalse(setAppearanceStub.called);
    });

    test('appchromeexpanded', function() {
      testEventThatShows.bind(this)('appchromeexpanded');
    });

    test('apptitlestatechanged', function() {
      testEventThatShows.bind(this)('apptitlestatechanged');
    });

    test('activityopened', function() {
      var stub = this.sinon.spy(StatusBar, '_updateMinimizedStatusBarWidth');
      testEventThatShows.bind(this)('activityopened');
      assert.isTrue(stub.calledOnce);
    });

    test('activitydestroyed', function() {
      var stub = this.sinon.spy(StatusBar, '_updateMinimizedStatusBarWidth');
      triggerEvent('activitydestroyed');
      assert.isTrue(stub.calledOnce);
    });

    test('utilitytraywillshow', function() {
      testEventThatPause.bind(this)('utilitytraywillshow');
    });

    test('utilitytraywillhide', function() {
      testEventThatPause.bind(this)('utilitytraywillhide');
    });

    test('cardviewshown', function() {
      testEventThatPause.bind(this)('cardviewshown');
    });

    test('sheets-gesture-begin', function() {
      testEventThatPause.bind(this)('sheets-gesture-begin');
    });

    test('sheets-gesture-end', function() {
      dispatchEdgeSwipeEvent('sheets-gesture-begin');
      testEventThatResume.bind(this)('sheets-gesture-end');
    });

    test('utility-tray-overlayopened', function() {
      testEventThatResume.bind(this)('utility-tray-overlayopened');
    });

    test('utility-tray-overlayclosed', function() {
      testEventThatResume.bind(this)('utility-tray-overlayclosed');
    });

    test('utility-tray-abortopen', function() {
      testEventThatResume.bind(this)('utility-tray-abortopen');
    });

    test('utility-tray-abortclose', function() {
      testEventThatResume.bind(this)('utility-tray-abortclose');
    });

    test('cardviewclosed', function() {
      testEventThatResume.bind(this)('cardviewclosed');
    });

    suite('handle events with swipe detected', function() {
      setup(function() {
        StatusBar.element.classList.add('hidden');
        dispatchEdgeSwipeEvent('sheets-gesture-begin');
        dispatchEdgeSwipeEvent('sheets-gesture-begin');
        this.sinon.stub(StatusBar, 'isPaused', function() {
          return true;
        });
      });

      teardown(function() {
        StatusBar.element.classList.remove('hidden');
      });

      test('apptitlestatechanged', function() {
        testEventThatNotShowsIfSwipeDetected.bind(this)('apptitlestatechanged');
      });

      test('activitytitlestatechanged', function() {
        testEventThatNotShowsIfSwipeDetected.
          bind(this)('activitytitlestatechanged');
      });

      test('homescreenopened', function() {
        testEventThatResumeIfNeeded.bind(this)('homescreenopened');
      });
    });
  });

  suite('resumeUpdate', function() {
    var dispatchEvent = function(event) {
      window.dispatchEvent(new CustomEvent(event));
    };

    test('should update icons only when not paused', function() {
      this.sinon.stub(StatusBar, '_updateIconVisibility');
      dispatchEvent('utilitytraywillhide');
      dispatchEvent('utility-tray-overlayclosed');
      assert.isFalse(StatusBar.isPaused());
      assert.isTrue(StatusBar._updateIconVisibility.calledOnce);
    });

    test('should not update icons only when paused', function() {
      this.sinon.stub(StatusBar, '_updateIconVisibility');
      dispatchEvent('utilitytraywillshow');
      dispatchEvent('utility-tray-overlayclosed');
      assert.isTrue(StatusBar.isPaused());
      assert.isFalse(StatusBar._updateIconVisibility.called);
    });
  });

  suite('Non symmetrical events shouldn\'t call cloneStatusBar()', function() {
    var dispatchEvent = function(event) {
      window.dispatchEvent(new CustomEvent(event));
    };

    test('Sheet gestures', function() {
      var cloneStatusbarStub = this.sinon.spy(StatusBar, 'cloneStatusbar');
      dispatchEvent('sheets-gesture-begin');
      dispatchEvent('iconshown');
      assert.isFalse(cloneStatusbarStub.called);

      dispatchEvent('sheets-gesture-begin');
      dispatchEvent('sheets-gesture-end');
      dispatchEvent('iconshown');
      assert.isTrue(cloneStatusbarStub.called);
      cloneStatusbarStub.restore();
    });
  });

  suite('Label icon width', function() {
    var labelIndex;
    var realClientWidth;

    setup(function() {
      StatusBar.PRIORITIES.some(function(iconObj, index) {
        if (iconObj[0] === 'label') {
          labelIndex = index;
          return true;
        }

        return false;
      });
      realClientWidth = Object.getOwnPropertyDescriptor(fakeIcons.label,
        'clientWidth');
    });

    teardown(function() {
      if (realClientWidth) {
        Object.defineProperty(fakeIcons.label, 'clientWidth', realClientWidth);
      } else {
        delete fakeIcons.label.clientWidth;
      }
    });

    test('should be cached after initialisation', function() {
      assert.isNotNull(StatusBar.PRIORITIES[labelIndex][1]);
      assert.isNumber(StatusBar.PRIORITIES[labelIndex][1]);
    });

    test('should have the cache invalidated when width changes', function() {
      var label = fakeIcons.label;

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 10; }
      });
      StatusBar.update.time.call(StatusBar, '*');

      var originalWidth = StatusBar.PRIORITIES[labelIndex][1];

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 20; }
      });
      StatusBar.update.time.call(StatusBar, '***');

      assert.notEqual(originalWidth, StatusBar.PRIORITIES[labelIndex][1]);
    });
  });

  suite('Battery icon', function() {
    var cloneStatusbarSpy;

    setup(function() {
      MockNavigatorBattery.level = 0.95;
      MockNavigatorBattery.charging = false;
      StatusBar.update.battery.call(StatusBar);
      cloneStatusbarSpy = this.sinon.spy(StatusBar, 'cloneStatusbar');
    });

    test('should not reprioritize icons when doesn\'t change', function() {
      StatusBar.update.battery.call(StatusBar);

      assert.isFalse(cloneStatusbarSpy.called);
    });

    test('should not reprioritize icons when computed level doesn\'t change',
      function() {
        MockNavigatorBattery.level = 0.9;
        StatusBar.update.battery.call(StatusBar);

        assert.isFalse(cloneStatusbarSpy.called);
      });

    test('should reprioritize icons when battery changes', function() {
      MockNavigatorBattery.level = 0.5;
      StatusBar.update.battery.call(StatusBar);

      assert.isTrue(cloneStatusbarSpy.called);
    });

    test('should reprioritize icons when charging state changes', function() {
      MockNavigatorBattery.charging = true;
      StatusBar.update.battery.call(StatusBar);

      assert.isTrue(cloneStatusbarSpy.called);
    });
  });

  suite('Geolocation and recording', function() {
    var updateIconSpy;
    var cloneStatusbarSpy;

    function StatusBarHandleEvent(type, active) {
      StatusBar.handleEvent({
        type: type[0],
        detail: {
          type: type[1],
          active: active
        }
      });
    }

    setup(function() {
      updateIconSpy = this.sinon.spy(StatusBar, '_updateIconVisibility');
      cloneStatusbarSpy = this.sinon.spy(StatusBar, 'cloneStatusbar');
    });

    test('should reprioritise icons only once per call', function() {
      var updateIconCallCount = 0;
      var cloneStatusbarCallCount = 0;
      [
        ['mozChromeEvent', 'geolocation-status'],
        ['recordingEvent', 'recording-state-changed']
      ].forEach(function(type) {
          StatusBarHandleEvent(type, true);
          updateIconCallCount++;
          cloneStatusbarCallCount++;
          assert.equal(updateIconSpy.callCount, updateIconCallCount);
          assert.equal(cloneStatusbarSpy.callCount, cloneStatusbarCallCount);

          StatusBarHandleEvent(type, false);
          cloneStatusbarCallCount++;
          assert.equal(updateIconSpy.callCount, updateIconCallCount);
          assert.equal(cloneStatusbarSpy.callCount, cloneStatusbarCallCount);
        }.bind(this));
    });
  });

  suite('Signal icons', function() {
    var slots;
    var mockMobileConnection;
    var updateIconSpy;

    setup(function() {
      mockMobileConnection = MockMobileconnection();
      mockMobileConnection.voice = {
        network: {
          mcc: 123
        }
      };
      mockMobileConnection.simCard = {
        cardState: 'ready',
        iccInfo: {
          iccid: 'iccid1'
        }
      };
      slots = [new MockSIMSlot(mockMobileConnection, 0)];
      MockSIMSlotManager.mInstances = slots;

      StatusBar.settingValues['ril.radio.disabled'] = false;
      StatusBar.update.signal.call(StatusBar);

      updateIconSpy = this.sinon.spy(StatusBar, '_updateIconVisibility');
    });

    teardown(function() {
      MockSIMSlotManager.mTeardown();
    });

    test('should call reprioritise function when changed', function() {
      StatusBar.settingValues['ril.radio.disabled'] = true;
      StatusBar.update.signal.call(StatusBar);

      assert.isTrue(updateIconSpy.called);
    });

    test('should not call reprioritise function when not changed', function() {
      StatusBar.settingValues['ril.radio.disabled'] = false;
      StatusBar.update.signal.call(StatusBar);

      assert.isFalse(updateIconSpy.called);
    });

    test('should reprioritize when inactive state changes', function() {
      fakeIcons.signals[0].dataset.inactive = true;
      StatusBar.update.signal.call(StatusBar);
      assert.isTrue(updateIconSpy.called);
    });
  });

  suite('Data icons', function() {
    var updateIconSpy;

    setup(function() {
      MockNavigatorMozMobileConnections[0].data = {
        connected: true,
        type: 'lte'
      };

      StatusBar.settingValues['ril.radio.disabled'] = false;
      StatusBar.settingValues['ril.data.enabled'] = true;
      StatusBar.icons.wifi.hidden = true;
      StatusBar.update.data.call(StatusBar);

      updateIconSpy = this.sinon.spy(StatusBar, '_updateIconVisibility');
    });

    test('should call reprioritise function when changed', function() {
      StatusBar.settingValues['ril.data.enabled'] = false;
      StatusBar.update.data.call(StatusBar);

      assert.isTrue(updateIconSpy.called);
    });

    test('should not call reprioritise function when not changed', function() {
      StatusBar.settingValues['ril.data.enabled'] = true;
      StatusBar.update.data.call(StatusBar);

      assert.isFalse(updateIconSpy.called);
    });
  });

  suite('Network activity icons', function() {
    var updateIconSpy;
    var clock;

    setup(function() {
      updateIconSpy = this.sinon.spy(StatusBar, '_updateIconVisibility');
      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
    });

    test('should call reprioritise function when changed', function() {
      StatusBar.update.networkActivity.call(StatusBar);

      assert.isTrue(updateIconSpy.called);
    });

    test('should call reprioritise function after 500ms', function() {
      StatusBar.update.networkActivity.call(StatusBar);
      clock.tick(510);

      assert.equal(updateIconSpy.callCount, 2);
    });
  });

  suite('cloneStatusbar', function() {
    test('should create a new DOM element for the status bar', function() {
      var oldElement = StatusBar.statusbarIconsMin;
      assert.equal(oldElement, StatusBar.statusbarIconsMin);

      StatusBar.cloneStatusbar();
      assert.notEqual(oldElement, StatusBar.statusbarIconsMin);
    });

    test('should conserve the CSS class names applied', function() {
      var className = 'abc-DEF-' + Math.random();
      StatusBar.statusbarIconsMin.className = className;

      StatusBar.cloneStatusbar();
      assert.equal(StatusBar.statusbarIconsMin.className, className);
    });
  });

  suite('handle UpdateManager events', function() {
    var app;
    setup(function() {
      app = {
        isFullScreen: function() {
          return false;
        },
        getTopMostWindow: function() {
          return app;
        },

        element: document.createElement('div')
      };

      Service.currentApp = app;
      StatusBar.element.classList.add('light');
    });

    teardown(function() {
      Service.currentApp = null;
    });

    test('should remove light class', function() {
      assert.isTrue(StatusBar.element.classList.contains('light'));
      var evt = new CustomEvent('updatepromptshown');
      StatusBar.handleEvent(evt);
      assert.isFalse(StatusBar.element.classList.contains('light'));
    });

    test('should restore the current theme', function() {
      var evt = new CustomEvent('updateprompthidden');
      var setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
    });
  });

  suite('attention window', function() {
    var app;
    setup(function() {
      StatusBar.element.classList.remove('light');
      StatusBar.element.classList.remove('maximized');
      app = getMockApp();
      MockService.currentApp = app;
      MockService.mTopMostWindow = app;
    });

    test('should maximize status bar', function() {
      window.dispatchEvent(new CustomEvent('attentionopened'));

      assert.isTrue(StatusBar.element.classList.contains('maximized'));
      assert.isFalse(StatusBar.element.classList.contains('light'));
    });
  });

  function getMockApp() {
    return {
      _topWindow: {
        appChrome: {
          useLightTheming: function useLightTheming() {
            return true;
          },
          isMaximized: function isMaximized() {
            return true;
          }
        },
        isFullScreen: function isFullScreen() {
          return false;
        },
        isFullScreenLayout: function isFullScreenLayout() {
          return false;
        }
      },
      appChrome: {
        isMaximized: function isMaximized() {
          return true;
        }
      },
      getTopMostWindow: function getTopMostWindow() {
        return this._topWindow;
      }
    };
  }

  function getMockChrome(mockedWidth) {
    var element = {
      querySelector: function() {
        return {
          getBoundingClientRect: function() {
            return {
              width: mockedWidth
            };
          }
        };
      }
    };
    return element;
  }
});
