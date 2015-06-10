/* global MocksHelper, UtilityTray, MockService */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_software_button_manager.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksHelperForUtilityTray = new MocksHelper([
  'LazyLoader',
  'Service',
  'SoftwareButtonManager'
]);
mocksHelperForUtilityTray.init();

suite('system/UtilityTray', function() {
  var stubById;
  var fakeEvt;
  var originalSoftwareButtonManager;
  mocksHelperForUtilityTray.attachTestHelpers();

  function createEvent(type, bubbles, cancelable, detail) {
    var evt = new CustomEvent(type, {
      bubbles: bubbles || false,
      cancelable: cancelable || false,
      detail: detail
    });

    return evt;
  }

  function fakeTouches(yPoints, target) {
    target = target || UtilityTray.topPanel;


    var start = yPoints[0];
    var moves = yPoints.slice(1);
    var end = yPoints.slice(-1);
    var lastY = start;

    fakeTouchStart(start, target);

    moves.forEach(y => {
      fakeTouchMove(lastY, y, target);
      lastY = y;
    });

    fakeTouchEnd(end, target);
  }

  function fakeTouchStart(y, target) {
    UtilityTray.screenHeight = 480;
    UtilityTray.onTouchStart({
      target: target,
      touches: [{ target: target, pageX: 42, pageY: y }],
      timeStamp: Date.now(),
      preventDefault: () => {}
    });
  }

  function fakeTouchMove(start, end, target) {
    var y = start;
    while (y != end) {
      UtilityTray.onTouchMove({
        target: target,
        timeStamp: Date.now(),
        touches: [{ target: target, pageX: 42, pageY: y }],
        preventDefault: () => {}
      });

      if (y < end) {
        y++;
      } else {
        y--;
      }
    }
  }

  function fakeTouchEnd(y, target) {
    UtilityTray.onTouchEnd({
      target: target,
      timeStamp: Date.now(),
      changedTouches: [{ target: target, pageX: 42, pageY: y }],
      preventDefault: () => {},
      stopImmediatePropagation: () => {}
    });
  }

  function fakeTransitionEnd() {
    UtilityTray.overlay.dispatchEvent(createEvent('transitionend'));
  }

  setup(function(done) {
    originalSoftwareButtonManager = window.softwareButtonManager;
    window.softwareButtonManager = window.MocksoftwareButtonManager;

    MockService.mockQueryWith('getTopMostWindow', {
      isTransitioning: function() {},
      getTopMostWindow: function() { return this; },
      appChrome: {
        titleClicked: function() {},
        useCombinedChrome: function() {},
        isMaximized: function() {}
      }
    });

    var statusbar = document.createElement('div');
    statusbar.style.cssText = 'height: 100px; display: block;';

    var statusbarIcons = document.createElement('div');
    statusbarIcons.style.cssText = 'height: 100px; display: block;';

    var grippy = document.createElement('div');
    grippy.style.cssText = 'height: 100px; display: block;';

    var overlay = document.createElement('div');
    overlay.style.cssText = 'height: 100px; display: block;';

    var screen = document.createElement('div');
    screen.style.cssText = 'height: 100px; display: block;';

    var placeholder = document.createElement('div');
    placeholder.style.cssText = 'height: 100px; display: block;';

    var notifications = document.createElement('div');
    notifications.style.cssText = 'height: 100px; display: block;';

    var notification = document.createElement('div');
    notification.className = 'notification';
    notifications.style.cssText = 'height: 100px; display: block;';

    var stickyNotification = document.createElement('div');
    stickyNotification.className = 'fake-notification';
    stickyNotification.style.cssText = 'height: 100px; display: block;';

    var someButton = document.createElement('button');
    var someListItem = document.createElement('li');

    var topPanel = document.createElement('div');
    topPanel.style.cssText = 'height: 20px; display: block;';

    var ambientIndicator = document.createElement('div');
    ambientIndicator.style.cssText = 'height: 2px; display: block;';

    var softwareButtons = document.createElement('div');
    softwareButtons.style.cssText = 'height: 20px; display: block;';

    /**
     * Assemble
     */

    statusbar.appendChild(statusbarIcons);
    topPanel.appendChild(statusbar);
    notifications.appendChild(notification);
    overlay.appendChild(stickyNotification);
    overlay.appendChild(someButton);
    overlay.appendChild(someListItem);
    overlay.appendChild(notifications);
    overlay.appendChild(grippy);

    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      switch (id) {
        case 'statusbar':
          return statusbar;
        case 'statusbar-icons':
          return statusbarIcons;
        case 'utility-tray-grippy':
          return grippy;
        case 'utility-tray':
          return overlay;
        case 'screen':
          return screen;
        case 'notifications-placeholder':
          return placeholder;
        case 'utility-tray-notifications':
          return notifications;
        case 'top-panel':
          return topPanel;
        case 'ambient-indicator':
          return ambientIndicator;
        case 'software-buttons':
          return softwareButtons;
        default:
          return null;
      }
    });
    requireApp('system/js/utility_tray.js', function() {
      UtilityTray.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
    MockService.mockQueryWith('locked', false);
    MockService.mockQueryWith('getTopMostWindow', null);

    window.softwareButtonManager = originalSoftwareButtonManager;
  });

  suite('show', function() {
    setup(function() {
      UtilityTray.show(true);
    });

    test('shown should be true', function() {
      assert.equal(UtilityTray.shown, true);
    });

    test('Test screen element\'s class list', function() {
      assert.equal(UtilityTray.screen.classList.contains('utility-tray'), true);
    });
  });

  suite('hide', function() {
    setup(function() {
      UtilityTray.hide(true);
    });

    test('should do nothing if is already hidden', function() {
      assert.equal(UtilityTray.shown, false);
      this.sinon.stub(UtilityTray, 'validateCachedSizes');
      UtilityTray.hide(true);
      assert.isFalse(UtilityTray.validateCachedSizes.called);
    });

    test('shown should be false', function() {
      assert.equal(UtilityTray.shown, false);
    });

    test('lastY and startY should be undefined', function() {
      assert.equal(UtilityTray.lastY, undefined);
      assert.equal(UtilityTray.startY, undefined);
    });

    test('Test screen element\'s class list', function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
    });
  });

  suite('onTouch', function() {
    suite('tapping the left corner', function() {
      var appChrome, titleStub, app;

      setup(function() {
        app = MockService.mockQueryWith('getTopMostWindow');
        appChrome = app.appChrome;
        titleStub = this.sinon.stub(appChrome, 'titleClicked');
      });

      teardown(function() {
        fakeTransitionEnd();
      });

      test('should call to titleClicked', function() {
        this.sinon.stub(appChrome, 'useCombinedChrome').returns(true);
        this.sinon.stub(appChrome, 'isMaximized').returns(false);
        this.sinon.stub(app, 'isTransitioning').returns(false);
        fakeTouches([0, 2]);
        assert.isTrue(titleStub.called);
      });

      test('should not call to titleClicked if isTransitioning', function() {
        this.sinon.stub(appChrome, 'useCombinedChrome').returns(true);
        this.sinon.stub(appChrome, 'isMaximized').returns(false);
        this.sinon.stub(app, 'isTransitioning').returns(true);
        fakeTouches([0, 2]);
        assert.isFalse(titleStub.called);
      });

      test('should not call to titleClicked if !combinedView', function() {
        this.sinon.stub(appChrome, 'useCombinedChrome').returns(false);
        this.sinon.stub(appChrome, 'isMaximized').returns(false);
        this.sinon.stub(app, 'isTransitioning').returns(false);
        fakeTouches([0, 2]);
        assert.isFalse(titleStub.called);
      });

      test('should not call to titleClicked if is maximized', function() {
        this.sinon.stub(appChrome, 'useCombinedChrome').returns(true);
        this.sinon.stub(appChrome, 'isMaximized').returns(true);
        this.sinon.stub(app, 'isTransitioning').returns(false);
        fakeTouches([0, 2]);
        assert.isFalse(titleStub.called);
      });

      test('should hide the Utility tray', function() {
        UtilityTray.show(true);
        fakeTouches([0, 2]);
        assert.equal(UtilityTray.showing, false);
      });

      test('the tray can be opened after', function() {
        fakeTouches([0, 2]);
        assert.isFalse(UtilityTray.shown);
        fakeTouches([0, 400]);
        fakeTransitionEnd();
        assert.isTrue(UtilityTray.shown);
      });
    });

    suite('showing', function() {
      var publishStub;

      setup(function() {
        UtilityTray.isTap = true;
        UtilityTray.hide(true);
        publishStub = this.sinon.stub(UtilityTray, 'publish');
      });

      teardown(function() {
        fakeTransitionEnd();
      });

      test('should not be shown by a tap', function() {
        fakeTouches([0, 5]);
        assert.equal(UtilityTray.showing, false);
      });

      test('should not trigger overlayopening event by a tap', function() {
        fakeTouches([0, 5]);
        assert.isFalse(publishStub.calledWith('-overlayopening'));
      });

      test('should be shown by a drag from the top', function() {
        fakeTouches([0, 100]);
        assert.isTrue(UtilityTray.showing, true);
      });

      test('should trigger overlayopening event', function() {
        fakeTouches([0, 100]);
        assert.isTrue(publishStub.calledWith('-overlayopening'));
      });

      test('Should be hidden when dragged down then up', function() {
        UtilityTray.hide(true);
        var target = UtilityTray.topPanel;
        fakeTouchStart(100, target); // touch
        fakeTouchMove(100, 400, target); // drag down
        fakeTouchMove(400, 100, target); // drag up
        fakeTouchEnd(100, target); // release
        assert.isFalse(UtilityTray.showing);
      });

      test('should add utility-tray-in-transition class with drag from top',
        function() {
          fakeTouches([0, 100]);
          assert.isTrue(UtilityTray.screen.classList.contains(
            'utility-tray-in-transition'));
        }
      );

      test('should send a touchcancel to the oop active app' +
           'since the subsequent events will be swallowed', function() {
        UtilityTray.screen.classList.remove('utility-tray');

        var app = {
          iframe: {
            sendTouchEvent: function() {}
          },
          config: {
            oop: true
          }
        };
        MockService.mockQueryWith('getTopMostWindow', app);
        this.sinon.spy(app.iframe, 'sendTouchEvent');

        fakeTouches([0, 100]);

        sinon.assert.calledWith(app.iframe.sendTouchEvent, 'touchcancel');
      });

      test('should not send a touchcancel to the in-process active app' +
           'since the subsequent events will be swallowed', function() {
        UtilityTray.screen.classList.remove('utility-tray');

        var app = {
          iframe: {
            sendTouchEvent: function() {}
          },
          config: {
            oop: false
          }
        };
        MockService.mockQueryWith('getTopMostWindow', app);
        this.sinon.spy(app.iframe, 'sendTouchEvent');

        fakeTouches([0, 100]);

        sinon.assert.notCalled(app.iframe.sendTouchEvent);
      });
    });

    suite('hiding', function() {
      setup(function() {
        UtilityTray.show(true);
      });

      teardown(function() {
        fakeTransitionEnd();
      });

      test('should not be hidden by a tap', function() {
        fakeTouches([480, 475], UtilityTray.grippy);
        assert.equal(UtilityTray.showing, true);
      });

      test('should be hidden by a drag from the bottom', function() {
        fakeTouches([480, 380], UtilityTray.grippy);
        assert.equal(UtilityTray.showing, false);
      });

      test('should be hidden by a drag from the softwareButtons', function() {
        fakeTouches([480, 380], UtilityTray.softwareButtons);
        assert.equal(UtilityTray.showing, false);
      });

      test('should add utility-tray-in-transition class on drag from bottom',
        function() {
          fakeTouches([480, 380], UtilityTray.grippy);
          assert.isTrue(UtilityTray.screen.classList.contains(
            'utility-tray-in-transition'));
        }
      );
    });
  });

  test('setFocus', function() {
    assert.isFalse(UtilityTray.setFocus());
  });

  // handleEvent
  suite('handleEvent: attentionopened', function() {
    setup(function() {
      fakeEvt = createEvent('attentionopened');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.showing, false);
    });
  });

  // handleEvent
  suite('handleEvent: sheets-gesture-begin', function() {
    setup(function() {
      fakeEvt = createEvent('sheets-gesture-begin');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should hide the ambientIndicator', function() {
      assert.isTrue(UtilityTray.overlay.classList.contains('on-edge-gesture'));
    });
  });

  // handleEvent
  suite('handleEvent: sheets-gesture-end', function() {
    setup(function() {
      fakeEvt = createEvent('sheets-gesture-end');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
      fakeTransitionEnd();
    });

    test('should unhide the ambientIndicator', function() {
      assert.isFalse(UtilityTray.overlay.classList.contains('on-edge-gesture'));
    });
  });

  suite('handleEvent: cardviewbeforeshow', function() {
    setup(function() {
      fakeEvt = createEvent('cardviewbeforeshow');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('handleEvent: home', function() {
    setup(function() {
      fakeEvt = createEvent('home', true);

      UtilityTray.show();
      UtilityTray.respondToHierarchyEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('handleEvent: screenchange', function() {
    teardown(function() {
      UtilityTray.active = false;
    });

    function triggerEvent(active) {
      fakeEvt = createEvent('screenchange', false, false,
                            { screenEnabled: false });
      UtilityTray.active = active;
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
      fakeTransitionEnd();
    }

    test('should be hidden when inactive', function() {
      triggerEvent(false);
      assert.equal(UtilityTray.shown, false);
    });

    test('should still be visible when active', function() {
      triggerEvent(true);
      assert.equal(UtilityTray.shown, true);
    });
  });

  suite('handleEvent: emergencyalert', function() {
    setup(function() {
      fakeEvt = createEvent('emergencyalert');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.showing, false);
    });
  });

  suite('handleEvent: accessibility-control', function() {
    var swipeDown = new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'accessibility-control',
        details: JSON.stringify({ eventType: 'edge-swipe-down' })
      }
    });

    function assertIsShowing(isShowing) {
      assert.equal(UtilityTray.overlay.classList.contains('visible'),
                   isShowing);
      assert.equal(UtilityTray.showing, isShowing);
    }

    setup(function() {
      UtilityTray.hide();
      UtilityTray.overlay.classList.remove('visible');
    });

    teardown(function() {
      fakeTransitionEnd();
    });

    test('first swipe should show', function() {
      UtilityTray.handleEvent(swipeDown);
      assertIsShowing(true);
    });

    test('first swipe should not show when locked', function() {
      MockService.mockQueryWith('locked', true);
      UtilityTray.handleEvent(swipeDown);
      assertIsShowing(false);
    });

    test('first swipe should not show when running FTU', function() {
      MockService.mockQueryWith('isFtuRunning', true);
      UtilityTray.handleEvent(swipeDown);
      assertIsShowing(false);
    });

    test('second swipe should hide', function() {
      UtilityTray.show();
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'accessibility-control',
          details: JSON.stringify({ eventType: 'edge-swipe-down' })
        }
      });
      UtilityTray.handleEvent(evt);
      assertIsShowing(false);
    });
  });

  suite('handleEvent: imemenushow', function() {
    setup(function() {
      UtilityTray.show();
    });

    test('should be hidden', function() {
      fakeEvt = createEvent('imemenushow', false, true, {});
      UtilityTray.handleEvent(fakeEvt);
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('handleEvent: launchapp', function() {
    setup(function() {
      UtilityTray.show();
    });

    test('should be hidden', function() {
      fakeEvt = createEvent('launchapp', false, true, {
        origin: 'app://otherApp'
      });
      UtilityTray.handleEvent(fakeEvt);
      assert.equal(UtilityTray.showing, false);
    });

    test('should not be hidden if the event is sent from background app',
      function() {
        var findMyDeviceOrigin =
          window.location.origin.replace('system', 'findmydevice');
        fakeEvt = createEvent('launchapp', false, true, {
          origin: findMyDeviceOrigin
        });
        UtilityTray.handleEvent(fakeEvt);
        assert.equal(UtilityTray.showing, true);
    });

    test('should not be hidden when event marked stayBackground', function() {
      fakeEvt = createEvent('launchapp', false, true, {
        origin: 'app://otherApp',
        stayBackground: true
      });
      UtilityTray.handleEvent(fakeEvt);
      assert.equal(UtilityTray.showing, true);
    });
  });

  suite('handleEvent: touchstart', function() {
    mocksHelperForUtilityTray.attachTestHelpers();

    setup(function() {
      UtilityTray.hide();
      UtilityTray.transitioning = false;
      fakeEvt = createEvent('touchstart', true, true);
      fakeEvt.touches = [0];
    });

    teardown(function() {
      UtilityTray.active = false;
    });

    test('onTouchStart is not called if LockScreen is locked', function() {
      MockService.mockQueryWith('locked', true);
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('onTouchStart is called if LockScreen is not locked', function() {
      MockService.mockQueryWith('locked', false);
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      UtilityTray.grippy.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('events on the topPanel are handled', function() {
      MockService.mockQueryWith('locked', false);
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('onTouchStart is called when ftu is running', function() {
      MockService.mockQueryWith('isFtuRunning', true);
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('preventDefault if the target is the statusbar', function() {
      assert.isFalse(UtilityTray.statusbarIcons.dispatchEvent(fakeEvt));
    });

    test('preventDefault if the target is the grippy', function() {
      assert.isFalse(UtilityTray.grippy.dispatchEvent(fakeEvt));
    });

    test('Test UtilityTray.active, should be true', function() {
      /* XXX: This is to test UtilityTray.active,
              it works in local test but breaks in travis. */
      // assert.equal(UtilityTray.active, true);
    });

    test('onTouchStart is not called if already opened', function() {
      UtilityTray.show();
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('not called if non-draggable target', function() {
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      var overlay = UtilityTray.overlay;
      var notification = overlay.querySelector('.notification');
      var stickyNotification = overlay.querySelector('.fake-notification');
      var button = overlay.querySelector('button');
      var li = overlay.querySelector('li');

      [
        stickyNotification,
        notification,
        button,
        li
      ].forEach(el => {
        var fakeEvt = createEvent('touchstart', true, true);
        fakeEvt.touches = [0];
        el.dispatchEvent(fakeEvt);
        assert.ok(stub.notCalled);
      });
    });

    test('not called if button is target', function() {
      var stub = this.sinon.stub(UtilityTray, 'startMove');
      var notification = UtilityTray.notifications
        .querySelector('.notification');
      notification.dispatchEvent(fakeEvt);
      sinon.assert.notCalled(stub);
    });

    suite('Custom events', function() {
      setup(function() {
        UtilityTray.active = false;
        UtilityTray.shown = false;
      });

      test('should fire a utilitytraywillhide event', function(done) {
        window.addEventListener('utilitytraywillhide', function gotIt() {
          window.removeEventListener('utilitytraywillhide', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
        UtilityTray.shown = true;
        UtilityTray.grippy.dispatchEvent(fakeEvt);
      });

      test('should fire a utilitytraywillshow event', function(done) {
        window.addEventListener('utilitytraywillshow', function gotIt() {
          window.removeEventListener('utilitytraywillshow', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
        UtilityTray.overlay.dispatchEvent(fakeEvt);
      });
    });
  });

  suite('handleEvent: touchend', function() {
    setup(function() {
      fakeEvt = createEvent('touchend', true, true);
      fakeEvt.changedTouches = [0];

      UtilityTray.active = true;
    });

    test('Test UtilityTray.active, should be false', function() {
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.equal(UtilityTray.active, false);
    });
  });

  suite('handleEvent: transitionend', function() {
    setup(function() {
      UtilityTray.hide();
      UtilityTray.screen.classList.add('utility-tray-in-transition');
      fakeTransitionEnd();
    });

    test('Test utilitytrayhide is correcly dispatched', function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
    });

    test('Ensure utility-tray-in-transition class is removed', function() {
      assert.isFalse(UtilityTray.screen.classList.contains(
        'utility-tray-in-transition'));
    });
  });

  suite('handleEvent: activityopening', function() {
    setup(function() {
      fakeEvt = createEvent('activityopening');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('hide() events', function() {
    function doAction(shown) {
      UtilityTray.showing = true;
      UtilityTray.shown = shown;
      UtilityTray.hide();
      fakeTransitionEnd();
    }

    test('utilitytraywillhide is dispatched when inactive', function(done) {
      window.addEventListener('utilitytraywillhide',
        function gotIt() {
          window.removeEventListener('utilitytraywillhide', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      UtilityTray.active = false;
      doAction(true);
    });

    test('utility-tray-overlayclosed is correctly dispatched', function(done) {
      window.addEventListener('utility-tray-overlayclosed',
        function gotIt() {
          window.removeEventListener('utility-tray-overlayclosed', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(true);
    });

    test('utilitytrayhide is correctly dispatched', function(done) {
      window.addEventListener('utilitytrayhide',
        function gotIt() {
          window.removeEventListener('utilitytrayhide', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(true);
    });

    test('utilitytray-deactivated is correctly dispatched', function(done) {
      window.addEventListener('utilitytray-deactivated',
        function gotIt() {
          window.removeEventListener('utilitytray-deactivated', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(true);
    });

    test('utility-tray-abortopen is called when the tray ' +
      'is closed before it is fully opened', function(done) {
      window.addEventListener('utility-tray-abortopen',
        function gotIt() {
          window.removeEventListener('utility-tray-abortopen', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });

      UtilityTray.hide(true);

      var target = UtilityTray.topPanel;

      fakeTouches([2, 200, 2], target);
    });

    test('The tray does not move when tapped', function() {
      UtilityTray.show(true);

      var target = UtilityTray.overlay;
      var startY = target.style.transform;

      fakeTouchStart(200, target);
      fakeTouchMove(200, 196, target);
      assert.equal(startY, target.style.transform);
      fakeTouchEnd(200, target);

      fakeTouchStart(200, target);
      fakeTouchMove(200, 190, target);
      assert.notEqual(startY, target.style.transform);
      fakeTouchEnd(190, target);
    });
  });

  suite('show() events', function() {
    function doAction(shown) {
      UtilityTray.shown = shown;
      UtilityTray.show();
      fakeTransitionEnd();
    }

    test('utilitytraywillshow is dispatched when inactive', function(done) {
      window.addEventListener('utilitytraywillshow', function gotIt() {
          window.removeEventListener('utilitytraywillshow', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      UtilityTray.active = false;
      doAction(false);
    });

    test('utility-tray-overlayopened is correctly dispatched', function(done) {
      window.addEventListener('utility-tray-overlayopened',
        function gotIt() {
          window.removeEventListener('utility-tray-overlayopened', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(false);
    });

    test('utilitytrayshow is correctly dispatched', function(done) {
      window.addEventListener('utilitytrayshow',
        function gotIt() {
          window.removeEventListener('utilitytrayshow', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(false);
    });

    test('utilitytray-activated is correctly dispatched', function(done) {
      window.addEventListener('utilitytray-activated',
        function gotIt() {
          window.removeEventListener('utilitytray-activated', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(false);
    });

    test('utility-tray-abortclose is correctly dispatched', function(done) {
      window.addEventListener('utility-tray-abortclose',
        function gotIt() {
          window.removeEventListener('utility-tray-abortclose', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(true);
    });
  });

  suite('handle software button bar', function() {
    test('enabling/disabling soft home updates the cached height', function() {
      var adjustedHeight = UtilityTray.screenHeight - 50;
      var stub = sinon.stub(
          UtilityTray.overlay,
          'getBoundingClientRect',
          function() {
            return {width: 100, height: adjustedHeight};
          }
      );

      var sbEnabledEvt = createEvent('software-button-enabled');
      UtilityTray.handleEvent(sbEnabledEvt);

      assert.equal(UtilityTray.screenHeight, adjustedHeight);

      adjustedHeight += 50;
      var sbDisabledEvt = createEvent('software-button-disabled');
      UtilityTray.handleEvent(sbDisabledEvt);

      assert.equal(UtilityTray.screenHeight, adjustedHeight);

      stub.restore();
    });
  });
});
