'use strict';

requireApp('system/test/unit/mock_rocketbar.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
mocha.globals(['UtilityTray', 'Rocketbar', 'lockScreen']);

requireApp('system/test/unit/mock_lock_screen.js');

var mocksHelperForUtilityTray = new MocksHelper([
  'Rocketbar',
  'LazyLoader'
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

  function fakeTouches(start, end) {
    UtilityTray.onTouchStart({ pageY: start });
    UtilityTray.screenHeight = 480;

    var y = start;
    while (y != end) {
      UtilityTray.onTouchMove({ pageY: y });

      if (y < end) {
        y++;
      } else {
        y--;
      }
    }
    UtilityTray.onTouchEnd();
  }

  setup(function(done) {
    window.lockScreen = window.MockLockScreen;
    originalLocked = window.lockScreen.locked;
    window.lockScreen.locked = false;
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('system/js/utility_tray.js', done);
  });

  teardown(function() {
    stubById.restore();
    window.lockScreen.locked = originalLocked;
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
    });

    suite('hiding', function() {
      setup(function() {
        UtilityTray.show();
      });

      test('should not be hidden by a tap', function() {
        fakeTouches(480, 475);
        assert.equal(UtilityTray.shown, true);
      });

      test('should be hidden by a drag from the bottom', function() {
        fakeTouches(480, 380);
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


  suite('handleEvent: touchstart', function() {
    mocksHelperForUtilityTray.attachTestHelpers();
    setup(function() {
      fakeEvt = createEvent('touchstart');
      fakeEvt.touches = [0];
    });

    test('onTouchStart is not called if LockScreen is locked', function() {
      window.lockScreen.locked = true;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbar.dispatchEvent(fakeEvt);
      assert.ok(stub.notCalled);
    });

    test('onTouchStart is called if LockScreen is not locked', function() {
      window.lockScreen.locked = false;
      var stub = this.sinon.stub(UtilityTray, 'onTouchStart');
      UtilityTray.statusbar.dispatchEvent(fakeEvt);
      assert.ok(stub.calledOnce);
    });

    test('Test UtilityTray.active, should be true', function() {
      /* XXX: This is to test UtilityTray.active,
              it works in local test but breaks in travis. */
      // assert.equal(UtilityTray.active, true);
    });
  });

  suite('handleEvent: touchend', function() {
    setup(function() {
      fakeEvt = createEvent('touchend');
      fakeEvt.changedTouches = [0];

      UtilityTray.active = true;
      UtilityTray.statusbar.dispatchEvent(fakeEvt);
    });

    test('Test UtilityTray.active, should be false', function() {
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

  suite('onTouchStart: rocketbar logic', function() {

    var overlayStub, uHideStub, rBarRenderStub;

    setup(function() {
      overlayStub = this.sinon
        .stub(UtilityTray.overlay, 'getBoundingClientRect')
        .returns({width: 100, height: 100});
      rBarRenderStub = this.sinon.stub(Rocketbar, 'render');
      uHideStub = this.sinon.stub(UtilityTray, 'hide');
      Rocketbar.enabled = true;
    });

    teardown(function() {
      overlayStub.restore();
      rBarRenderStub.restore();
      uHideStub.restore();
    });

    test('should display for drag on left half of statusbar', function() {
      fakeEvt = createEvent('touchend');
      fakeEvt.changedTouches = [{ pageX: 0 }];

      UtilityTray.onTouchStart(fakeEvt);
      UtilityTray.shown = false;
      UtilityTray.active = false;
      UtilityTray.handleEvent(fakeEvt);
      assert.isTrue(rBarRenderStub.calledOnce);
    });

    test('does not render if utility tray not active', function() {
      fakeEvt = createEvent('touchend');
      fakeEvt.changedTouches = [{ pageX: 0 }];
      UtilityTray.onTouchStart(fakeEvt);
      UtilityTray.shown = false;
      UtilityTray.active = true;
      UtilityTray.handleEvent(fakeEvt);
      assert.isTrue(rBarRenderStub.notCalled);
    });

    test('should not show if we touch to the right', function() {
      fakeEvt = createEvent('touchstart');
      fakeEvt.pageX = 70;

      UtilityTray.onTouchStart(fakeEvt);
      assert.isTrue(rBarRenderStub.notCalled);
      assert.isTrue(uHideStub.notCalled);
    });


    test('should not show if we touch the open statusbar', function() {
      fakeTouches(0, 100);
      assert.equal(UtilityTray.shown, true);

      fakeEvt = createEvent('touchstart');
      fakeEvt.pageX = 0;

      UtilityTray.onTouchStart(fakeEvt);
      assert.isTrue(rBarRenderStub.notCalled);
    });
  });

});
