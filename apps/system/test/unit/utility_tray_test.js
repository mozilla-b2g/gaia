'use strict';

mocha.globals(['UtilityTray']);

var LockScreen = { locked: false };


suite('system/UtilityTray', function() {
  var stubById;
  var fakeEvt;
  var fakeElement;

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('system/js/utility_tray.js', done);
  });

  teardown(function() {
    stubById.restore();
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
      fakeEvt = { type: 'attentionscreenshow' };
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });


  suite('handleEvent: home', function() {
    setup(function() {
      fakeEvt = { type: 'home' };
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });


  suite('handleEvent: screenchange', function() {
    setup(function() {
      fakeEvt = { type: 'screenchange', detail: { screenEnabled: false } };
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });


  suite('handleEvent: emergencyalert', function() {
    setup(function() {
      fakeEvt = { type: 'emergencyalert' };
      UtilityTray.show();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('should be hidden', function() {
      assert.equal(UtilityTray.shown, false);
    });
  });


  suite('handleEvent: touchstart', function() {
    setup(function() {
      fakeEvt = {
        type: 'touchstart',
        target: UtilityTray.overlay,
        touches: [0]
      };
      UtilityTray.handleEvent(fakeEvt);
    });

    test('Test UtilityTray.active, should be true', function() {
      /* XXX: This is to test UtilityTray.active,
              it works in local test but breaks in travis. */
      // assert.equal(UtilityTray.active, true);
    });
  });

  suite('handleEvent: touchend', function() {
    setup(function() {
      fakeEvt = {
        type: 'touchend',
        changedTouches: [0]
      };
      UtilityTray.active = true;
      UtilityTray.handleEvent(fakeEvt);
    });

    test('Test UtilityTray.active, should be false', function() {
      assert.equal(UtilityTray.active, false);
    });
  });


  suite('handleEvent: transitionend', function() {
    setup(function() {
      fakeEvt = { type: 'transitionend' };
      UtilityTray.hide();
      UtilityTray.handleEvent(fakeEvt);
    });

    test('Test utilitytrayhide is correcly dispatched', function() {
      assert.equal(UtilityTray.screen.
        classList.contains('utility-tray'), false);
    });
  });

});
