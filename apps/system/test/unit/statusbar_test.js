/* globals FtuLauncher, MockL10n, MockLayoutManager,
           MocksHelper, MockService, StatusBar, Service,
           MockAppWindowManager, MockBaseIcon,
           UtilityTray, MockAppWindow, layoutManager */
'use strict';

require('/shared/test/unit/mocks/mock_settings_listener.js');
require(
  '/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_simslot.js');
require('/shared/test/unit/mocks/mock_simslot_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/test/unit/mock_app_window_manager.js');
require('/test/unit/mock_ftu_launcher.js');
require('/test/unit/mock_touch_forwarder.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_layout_manager.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_base_icon.js');

var mocksForStatusBar = new MocksHelper([
  'UtilityTray',
  'LayoutManager',
  'AppWindow',
  'Service',
  'FtuLauncher'
]).init();

suite('system/Statusbar', function() {
  var fakeStatusBarNode, fakeTopPanel, fakeStatusBarBackground,
      fakeStatusBarIcons, fakeStatusbarIconsMaxWrapper, fakeStatusbarIconsMax,
      fakeStatusbarIconsMinWrapper, fakeStatusbarIconsMin;
  var realMozL10n,
      realLayoutManager;

  function prepareDOM() {
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
  }

  mocksForStatusBar.attachTestHelpers();

  setup(function(done) {
    this.sinon.useFakeTimers();

    window.Service = MockService;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    realLayoutManager = window.layoutManager;
    window.layoutManager = MockLayoutManager;

    window.appWindowManager = new MockAppWindowManager();

    prepareDOM();

    requireApp('system/js/clock.js', function() {
      requireApp('system/js/statusbar.js', statusBarReady);
    });

    function statusBarReady() {
      // executing init again
      StatusBar.init();
      StatusBar.finishInit();
      StatusBar._paused = 0;

      done();
    }
  });

  teardown(function() {
    fakeStatusBarNode.parentNode.removeChild(fakeStatusBarNode);
    Service.locked = false;
    Service.currentApp = null;
    navigator.mozL10n = realMozL10n;
    window.layoutManager = realLayoutManager;
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

      MockService.currentApp = app;
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

  suite('setAppearance on lock/unlock', function() {
    var app;
    setup(function() {
      app = {
        getTopMostWindow: function() {
          return app;
        }
      };
      Service.currentApp = app;
      StatusBar.screen = document.createElement('div');
      MockService.currentApp = app;
    });
    teardown(function() {
      StatusBar.screen = null;
    });
    test('lock', function() {
      Service.locked = true;
      var setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      var evt = new CustomEvent('lockscreen-appopened');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
    });
    test('unlock', function() {
      var evt = new CustomEvent('lockscreen-appclosing');
      var setAppearanceStub = this.sinon.stub(StatusBar, 'setAppearance');
      StatusBar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
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
      MockService.currentApp = app;
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

    test('it sets the order when an icon is rendered', function() {
      var priority1 = Object.keys(StatusBar.PRIORITIES)[0];
      var order = StatusBar.PRIORITIES[priority1].order;
      var mockIcon = {
        dashPureName: priority1,
        setOrder: this.sinon.stub()
      };
      window.dispatchEvent(new CustomEvent('iconrendered', {detail: mockIcon}));
      assert.isTrue(mockIcon.setOrder.calledWith(order * -1));
    });

    suite('when only 2 icons fit in the maximized status bar', function() {
      var iconWithPriority1;
      var iconWithPriority2;
      var iconWithPriority3;
      var getMaximizedStatusBarWidthStub;
      var priorities;

      setup(function() {
        priorities = [];
        // Reset all the icons to be hidden.

        Object.keys(StatusBar.PRIORITIES).forEach(function(iconId) {
          priorities.push(iconId);
          StatusBar.PRIORITIES[iconId].icon =
            new MockBaseIcon(StatusBar.toClassName(iconId) + 'Icon');
        });

        iconWithPriority1 = StatusBar.PRIORITIES[priorities[0]].icon;
        iconWithPriority2 = StatusBar.PRIORITIES[priorities[1]].icon;
        iconWithPriority3 = StatusBar.PRIORITIES[priorities[2]].icon;

        this.sinon.stub(iconWithPriority1, 'isVisible').returns(true);
        this.sinon.stub(iconWithPriority2, 'isVisible').returns(true);
        this.sinon.stub(iconWithPriority3, 'isVisible').returns(true);

        // The maximized status bar can fit icons with priority 1 and 2.
        getMaximizedStatusBarWidthStub = sinon.stub(StatusBar,
          '_getMaximizedStatusBarWidth', function() {
            var first = priorities[0];
            var second = priorities[1];
            return StatusBar._getIconWidth(StatusBar.PRIORITIES[first]) +
              StatusBar._getIconWidth(StatusBar.PRIORITIES[second]);
          });
        // The minimized status bar can only fit the highest priority icon.
        StatusBar._minimizedStatusBarWidth = StatusBar._getIconWidth(
          StatusBar.PRIORITIES[priorities[0]]);

        StatusBar._updateIconVisibility();
      });

      teardown(function() {
        getMaximizedStatusBarWidthStub.restore();
      });

      test('the maximized status bar should hide icon #3', function() {
        StatusBar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + priorities[0]));
        // Icon #2 is visible in the maximized status bar.
        assert.isFalse(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + priorities[1]));
        // Icon #3 is hidden in the maximized status bar.
        assert.isTrue(StatusBar.statusbarIcons.classList
          .contains('sb-hide-' + priorities[2]));
      });

      test('the minimized status bar should hide icon #2', function() {
        StatusBar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + priorities[0]));
        // Icon #2 is hidden in the minimized status bar.
        assert.isTrue(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + priorities[1]));
        // Icon #2 is not hidden in the minimized status bar.
        assert.isFalse(StatusBar.statusbarIconsMin.classList
          .contains('sb-hide-' + priorities[2]));
      });
    });
  });

  suite('_getIconWidth', function() {
    setup(function() {
      Object.keys(StatusBar.PRIORITIES).forEach(function(iconId) {
        StatusBar.PRIORITIES[iconId].icon =
          new MockBaseIcon(StatusBar.toClassName(iconId) + 'Icon');
      });
    });
    test('should return the stored value for fixed size icons', function() {
      // Get the index of emergency cb icon in StatusBar.PRIORITIES.
      var iconIndex;
      Object.keys(StatusBar.PRIORITIES).some(function(iconId) {
        if (iconId === 'emergency-callback') {
          iconIndex = iconId;
          return true;
        }
        return false;
      });

      var emergencyIcon = StatusBar.PRIORITIES['emergency-callback'].icon;
      this.sinon.stub(emergencyIcon, 'isVisible').returns(true);

      assert.ok(StatusBar.PRIORITIES[iconIndex].width);
      assert.equal(StatusBar.PRIORITIES[iconIndex].width, 16 + 4);
    });

    test('should compute the width of variable size icons', function() {
      // Get the index of time icon in StatusBar.PRIORITIES.
      var iconIndex;
      Object.keys(StatusBar.PRIORITIES).some(function(iconId) {
        if (iconId === 'time') {
          iconIndex = iconId;
          return true;
        }
        return false;
      });

      var timeIcon = StatusBar.PRIORITIES.time.icon;
      this.sinon.stub(timeIcon, 'isVisible').returns(true);

      assert.equal(StatusBar._getIconWidth(StatusBar.PRIORITIES[iconIndex]),
        timeIcon.element.clientWidth);
    });
  });

  suite('_updateMinimizedStatusBarWidth', function() {
    var app;
    setup(function() {
      app = getMockApp();
      MockService.currentApp = app;
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

      StatusBar.setAppearance();
      assert.isTrue(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
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
      StatusBar.setAppearance();
      assert.isTrue(StatusBar.element.classList.contains('fullscreen'));
      assert.isTrue(MockService.currentApp._topWindow.isFullScreen.calledOnce);
    });

    test('setAppearance fullscreenLayout', function() {
      var stub = this.sinon.stub(MockService.currentApp._topWindow,
        'isFullScreenLayout').returns(true);
      StatusBar.setAppearance();
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

  suite('Icon events', function() {
    setup(function() {
      this.sinon.stub(StatusBar, '_updateIconVisibility');
      this.sinon.stub(StatusBar, 'cloneStatusbar');
    });

    test('icon is created', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconcreated', {
        detail: icon
      }));
      assert.ok(StatusBar.PRIORITIES['mobile-connection'].icon);
    });

    test('icon is shown', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconshown', {
        detail: icon
      }));
      assert.isTrue(StatusBar._updateIconVisibility.called);
    });

    test('icon is hidden', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconhidden', {
        detail: icon
      }));
      assert.isTrue(StatusBar._updateIconVisibility.called);
    });

    test('icon is changed', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconchanged', {
        detail: icon
      }));
      assert.isTrue(StatusBar.cloneStatusbar.called);
    });
  });

  suite('lockscreen support', function() {
    var lockscreenApp, app;

    setup(function() {
      lockscreenApp = getApp(true, true);
      app = getApp(false, false);
      var evt = new CustomEvent('lockscreen-appopened', {
        detail: lockscreenApp
      });
      MockService.currentApp = app;
      MockService.mTopMostWindow = app;
      StatusBar.handleEvent(evt);
    });

    teardown(function() {
      var evt = new CustomEvent('lockscreen-appclosing');
      StatusBar.handleEvent(evt);
      MockService.currentApp = null;
    });

    test('should set the lockscreen icons color', function() {
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
    });

    test('should do nothing when is locked', function() {
      StatusBar.setAppearance();
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isTrue(StatusBar.element.classList.contains('maximized'));
    });

    test('should set the active app color when closing', function() {
      var evt = new CustomEvent('lockscreen-appclosing');
      StatusBar.handleEvent(evt);
      assert.isFalse(StatusBar.element.classList.contains('light'));
      assert.isFalse(StatusBar.element.classList.contains('maximized'));
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
      Object.keys(StatusBar.PRIORITIES).forEach(function(iconId) {
        StatusBar.PRIORITIES[iconId].icon =
          new MockBaseIcon(StatusBar.toClassName(iconId) + 'Icon');
        if (iconId === 'operator') {
          labelIndex = iconId;
        }
      });
      realClientWidth = Object.getOwnPropertyDescriptor(
        StatusBar.PRIORITIES.operator.icon.element,
        'clientWidth');
    });

    teardown(function() {
      if (realClientWidth) {
        Object.defineProperty(StatusBar.PRIORITIES.operator.icon.element,
          'clientWidth', realClientWidth);
      } else {
        delete StatusBar.PRIORITIES.operator.icon.element.clientWidth;
      }
    });

    test('should have the cache invalidated when width changes', function() {
      var label = StatusBar.PRIORITIES.operator.icon.element;

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 10; }
      });

      StatusBar.handleEvent(new CustomEvent('iconwidthchanged', {
        detail: StatusBar.PRIORITIES.operator.icon
      }));

      var originalWidth = StatusBar.PRIORITIES[labelIndex].width;

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 20; }
      });

      StatusBar.handleEvent(new CustomEvent('iconwidthchanged', {
        detail: StatusBar.PRIORITIES.operator.icon
      }));

      assert.notEqual(originalWidth, StatusBar.PRIORITIES[labelIndex].width);
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
      MockService.currentApp = app;
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
