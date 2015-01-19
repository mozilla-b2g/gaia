/* globals MockL10n, MocksHelper, MockService, Statusbar, MockBaseIcon,
           UtilityTray, MockAppWindow */
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
require('/test/unit/mock_touch_forwarder.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_layout_manager.js');
require('/test/unit/mock_app_window.js');
require('/test/unit/mock_base_icon.js');
require('/test/unit/mock_lazy_loader.js');

var mocksForStatusbar = new MocksHelper([
  'UtilityTray',
  'AppWindow',
  'Service',
  'LazyLoader'
]).init();

suite('system/Statusbar', function() {
  var fakeStatusbarNode, fakeTopPanel, fakeStatusbarBackground,
      fakeStatusbarIcons, fakeStatusbarIconsMaxWrapper, fakeStatusbarIconsMax,
      fakeStatusbarIconsMinWrapper, fakeStatusbarIconsMin;
  var realMozL10n;

  // XXX: Use MockAppWindow
  function getApp(light, maximized, fullscreen, fullscreenLayout) {
    return {
      getTopMostWindow: function() {
        return this;
      },
      isFullScreen: function() {
        return fullscreen;
      },
      isFullScreenLayout: function() {
        return fullscreenLayout;
      },
      appChrome: {
        useLightTheming: function useLightTheming() {
          return light;
        },
        isMaximized: function isMaximized() {
          return maximized;
        }
      }
    };
  }

  function prepareDOM() {
    fakeStatusbarNode = document.createElement('div');
    fakeStatusbarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusbarNode);

    fakeTopPanel = document.createElement('div');
    fakeTopPanel.id = 'top-panel';
    document.body.appendChild(fakeTopPanel);

    fakeStatusbarBackground = document.createElement('div');
    fakeStatusbarBackground.id = 'statusbar-background';
    document.body.appendChild(fakeStatusbarBackground);

    fakeStatusbarIcons = document.createElement('div');
    fakeStatusbarIcons.id = 'statusbar-icons';
    document.body.appendChild(fakeStatusbarIcons);

    fakeStatusbarIconsMaxWrapper = document.createElement('div');
    fakeStatusbarIconsMaxWrapper.id = 'statusbar-maximized-wrapper';
    fakeStatusbarIcons.appendChild(fakeStatusbarIconsMaxWrapper);

    fakeStatusbarIconsMinWrapper = document.createElement('div');
    fakeStatusbarIconsMinWrapper.id = 'statusbar-minimized-wrapper';
    fakeStatusbarIcons.appendChild(fakeStatusbarIconsMinWrapper);

    fakeStatusbarIconsMax = document.createElement('div');
    fakeStatusbarIconsMax.id = 'statusbar-maximized';
    fakeStatusbarIconsMaxWrapper.appendChild(fakeStatusbarIconsMax);

    fakeStatusbarIconsMin = document.createElement('div');
    fakeStatusbarIconsMin.id = 'statusbar-minimized';
    fakeStatusbarIconsMinWrapper.appendChild(fakeStatusbarIconsMin);
  }

  mocksForStatusbar.attachTestHelpers();

  setup(function(done) {
    this.sinon.useFakeTimers();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    prepareDOM();

    requireApp('system/js/statusbar.js', statusBarReady);

    function statusBarReady() {
      // executing init again
      Statusbar.start();
      Statusbar.finishInit();
      Statusbar._paused = 0;
      done();
    }
  });

  teardown(function() {
    fakeStatusbarNode.parentNode.removeChild(fakeStatusbarNode);
    navigator.mozL10n = realMozL10n;
  });

  suite('init when FTU is running', function() {
    setup(function() {
      this.sinon.stub(Statusbar, 'finishInit');
      this.sinon.stub(Statusbar, 'setAppearance');
    });

    teardown(function() {
      Statusbar.finishInit.restore();
      Statusbar.setAppearance.restore();
    });

    test('finish init only after ftu', function() {
      var evt = new CustomEvent('ftuopen');
      Statusbar.handleEvent(evt);
      assert.isTrue(Statusbar.finishInit.notCalled);
      evt = new CustomEvent('ftudone');
      Statusbar.handleEvent(evt);
      assert.isTrue(Statusbar.finishInit.called);
    });

    test('handles apptitlestatechanged on ftu', function() {
      var evt = new CustomEvent('apptitlestatechanged');
      Statusbar.handleEvent(evt);
      assert.isTrue(Statusbar.setAppearance.called);
    });
  });

  suite('Statusbar height', function() {
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

      MockService.mockQueryWith('getTopMostWindow', app);
      Statusbar.screen = document.createElement('div');
    });
    teardown(function() {
      Statusbar.screen = null;
    });
    test('Active app is fullscreen', function() {
      assert.equal(Statusbar.height, 0);
    });
  });

  suite('Statusbar should reflect fullscreen state', function() {
    var app;

    setup(function() {
      app = new MockAppWindow();
      MockService.mockQueryWith('getTopMostWindow', app);
    });

    teardown(function() {
      Statusbar.element.classList.remove('fullscreen');
      Statusbar.element.classList.remove('fullscreen-layout');
    });

    test('Launch a non-fullscreen app', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen'));
    });

    test('Launch a fullscreen app', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen'));
    });

    test('Launch a fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a non-fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen-layout'));
    });

    test('Back to home should remove fullscreen state', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      var home = new MockAppWindow();
      Statusbar.handleEvent(new CustomEvent('homescreenopened',
        { detail: home }));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen'));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a fullscreen activity', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      Statusbar.handleEvent(new CustomEvent('hierarchytopmostwindowchanged',
        {detail: app}));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen'));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen-layout'));
    });

    test('Launch a non-fullscreen activity', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      Statusbar.handleEvent(new CustomEvent('hierarchytopmostwindowchanged',
        {detail: app}));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen'));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen-layout'));
    });

    test('stackchanged', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      var event = new CustomEvent('stackchanged');
      Statusbar.handleEvent(event);
      assert.isTrue(Statusbar.element.classList.contains('fullscreen'));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen-layout'));
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
      Statusbar.panelHandler(e);

      return e;
    }

    var app;
    setup(function() {
      app = new MockAppWindow();
      MockService.mockQueryWith('getTopMostWindow', app);
      this.sinon.stub(app, 'handleStatusbarTouch');
      this.sinon.stub(Statusbar.element, 'getBoundingClientRect').returns({
        height: 10
      });

      Statusbar.screen = document.createElement('div');
    });

    suite('Revealing the Statusbar >', function() {
      setup(function() {
        Statusbar._cacheHeight = 24;
      });

      teardown(function() {
        this.sinon.clock.tick(10000);
        Statusbar.element.style.transition = '';
        Statusbar.element.style.transform = '';
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
        Statusbar.panelHandler(fakeEvt);
        sinon.assert.notCalled(fakeEvt.stopImmediatePropagation);
      });

      test('it should not reveal when ftu is running', function() {
        MockService.mockQueryWith('isFtuRunning', true);
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 100);

        assert.isFalse(app.handleStatusbarTouch.called);
        MockService.mockQueryWith('isFtuRunning', false);
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
        this.sinon.spy(Statusbar, '_updateIconVisibility');

      var evt = new CustomEvent('system-resize');
      Statusbar.handleEvent(evt);
      assert.isTrue(spyUpdateIconVisibility.called);
    });

    test('visibility update should get the status bars width', function() {
      var spyGetMaximizedStatusbarWidth =
        this.sinon.spy(Statusbar, '_getMaximizedStatusbarWidth');

      Statusbar._updateIconVisibility();
      assert.isTrue(spyGetMaximizedStatusbarWidth.called);
    });

    suite('when only 2 icons fit in the maximized status bar', function() {
      var iconWithPriority1;
      var iconWithPriority2;
      var iconWithPriority3;
      var getMaximizedStatusbarWidthStub;

      setup(function() {
        // Reset all the icons to be hidden.
        Statusbar.PRIORITIES.forEach(function(iconObj) {
          var iconId = iconObj[0];
          Statusbar._icons.set(Statusbar.toClassName(iconId) + 'Icon',
            new MockBaseIcon(Statusbar.toClassName(iconId) + 'Icon'));
        });

        iconWithPriority1 =
          Statusbar._icons.get(
            Statusbar.toClassName(Statusbar.PRIORITIES[0][0]) + 'Icon');
        iconWithPriority2 =
          Statusbar._icons.get(Statusbar.toClassName(
            Statusbar.PRIORITIES[1][0]) + 'Icon');
        iconWithPriority3 =
          Statusbar._icons.get(Statusbar.toClassName(
            Statusbar.PRIORITIES[2][0]) + 'Icon');

        this.sinon.stub(iconWithPriority1, 'isVisible').returns(true);
        this.sinon.stub(iconWithPriority2, 'isVisible').returns(true);
        this.sinon.stub(iconWithPriority3, 'isVisible').returns(true);

        // The maximized status bar can fit icons with priority 1 and 2.
        getMaximizedStatusbarWidthStub = sinon.stub(Statusbar,
          '_getMaximizedStatusbarWidth', function() {
            return Statusbar._getIconWidth(Statusbar.PRIORITIES[0]) +
              Statusbar._getIconWidth(Statusbar.PRIORITIES[1]);
          });
        // The minimized status bar can only fit the highest priority icon.
        Statusbar._minimizedStatusbarWidth = Statusbar._getIconWidth(
          Statusbar.PRIORITIES[0]);

        Statusbar._updateIconVisibility();
      });

      teardown(function() {
        getMaximizedStatusbarWidthStub.restore();
      });

      test('the maximized status bar should hide icon #3', function() {
        Statusbar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(Statusbar.statusbarIcons.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[0][0]));
        // Icon #2 is visible in the maximized status bar.
        assert.isFalse(Statusbar.statusbarIcons.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[1][0]));
        // Icon #3 is hidden in the maximized status bar.
        assert.isTrue(Statusbar.statusbarIcons.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[2][0]));
      });

      test('the minimized status bar should hide icon #2', function() {
        Statusbar._updateIconVisibility();

        // Icon #1 is always visible.
        assert.isFalse(Statusbar.statusbarIconsMin.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[0][0]));
        // Icon #2 is hidden in the minimized status bar.
        assert.isTrue(Statusbar.statusbarIconsMin.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[1][0]));
        // Icon #2 is not hidden in the minimized status bar.
        assert.isFalse(Statusbar.statusbarIconsMin.classList
          .contains('sb-hide-' + Statusbar.PRIORITIES[2][0]));
      });
    });
  });

  suite('_getIconWidth', function() {
    setup(function() {
      Statusbar.PRIORITIES.forEach(function(iconObj, i) {
        Statusbar._icons.set(Statusbar.toClassName(iconObj[0]) + 'Icon',
          new MockBaseIcon(Statusbar.toClassName(iconObj[0]) + 'Icon'));
      });
    });
    test('should return the stored value for fixed size icons', function() {
      // Get the index of emergency cb icon in Statusbar.PRIORITIES.
      var iconIndex;
      Statusbar.PRIORITIES.some(function(iconObj, i) {
        if (iconObj[0] === 'emergency-callback') {
          iconIndex = i;
          return true;
        }
        return false;
      });

      var emergencyCbNotificationIcon =
        Statusbar._icons.get('EmergencyCallbackIcon');
      this.sinon.stub(emergencyCbNotificationIcon, 'isVisible').returns(true);

      assert.ok(Statusbar.PRIORITIES[iconIndex][1]);
      assert.equal(Statusbar._getIconWidth(Statusbar.PRIORITIES[iconIndex]),
          16 + 4);
    });

    test('should compute the width of variable size icons', function() {
      // Get the index of time icon in Statusbar.PRIORITIES.
      var iconIndex;
      Statusbar.PRIORITIES.some(function(iconObj, i) {
        if (iconObj[0] === 'time') {
          iconIndex = i;
          return true;
        }
        return false;
      });

      var timeIcon = Statusbar._icons.get('TimeIcon');
      this.sinon.stub(timeIcon, 'isVisible').returns(true);

      assert.isNull(Statusbar.PRIORITIES[iconIndex][1]);
      assert.equal(Statusbar._getIconWidth(Statusbar.PRIORITIES[iconIndex]),
        timeIcon.element.clientWidth);
    });
  });

  suite('_updateMinimizedStatusbarWidth', function() {
    var app;
    setup(function() {
      app = getMockApp();
      MockService.mockQueryWith('getTopMostWindow', app);
    });

    test('does not update minimizedWidth when maximized', function() {
      var unchangedValue = '#';
      Statusbar._minimizedStatusbarWidth = unchangedValue;
      this.sinon.stub(Statusbar, '_updateIconVisibility');
      MockService.mockQueryWith('getTopMostWindow', app);
      Statusbar._updateMinimizedStatusbarWidth();
      assert.equal(unchangedValue, Statusbar._minimizedStatusbarWidth);
      assert.isTrue(Statusbar._updateIconVisibility.calledOnce);
    });

    test('minimizedWidth when minimized when rocketbar', function() {
      var mockedWidth = 100;
      this.sinon.stub(app.appChrome, 'isMaximized')
        .returns(false);
      MockService.mockQueryWith('LayoutManager.width', 123);
      app.appChrome.element = getMockChrome(mockedWidth);
      Statusbar._updateMinimizedStatusbarWidth();
      var expectedValue = 123 - mockedWidth - 5 - 3;
      assert.equal(Statusbar._minimizedStatusbarWidth, expectedValue);
    });

    test('minimizedWidth when minimized without rocketbar', function() {
      var mockedWidth = 1234;
      this.sinon.stub(app.appChrome, 'isMaximized')
        .returns(false);
      this.sinon.stub(Statusbar, '_getMaximizedStatusbarWidth')
        .returns(mockedWidth);
      MockService.mockQueryWith('getTopMostWindow', app);
      Statusbar._updateMinimizedStatusbarWidth();
      assert.equal(Statusbar._minimizedStatusbarWidth, mockedWidth);
    });
  });

  suite('setAppearance', function() {
    var app;
    setup(function() {
      Statusbar.element.classList.remove('light');
      Statusbar.element.classList.remove('maximized');
      app = getMockApp();
      MockService.mockQueryWith('getTopMostWindow', app);
    });

    test('setAppearance light and maximized', function() {
      var spyTopUseLightTheming = this.sinon.spy(app.appChrome,
                                                 'useLightTheming');
      var spyTopIsMaximized = this.sinon.spy(app.appChrome,
                                             'isMaximized');
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('light'));
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
      assert.isTrue(spyTopUseLightTheming.calledOnce);
      assert.isTrue(spyTopIsMaximized.called);
    });

    test('setAppearance no appChrome', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        isFullScreen: function isFullScreen() {
          return false;
        },
        isFullScreenLayout: function isFullScreenLayout() {
          return false;
        },
        getTopMostWindow: function getTopMostWindow() {
          return this;
        },
        isHomescreen: false,
        isLockscreen: false
      });
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('light'));
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
    });

    test('setAppearance homescreen', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        isHomescreen: true,
        isFullScreen: this.sinon.stub().returns(false),
        isFullScreenLayout: this.sinon.stub().returns(false),
        getTopMostWindow: function getTopMostWindow() {
          return this;
        }
      });
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('light'));
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
    });

    test('setAppearance fullscreen', function() {
      this.sinon.stub(MockService.mockQueryWith('getTopMostWindow'),
        'isFullScreen').returns(true);
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('fullscreen'));
      assert.isTrue(MockService.mockQueryWith('getTopMostWindow')
                               .isFullScreen.calledOnce);
    });

    test('setAppearance fullscreenLayout', function() {
      var stub = this.sinon.stub(MockService.mockQueryWith('getTopMostWindow'),
        'isFullScreenLayout').returns(true);
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('fullscreen-layout'));
      assert.isTrue(stub.calledOnce);
    });
  });

  suite('setAppearance with no top most window', function() {
    setup(function() {
      MockService.currentApp = getMockApp();
      MockService.mTopMostWindow = null;
    });

    test('does not add light or maximized appearance', function() {
      Statusbar.element.classList.remove('light');
      Statusbar.element.classList.remove('maximized');
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('light'));
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
    });

    test('does not remove light or maximized appearance', function() {
      Statusbar.element.classList.add('light');
      Statusbar.element.classList.add('maximized');
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('light'));
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
    });
  });

  suite('Icon events', function() {
    setup(function() {
      Statusbar._icons = new Map();
      this.sinon.stub(Statusbar, '_updateIconVisibility');
      this.sinon.stub(Statusbar, 'cloneStatusbar');
    });

    test('icon is created', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconcreated', {
        detail: icon
      }));
      assert.isTrue(Statusbar._icons.has('MobileConnectionIcon'));
    });

    test('icon is shown', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconshown', {
        detail: icon
      }));
      assert.isTrue(Statusbar._updateIconVisibility.called);
    });

    test('icon is hidden', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconhidden', {
        detail: icon
      }));
      assert.isTrue(Statusbar._updateIconVisibility.called);
    });

    test('icon is changed', function() {
      var icon = new MockBaseIcon('MobileConnectionIcon');
      window.dispatchEvent(new CustomEvent('iconchanged', {
        detail: icon
      }));
      assert.isTrue(Statusbar.cloneStatusbar.called);
    });
  });

  suite('lockscreen support', function() {
    var lockscreenApp, app;

    setup(function() {
      lockscreenApp = getApp(false, true);
      app = getApp(false, false);
      MockService.mockQueryWith('getTopMostWindow', lockscreenApp);
      var evt = new CustomEvent('hierarchytopmostwindowchanged', {
        detail: lockscreenApp
      });
      Statusbar.handleEvent(evt);
    });

    teardown(function() {
      var evt = new CustomEvent('hierarchytopmostwindowchanged', {
        detail: app
      });
      Statusbar.handleEvent(evt);
    });

    test('should set the lockscreen icons color', function() {
      assert.isFalse(Statusbar.element.classList.contains('light'));
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
    });
  });

  suite('handle events', function() {
    var app;
    var setAppearanceStub;
    var pauseUpdateStub;
    var resumeUpdateStub;

    function testEventThatHides(event) {
      var evt = new CustomEvent(event);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
      Statusbar.handleEvent(evt);
      assert.isTrue(Statusbar.element.classList.contains('hidden'));
    }

    function triggerEvent(event) {
      // XXX: Use MockAppWindow instead
      var currentApp = {
        getTopMostWindow: function getTopMostWindow() {
          return this;
        },
        isFullScreen: function() {},
        isFullScreenLayout: function() {}
      };
      MockService.mockQueryWith('getTopMostWindow', currentApp);
      var evt = new CustomEvent(event, {detail: currentApp});
      Statusbar.element.classList.add('hidden');
      Statusbar.handleEvent(evt);
    }

    function testEventThatShows(event) {
      triggerEvent(event);
      assert.isTrue(setAppearanceStub.called);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
    }

    function testEventThatNotShowsIfSwipeDetected(event) {
      var currentApp = {
        getTopMostWindow: function getTopMostWindow() {
          return this;
        }
      };
      MockService.mockQueryWith('getTopMostWindow', currentApp);
      var evt = new CustomEvent(event, {detail: currentApp});
      Statusbar.element.classList.add('hidden');
      Statusbar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
      assert.isTrue(Statusbar.element.classList.contains('hidden'));
    }

    function dispatchEdgeSwipeEvent(event) {
      var evt = new CustomEvent(event);
      Statusbar.handleEvent(evt);
    }

    function testEventThatPause(event) {
      var evt = new CustomEvent(event);
      Statusbar.handleEvent(evt);
      assert.isTrue(pauseUpdateStub.called);
      assert.equal(pauseUpdateStub.args[0], event);

      Statusbar.resumeUpdate();
    }

    function testEventThatResume(event) {
      Statusbar.pauseUpdate();

      var evt = new CustomEvent(event);
      Statusbar.handleEvent(evt);
      assert.isTrue(resumeUpdateStub.called);
      assert.equal(resumeUpdateStub.args[0], event);
      assert.isFalse(Statusbar.isPaused());
    }

    function testEventThatResumeIfNeeded(event) {
      var evt = new CustomEvent(event);
      Statusbar.handleEvent(evt);
      assert.isTrue(resumeUpdateStub.called);
      assert.equal(resumeUpdateStub.args[0], event);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
    }

    setup(function() {
      app = {
        isFullScreen: function() {},
        isFullScreenLayout: function() {}
      };
      MockService.mockQueryWith('getTopMostWindow', app);
      setAppearanceStub = this.sinon.stub(Statusbar, 'setAppearance');
      pauseUpdateStub = this.sinon.stub(Statusbar, 'pauseUpdate');
      resumeUpdateStub = this.sinon.stub(Statusbar, 'resumeUpdate');
      Statusbar._pausedForGesture = false;
    });

    test('stackchanged', function() {
      this.sinon.stub(app, 'isFullScreen').returns(false);
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      Statusbar.element.classList.add('hidden');
      var event = new CustomEvent('stackchanged');
      Statusbar.handleEvent(event);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen'));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen-layout'));
      assert.isTrue(setAppearanceStub.called);
    });

    test('sheets-gesture-end', function() {
      Statusbar.element.classList.add('hidden');
      var event = new CustomEvent('sheets-gesture-end');
      Statusbar.handleEvent(event);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
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
      var stub = this.sinon.spy(Statusbar, '_updateMinimizedStatusbarWidth');
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
      var stub = this.sinon.spy(Statusbar, '_updateMinimizedStatusbarWidth');
      testEventThatShows.bind(this)('activityopened');
      assert.isTrue(stub.calledOnce);
    });

    test('activitydestroyed', function() {
      var stub = this.sinon.spy(Statusbar, '_updateMinimizedStatusbarWidth');
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
        Statusbar.element.classList.add('hidden');
        dispatchEdgeSwipeEvent('sheets-gesture-begin');
        dispatchEdgeSwipeEvent('sheets-gesture-begin');
        this.sinon.stub(Statusbar, 'isPaused', function() {
          return true;
        });
      });

      teardown(function() {
        Statusbar.element.classList.remove('hidden');
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
      this.sinon.stub(Statusbar, '_updateIconVisibility');
      dispatchEvent('utilitytraywillhide');
      dispatchEvent('utility-tray-overlayclosed');
      assert.isFalse(Statusbar.isPaused());
      assert.isTrue(Statusbar._updateIconVisibility.calledOnce);
    });

    test('should not update icons only when paused', function() {
      this.sinon.stub(Statusbar, '_updateIconVisibility');
      dispatchEvent('utilitytraywillshow');
      dispatchEvent('utility-tray-overlayclosed');
      assert.isTrue(Statusbar.isPaused());
      assert.isFalse(Statusbar._updateIconVisibility.called);
    });
  });

  suite('Non symmetrical events shouldn\'t call cloneStatusbar()', function() {
    var dispatchEvent = function(event) {
      window.dispatchEvent(new CustomEvent(event));
    };

    test('Sheet gestures', function() {
      var cloneStatusbarStub = this.sinon.spy(Statusbar, 'cloneStatusbar');
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
      Statusbar.PRIORITIES.forEach(function(iconObj, index) {
        Statusbar._icons.set(Statusbar.toClassName(iconObj[0]) + 'Icon',
          new MockBaseIcon(Statusbar.toClassName(iconObj[0]) + 'Icon'));
        if (iconObj[0] === 'operator') {
          labelIndex = index;
        }
      });
      realClientWidth = Object.getOwnPropertyDescriptor(
        Statusbar._icons.get('OperatorIcon').element,
        'clientWidth');
    });

    teardown(function() {
      if (realClientWidth) {
        Object.defineProperty(Statusbar._icons.get('OperatorIcon').element,
          'clientWidth', realClientWidth);
      } else {
        delete Statusbar._icons.get('OperatorIcon').element.clientWidth;
      }
    });

    test('should have the cache invalidated when width changes', function() {
      var label = Statusbar._icons.get('OperatorIcon').element;

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 10; }
      });
      Statusbar.handleEvent(new CustomEvent('iconwidthchanged', {
        detail: Statusbar._icons.get('OperatorIcon')
      }));

      var originalWidth = Statusbar.PRIORITIES[labelIndex][1];

      Object.defineProperty(label, 'clientWidth', {
        configurable: true,
        get: function() { return 20; }
      });
      Statusbar.handleEvent(new CustomEvent('iconwidthchanged', {
        detail: Statusbar._icons.get('OperatorIcon')
      }));

      assert.notEqual(originalWidth, Statusbar.PRIORITIES[labelIndex][1]);
    });
  });

  suite('cloneStatusbar', function() {
    test('should create a new DOM element for the status bar', function() {
      var oldElement = Statusbar.statusbarIconsMin;
      assert.equal(oldElement, Statusbar.statusbarIconsMin);

      Statusbar.cloneStatusbar();
      assert.notEqual(oldElement, Statusbar.statusbarIconsMin);
    });

    test('should conserve the CSS class names applied', function() {
      var className = 'abc-DEF-' + Math.random();
      Statusbar.statusbarIconsMin.className = className;

      Statusbar.cloneStatusbar();
      assert.equal(Statusbar.statusbarIconsMin.className, className);
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

      MockService.mockQueryWith('getTopMostWindow', app);
      Statusbar.element.classList.add('light');
    });

    test('should remove light class', function() {
      assert.isTrue(Statusbar.element.classList.contains('light'));
      var evt = new CustomEvent('updatepromptshown');
      Statusbar.handleEvent(evt);
      assert.isFalse(Statusbar.element.classList.contains('light'));
    });

    test('should restore the current theme', function() {
      var evt = new CustomEvent('updateprompthidden');
      var setAppearanceStub = this.sinon.stub(Statusbar, 'setAppearance');
      Statusbar.handleEvent(evt);
      assert.isTrue(setAppearanceStub.called);
    });
  });

  suite('attention window', function() {
    var app;
    setup(function() {
      Statusbar.element.classList.remove('light');
      Statusbar.element.classList.remove('maximized');
      app = getMockApp();
      MockService.mockQueryWith('getTopMostWindow', app);
    });

    test('should maximize status bar', function() {
      window.dispatchEvent(new CustomEvent('attentionopened'));

      assert.isTrue(Statusbar.element.classList.contains('maximized'));
      assert.isFalse(Statusbar.element.classList.contains('light'));
    });
  });

  function getMockApp() {
    return {
      appChrome: {
        isMaximized: function isMaximized() {
          return true;
        },
        useLightTheming: function useLightTheming() {
          return true;
        }
      },
      getTopMostWindow: function getTopMostWindow() {
        return this;
      },
      isFullScreenLayout: function() {
        return false;
      },
      isFullScreen: function() {
        return false;
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
