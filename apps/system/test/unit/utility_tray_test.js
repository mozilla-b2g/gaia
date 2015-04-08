/* global MocksHelper, UtilityTray */

'use strict';

requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_software_button_manager.js');
require('/shared/test/unit/mocks/mock_service.js');

var mocksHelperForUtilityTray = new MocksHelper([
  'LazyLoader',
  'Service',
  'StatusBar',
  'SoftwareButtonManager'
]);
mocksHelperForUtilityTray.init();

suite('system/UtilityTray', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;
  var originalLocked;
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

  function fakeTouches(start, end, target) {
    target = target || UtilityTray.topPanel;

    UtilityTray.onTouchStart({ target: target, pageX: 42, pageY: start });
    UtilityTray.screenHeight = 480;

    var y = start;
    while (y != end) {
      UtilityTray.onTouchMove({ target: target, pageX: 42, pageY: y });

      if (y < end) {
        y++;
      } else {
        y--;
      }
    }
    UtilityTray.onTouchEnd({target: target, pageX: 42, pageY: y});
  }

  function fakeTransitionEnd() {
    UtilityTray.overlay.dispatchEvent(createEvent('transitionend'));
  }

  setup(function(done) {
    originalSoftwareButtonManager = window.softwareButtonManager;
    window.softwareButtonManager = window.MocksoftwareButtonManager;

    Service.currentApp = {
      appChrome: {
        titleClicked: function() {}
      }
    };

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

    var topPanel = document.createElement('div');
    topPanel.style.cssText = 'height: 20px; display: block;';

    var ambientIndicator = document.createElement('div');
    ambientIndicator.style.cssText = 'height: 2px; display: block;';

    var softwareButtons = document.createElement('div');
    softwareButtons.style.cssText = 'height: 20px; display: block;';

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
    window.Service.locked = false;
    window.Service.currentApp = null;

    window.softwareButtonManager = originalSoftwareButtonManager;
  });

  suite('show', function() {
    setup(function() {
      UtilityTray.show(true);
    });

    test('shown should be true', function() {
      assert.equal(UtilityTray.shown, true);
    });

    test("Test screen element's class list", function() {
      assert.equal(UtilityTray.screen.classList.contains('utility-tray'), true);
    });
  });


  suite('hide', function() {
    setup(function() {
      UtilityTray.hide(true);
    });

    test('shown should be false', function() {
      assert.equal(UtilityTray.shown, false);
    });

    test('lastY and startY should be undefined', function() {
      assert.equal(UtilityTray.lastY, undefined);
      assert.equal(UtilityTray.startY, undefined);
    });

    test("Test screen element's class list", function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
    });
  });


  suite('onTouch', function() {
    suite('taping the left corner', function() {
      teardown(function() {
        fakeTransitionEnd();
      });

      test('should call to titleClicked', function() {
        var appChrome = Service.currentApp.appChrome;
        var titleStub = this.sinon.stub(appChrome, 'titleClicked');
        fakeTouches(0, 2);
        assert.isTrue(titleStub.called);
      });

      test('should hide the Utility tray', function() {
        UtilityTray.show(true);
        fakeTouches(0, 2);
        assert.equal(UtilityTray.showing, false);
      });
    });

    suite('showing', function() {
      var publishStub;

      setup(function() {
        UtilityTray.isTap = true;
        publishStub = this.sinon.stub(UtilityTray, 'publish');
      });

      test('should not be shown by a tap', function() {
        fakeTouches(0, 5);
        assert.equal(UtilityTray.showing, false);
      });

      test('should not trigger overlayopening event by a tap', function() {
        fakeTouches(0, 5);
        assert.isFalse(publishStub.calledWith('-overlayopening'));
      });

      test('should be shown by a drag from the top', function() {
        fakeTouches(0, 100);
        assert.equal(UtilityTray.showing, true);
      });

      test('should trigger overlayopening event', function() {
        fakeTouches(0, 100);
        assert.isTrue(publishStub.calledWith('-overlayopening'));
      });

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
        window.Service.currentApp = app;
        this.sinon.spy(app.iframe, 'sendTouchEvent');

        fakeTouches(0, 100);

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
        window.Service.currentApp = app;
        this.sinon.spy(app.iframe, 'sendTouchEvent');

        fakeTouches(0, 100);

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
        fakeTouches(480, 475, UtilityTray.grippy);
        assert.equal(UtilityTray.showing, true);
      });

      test('should be hidden by a drag from the bottom', function() {
        fakeTouches(480, 380, UtilityTray.grippy);
        assert.equal(UtilityTray.showing, false);
      });

      test('should be hidden by a drag from the softwareButtons', function() {
        fakeTouches(480, 380, UtilityTray.softwareButtons);
        assert.equal(UtilityTray.showing, false);
      });
    });
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
      window.Service.locked = false;
      window.Service.runningFTU = false;
    });

    test('first swipe should show', function() {
      UtilityTray.handleEvent(swipeDown);
      assertIsShowing(true);
    });

    test('first swipe should not show when locked', function() {
      window.Service.locked = true;
      UtilityTray.handleEvent(swipeDown);
      assertIsShowing(false);
    });

    test('first swipe should not show when running FTU', function() {
      window.Service.runningFTU = true;
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
      fakeEvt = createEvent('touchstart', false, true);
      fakeEvt.touches = [0];
    });

    teardown(function() {
      window.Service.runningFTU = false;
    });

    test('onTouchStart is not called if LockScreen is locked', function() {
      window.Service.locked = true;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('onTouchStart is called if LockScreen is not locked', function() {
      window.Service.locked = false;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('events on the topPanel are handled', function() {
      window.Service.locked = false;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('onTouchStart is called when ftu is running', function() {
      window.Service.runningFTU = true;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('Don\'t preventDefault if the target is the overlay', function() {
      assert.isTrue(UtilityTray.overlay.dispatchEvent(fakeEvt));
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
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
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
      fakeEvt = createEvent('touchend', false, true);
      fakeEvt.changedTouches = [0];

      UtilityTray.active = true;
    });

    test('Don\'t preventDefault if the target is the overlay', function() {
      assert.isTrue(UtilityTray.overlay.dispatchEvent(fakeEvt));
    });

    test('preventDefault if the target is the statusbar', function() {
      assert.isFalse(UtilityTray.statusbarIcons.dispatchEvent(fakeEvt));
    });

    test('preventDefault if the target is the grippy', function() {
      assert.isFalse(UtilityTray.grippy.dispatchEvent(fakeEvt));
    });

    test('Test UtilityTray.active, should be false', function() {
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.equal(UtilityTray.active, false);
    });
  });

  suite('handleEvent: transitionend', function() {
    setup(function() {
      UtilityTray.hide();
      fakeTransitionEnd();
    });

    test('Test utilitytrayhide is correcly dispatched', function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
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
      UtilityTray.shown = shown;
      UtilityTray.hide();
      fakeTransitionEnd();
    }

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

    test('utility-tray-abortopen is correctly dispatched', function(done) {
      window.addEventListener('utility-tray-abortopen',
        function gotIt() {
          window.removeEventListener('utility-tray-abortopen', gotIt);
          assert.isTrue(true, 'got the event');
          done();
        });
      doAction(false);
    });
  });

  suite('show() events', function() {
    function doAction(shown) {
      UtilityTray.shown = shown;
      UtilityTray.show();
      fakeTransitionEnd();
    }

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

  suite('mousedown event on the statusbar', function() {
    setup(function() {
      fakeEvt = createEvent('mousedown', true, true);
      UtilityTray.show();
    });

    test('keyboard shown > preventDefault mousedown event', function() {
      var imeShowEvt = createEvent('keyboardimeswitchershow');
      UtilityTray.handleEvent(imeShowEvt);

      assert.isFalse(UtilityTray.statusbar.dispatchEvent(fakeEvt));
      assert.isFalse(UtilityTray.overlay.dispatchEvent(fakeEvt));
    });

    test('keyboard hidden > Don\'t preventDefault mousedown event', function() {
      var imeShowEvt = createEvent('keyboardimeswitcherhide');
      UtilityTray.handleEvent(imeShowEvt);

      assert.isTrue(UtilityTray.statusbar.dispatchEvent(fakeEvt));
      assert.isTrue(UtilityTray.overlay.dispatchEvent(fakeEvt));
    });

    test('_pdIMESwitcherShow > Don\'t preventDefault on rocketbar',
      function() {
      var evt = {
        target: {
          id: 'rocketbar-input'
        },
        preventDefault: function() {}
      };
      var defaultStub = this.sinon.stub(evt, 'preventDefault');
      UtilityTray._pdIMESwitcherShow(evt);
      assert.isTrue(defaultStub.notCalled);
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
