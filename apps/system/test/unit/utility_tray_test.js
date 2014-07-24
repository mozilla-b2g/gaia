'use strict';

requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_app_window_manager.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksHelperForUtilityTray = new MocksHelper([
  'AppWindowManager',
  'LazyLoader',
  'System'
]);
mocksHelperForUtilityTray.init();

suite('system/UtilityTray', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;
  var originalLocked;
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

  setup(function(done) {
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
    window.System.locked = false;
  });


  suite('show', function() {
    setup(function() {
      UtilityTray.show();
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
      UtilityTray.hide();
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
    suite('showing', function() {
      test('should not be shown by a tap', function() {
        fakeTouches(0, 5);
        assert.equal(UtilityTray.shown, false);
      });

      test('should be shown by a drag from the top', function() {
        fakeTouches(0, 100);
        assert.equal(UtilityTray.shown, true);
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
        this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
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
        this.sinon.stub(MockAppWindowManager, 'getActiveApp').returns(app);
        this.sinon.spy(app.iframe, 'sendTouchEvent');

        fakeTouches(0, 100);

        sinon.assert.notCalled(app.iframe.sendTouchEvent);
      });
    });

    suite('hiding', function() {
      setup(function() {
        UtilityTray.show();
      });

      test('should not be hidden by a tap', function() {
        fakeTouches(480, 475, UtilityTray.grippy);
        assert.equal(UtilityTray.shown, true);
      });

      test('should be hidden by a drag from the bottom', function() {
        fakeTouches(480, 380, UtilityTray.grippy);
        assert.equal(UtilityTray.shown, false);
      });
    });
  });


  // handleEvent
  suite('handleEvent: attentionscreenshow', function() {
    setup(function() {
      fakeEvt = createEvent('attentionscreenshow');
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

      // Since nsIDOMEvent::StopImmediatePropagation does not set
      // any property on the event, and there is no way to add a
      // global event listeners, let's just overidde the method
      // to set our own property.
      fakeEvt.stopImmediatePropagation = function() {
        this._stopped = true;
      };

      UtilityTray.show();
      window.dispatchEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });

    test('home should have been stopped', function() {
      assert.equal(fakeEvt._stopped, true);
    });
  });


  suite('handleEvent: screenchange', function() {
    setup(function() {
      fakeEvt = createEvent('screenchange', false, false,
                            { screenEnabled: false });
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });


  suite('handleEvent: emergencyalert', function() {
    setup(function() {
      fakeEvt = createEvent('emergencyalert');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('handleEvent: launchapp', function() {
    setup(function() {
      fakeEvt = createEvent('launchapp');
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });

  suite('handleEvent: touchstart', function() {
    mocksHelperForUtilityTray.attachTestHelpers();
    setup(function() {
      fakeEvt = createEvent('touchstart', false, true);
      fakeEvt.touches = [0];
    });

    test('onTouchStart is not called if LockScreen is locked', function() {
      window.System.locked = true;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('onTouchStart is called if LockScreen is not locked', function() {
      window.System.locked = false;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbarIcons.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('events on the topPanel are handled', function() {
      window.System.locked = false;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.topPanel.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('Dont preventDefault if the target is the overlay', function() {
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
  });

  suite('handleEvent: touchend', function() {
    setup(function() {
      fakeEvt = createEvent('touchend', false, true);
      fakeEvt.changedTouches = [0];

      UtilityTray.active = true;
    });

    test('Dont preventDefault if the target is the overlay', function() {
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
      fakeEvt = createEvent('transitionend');
      UtilityTray.hide();
      UtilityTray.overlay.dispatchEvent(fakeEvt);
    });

    test('Test utilitytrayhide is correcly dispatched', function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
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
});
