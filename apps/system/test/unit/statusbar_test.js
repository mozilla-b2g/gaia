/* globals MockL10n, MocksHelper, MockService, Statusbar,
           UtilityTray, MockAppWindow */
'use strict';

require('/apps/system/js/base_ui.js');
require('/apps/system/js/base_icon.js');
require('/apps/system/js/service.js');
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
  'LazyLoader'
]).init();

suite('system/Statusbar', function() {
  var fakeStatusbarNode, fakeTopPanel, fakeStatusbarIconsMax,
      fakeStatusbarIcons, fakeStatusbarIconsMaxWrapper,
      fakeStatusbarIconsMinWrapper, fakeStatusbarIconsMin;
  var realMozL10n, realService, clientWidth, icons;

  var ICONS_LIMIT = 7;

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

  function showIcons(number) {
    for (var i = number - 1; i >= 0; i--) {
      var detail = {
        dashPureName: Math.floor(Math.random() * 100000000).toString()
      };
      window.dispatchEvent(new CustomEvent('iconshown', {detail: detail}));
      icons.push(detail.dashPureName);
    }
  }

  function hideIcons(number) {
    number = number || icons.length;
    for (var i = 0; i < number; i++) {
      var detail = {
        dashPureName: icons.pop()
      };
      window.dispatchEvent(new CustomEvent('iconhidden', {detail: detail}));
    }
  }

  function prepareDOM() {
    fakeStatusbarNode = document.createElement('div');
    fakeStatusbarNode.id = 'statusbar';
    document.body.appendChild(fakeStatusbarNode);

    fakeTopPanel = document.createElement('div');
    fakeTopPanel.id = 'top-panel';
    document.body.appendChild(fakeTopPanel);

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
    icons = [];
    this.sinon.useFakeTimers();

    realService = window.Service;
    window.Service = MockService;
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    prepareDOM();

    requireApp('system/js/statusbar.js', statusBarReady);

    function statusBarReady() {
      clientWidth = 320;
      // executing init again
      Statusbar.start();
      Object.defineProperty(Statusbar.element, 'clientWidth', {
        configurable: true,
        get: function() { return clientWidth; }
      });
      Statusbar.finishInit();
      done();
    }
  });

  teardown(function() {
    fakeStatusbarNode.parentNode.removeChild(fakeStatusbarNode);
    navigator.mozL10n = realMozL10n;
    window.Service = realService;
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
    var app, appChromeElementId = 'test';

    setup(function() {
      app = new MockAppWindow({
        appChrome: {
          element: { id: appChromeElementId },
          isMaximized: this.sinon.spy(),
          useLightTheming: this.sinon.spy()
        }
      });
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
      assert.equal(Statusbar.element.getAttribute('aria-owns'),
        appChromeElementId);
    });

    test('Launch a fullscreen app', function() {
      this.sinon.stub(app, 'isFullScreen').returns(true);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen'));
      assert.isFalse(Statusbar.element.hasAttribute('aria-owns'));
    });

    test('Launch a fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(true);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isTrue(Statusbar.element.classList.contains('fullscreen-layout'));
      assert.isFalse(Statusbar.element.hasAttribute('aria-owns'));
    });

    test('Launch a non-fullscreen-layout app', function() {
      this.sinon.stub(app, 'isFullScreenLayout').returns(false);
      Statusbar.handleEvent(new CustomEvent('appopened', {detail: app}));
      assert.isFalse(Statusbar.element.classList.contains('fullscreen-layout'));
      assert.equal(Statusbar.element.getAttribute('aria-owns'),
        appChromeElementId);
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
      assert.isFalse(Statusbar.element.hasAttribute('aria-owns'));
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
        UtilityTray.shown = true;
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 100);

        assert.isFalse(app.handleStatusbarTouch.called);
        UtilityTray.shown = false;
      });
    });
  });

  suite('Icons', function() {
    test('it sets the order when an icon is rendered', function() {
      var priority1 = Object.keys(Statusbar.PRIORITIES)[0];
      var order = Statusbar.PRIORITIES.indexOf(priority1);
      var mockIcon = {
        dashPureName: priority1,
        setOrder: this.sinon.stub()
      };
      window.dispatchEvent(new CustomEvent('iconrendered', {detail: mockIcon}));
      assert.isTrue(mockIcon.setOrder.calledWith(order));
    });
  });

  suite('setAppearance', function() {
    var app;
    setup(function() {
      app = getMockApp();
      MockService.mockQueryWith('getTopMostWindow', app);
      showIcons(10);
      Statusbar.element.classList.remove('light');
      Statusbar.element.classList.remove('maximized');
    });

    teardown(function() {
      hideIcons();
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

    test('setAppearance removes maximized if needed', function() {
      this.sinon.stub(app.appChrome, 'isMaximized').returns(false);
      app.isHomescreen = undefined;
      app.isAttentionWindow = undefined;
      app.isLockscreen = undefined;
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
    });

    test('setAppearance with utility tray adds maximized', function() {
      this.sinon.stub(app.appChrome, 'isMaximized').returns(false);
      app.isHomescreen = undefined;
      app.isAttentionWindow = undefined;
      app.isLockscreen = undefined;
      UtilityTray.shown = true;
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
      UtilityTray.shown = false;
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

    test('setAppearance maximized with fewIcons', function() {
      hideIcons();
      showIcons(5);
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
    });

    test('maximized when iconshown and fewIcons', function() {
      hideIcons();
      showIcons(ICONS_LIMIT - 1);
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
      showIcons(1);
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
    });

    test('not maximized when iconhidden and fewIcons', function() {
      hideIcons();
      showIcons(ICONS_LIMIT);
      Statusbar.setAppearance();
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
      hideIcons(1);
      Statusbar.setAppearance();
      assert.isFalse(Statusbar.element.classList.contains('maximized'));
    });
  });

  suite('setAppearance with no top most window', function() {
    setup(function() {
      MockService.mockQueryWith('getTopMostWindow', null);
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

  suite('lockscreen support', function() {
    var lockscreenApp, app;

    function lockScreen() {
      MockService.mockQueryWith('getTopMostWindow', lockscreenApp);
      var evt = new CustomEvent('hierarchytopmostwindowchanged', {
        detail: lockscreenApp
      });
      showIcons(10);
      Statusbar.handleEvent(evt);
    }

    function unlockScreen() {
      var evt = new CustomEvent('hierarchytopmostwindowchanged', {
        detail: app
      });
      Statusbar.handleEvent(evt);
    }

    setup(function() {
      lockscreenApp = getApp(false, true);
      app = getApp(false, false);
    });

    teardown(function() {
      hideIcons();
    });

    test('should set the lockscreen icons color', function() {
      lockScreen();
      assert.isFalse(Statusbar.element.classList.contains('light'));
      assert.isTrue(Statusbar.element.classList.contains('maximized'));
      unlockScreen();
    });
  });

  suite('handle events', function() {
    var app;
    var setAppearanceStub;

    function testEventThatHides(event) {
      var evt = new CustomEvent(event);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
      Statusbar.handleEvent(evt);
      assert.isTrue(Statusbar.element.classList.contains('hidden'));
    }

    function triggerEvent(event, config) {
      var currentApp = new MockAppWindow(config);
      MockService.mockQueryWith('getTopMostWindow', currentApp);
      var evt = new CustomEvent(event, {detail: currentApp});
      Statusbar.element.classList.add('hidden');
      Statusbar.handleEvent(evt);
    }

    function testEventThatShows(event, config) {
      triggerEvent(event, config);
      assert.isTrue(setAppearanceStub.called);
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
    }

    setup(function() {
      app = new MockAppWindow();
      MockService.mockQueryWith('getTopMostWindow', app);
      setAppearanceStub = this.sinon.stub(Statusbar, 'setAppearance');
      Statusbar._pausedForGesture = false;
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

    test('appwillopen', function() {
      testEventThatHides.bind(this)('appwillopen');
    });

    test('appwillclose', function() {
      testEventThatHides.bind(this)('appwillclose');
    });

    test('homescreenopened', function() {
      testEventThatShows.bind(this)('homescreenopened');
    });

    test('appopened', function() {
      testEventThatShows.bind(this)('appopened', {
        appChrome: {
          element: { id: 'test' },
          isMaximized: this.sinon.spy(),
          useLightTheming: this.sinon.spy()
        }
      });
    });

    test('appclosed', function() {
      testEventThatShows.bind(this)('appopened', {
        appChrome: {
          element: { id: 'test' },
          isMaximized: this.sinon.spy(),
          useLightTheming: this.sinon.spy()
        }
      });
    });

    test('appchromecollapsed', function() {
      triggerEvent.bind(this)('appchromecollapsed');
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
      testEventThatShows.bind(this)('activityopened');
    });

    test('utilitytraywillshow', function() {
      triggerEvent.bind(this)('utilitytraywillshow');
      assert.isTrue(setAppearanceStub.called);
    });

    test('utilitytraywillhide', function() {
      triggerEvent.bind(this)('utilitytraywillhide');
      assert.isTrue(setAppearanceStub.called);
    });

    test('cardviewshown', function() {
      triggerEvent.bind(this)('cardviewshown');
      assert.isTrue(Statusbar.element.classList.contains('hidden'));
    });

    test('cardviewclosed', function() {
      triggerEvent.bind(this)('cardviewclosed');
      assert.isFalse(Statusbar.element.classList.contains('hidden'));
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

  suite('Dependencies', function() {
    var wifiIcon;

    setup(function(done) {
      window.Service = realService;
      require('/apps/system/js/wifi_icon.js', function() {
        wifiIcon = new window.WifiIcon();
        requireApp('/apps/system/js/statusbar.js');
        done();
      });
    });

    teardown(function() {
      window.Service = MockService;
    });

    test('icon calls render before the statusbar is there', function(done) {
      wifiIcon.element = null;
      wifiIcon.render();
      assert.isNull(wifiIcon.element);
      Statusbar.start();
      window.addEventListener('iconrendered', function() {
        assert.ok(wifiIcon.element);
        done();
      });
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
});
