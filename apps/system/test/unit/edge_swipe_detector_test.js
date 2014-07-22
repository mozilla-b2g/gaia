'use strict';
/* global Event */
/* global MocksHelper */
/* global HomescreenLauncher */
/* global EdgeSwipeDetector */
/* global MockSettingsListener */
/* global MockStackManager */
/* global MockSheetsTransition */
/* global MockTouchForwarder */

requireApp('system/js/edge_swipe_detector.js');

requireApp('system/test/unit/mock_sheets_transition.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_touch_forwarder.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_homescreen_launcher.js');
requireApp('system/test/unit/mock_ftu_launcher.js');

var mocksForEdgeSwipeDetector = new MocksHelper([
  'SheetsTransition',
  'StackManager',
  'SettingsListener',
  'TouchForwarder',
  'HomescreenLauncher',
  'FtuLauncher'
]).init();

suite('system/EdgeSwipeDetector >', function() {
  mocksForEdgeSwipeDetector.attachTestHelpers();
  var screen;

  setup(function() {
    window.homescreenLauncher = new HomescreenLauncher();
    window.homescreenLauncher.start();
    // DOM
    EdgeSwipeDetector.previous = document.createElement('div');
    EdgeSwipeDetector.previous.classList.add('gesture-panel');
    EdgeSwipeDetector.next = document.createElement('div');
    EdgeSwipeDetector.next.classList.add('gesture-panel');

    screen = document.createElement('div');
    screen.id = 'screen';
    EdgeSwipeDetector.screen = screen;
    EdgeSwipeDetector.init();
    MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
  });

  teardown(function() {
    window.homescreenLauncher = undefined;
  });

  var dialer = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    origin: 'app://communications.gaiamobile.org',
    manifestURL: 'app://communications.gaiamobile.org/dialer/manifest.webapp',
    name: 'Dialer',
    getTopMostWindow: function() {}
  };

  var ftu = {
    url: 'app://ftu.gaiamobile.org/index.html',
    origin: 'app://ftu.gaiamobile.org',
    manifestURL: 'app://ftu.gaiamobile.org/manifest.webapp',
    name: 'FTU'
  };

  function appLaunch(config) {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('launchapp', true, false, config);
    window.dispatchEvent(evt);
  }

  function homescreen() {
    window.dispatchEvent(new Event('homescreenopened'));
  }

  function cardsViewShowCard(position) {
    var cardClosedEvent =
      new CustomEvent('cardviewclosed',
                      { 'detail': { 'newStackPosition': position }});
    window.dispatchEvent(cardClosedEvent);
  }

  function launchTransitionEnd(config) {
    var evt = document.createEvent('CustomEvent');
    config || (config = dialer);
    evt.initCustomEvent('appopen', true, false, config);
    window.dispatchEvent(evt);
  }

  suite('When the homescreen is displayed', function() {
    setup(function() {
      EdgeSwipeDetector.previous.classList.remove('disabled');
      EdgeSwipeDetector.next.classList.remove('disabled');

      homescreen();
    });

    test('the edges should be disabled', function() {
      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('When the cardsview is displayed', function() {
    setup(function() {
      EdgeSwipeDetector.previous.classList.remove('disabled');
      EdgeSwipeDetector.next.classList.remove('disabled');

      // currently we always go to the homescreen before showing
      // the cards view. This test will fail when this behavior changes.
      homescreen();
    });

    test('the edges should be disabled', function() {
      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
    });

    test('after a card was shown from the cards view edges should be enabled',
         function() {
      cardsViewShowCard(1);
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('When an app is launched', function() {
    setup(function() {
      EdgeSwipeDetector.previous.classList.add('disabled');
      EdgeSwipeDetector.next.classList.add('disabled');
    });

    test('the edges should be enabled', function() {
      appLaunch(dialer);
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
    });

    suite('if the edges are disabled in the settings', function() {
      setup(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      });

      teardown(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      });

      test('the edges should not be enabled', function() {
        appLaunch(dialer);
        var previous = EdgeSwipeDetector.previous;
        assert.isTrue(previous.classList.contains('disabled'));
        assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
      });
    });

    test('the edges should be enabled if an app is launched from cards view',
    function() {
      launchTransitionEnd();
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
    });

    suite('in background', function() {
      setup(function() {
        dialer.stayBackground = true;
        appLaunch(dialer);
      });

      test('the edges should not be enabled', function() {
        var cssPrevious = EdgeSwipeDetector.previous.classList;
        assert.isTrue(cssPrevious.contains('disabled'));
        var cssNext = EdgeSwipeDetector.next.classList;
        assert.isTrue(cssNext.contains('disabled'));
      });
    });

    test('the edges should be disabled on the FTU', function() {
      launchTransitionEnd(ftu);
      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('When a wrapper is launched', function() {
    var google = {
      url: 'http://google.com/index.html',
      origin: 'http://google.com'
    };

    function wrapperLaunch(config) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('launchapp', true, false, config);
      window.dispatchEvent(evt);
    }

    setup(function() {
      EdgeSwipeDetector.previous.classList.add('disabled');
      EdgeSwipeDetector.next.classList.add('disabled');
    });

    test('the edges should be enabled', function() {
      wrapperLaunch(google);
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('When the setting is enabled', function() {
    setup(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      EdgeSwipeDetector.previous.classList.add('disabled');
      EdgeSwipeDetector.next.classList.add('disabled');

      appLaunch(dialer);
    });

    teardown(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
    });

    test('the edges should be enabled if an app is open', function() {
      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
    });

    test('the edges should not be enabled if the homescreen is open',
    function() {
      homescreen();
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);

      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('When the setting is disabled', function() {
    setup(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      EdgeSwipeDetector.previous.classList.remove('disabled');
      EdgeSwipeDetector.next.classList.remove('disabled');

      appLaunch(dialer);
    });

    teardown(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
    });

    test('the edges should be disabled', function() {
      assert.isFalse(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isFalse(EdgeSwipeDetector.next.classList.contains('disabled'));
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      assert.isTrue(EdgeSwipeDetector.previous.classList.contains('disabled'));
      assert.isTrue(EdgeSwipeDetector.next.classList.contains('disabled'));
    });
  });

  suite('Touch handling > ', function() {
    function fakeTouchDispatch(type, panel, xs, ys) {
      var touches = [];

      for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        var y = ys[i];
        var touch = document.createTouch(window, panel, 42, x, y,
                                         x, y, x, y,
                                         0, 0, 0, 0);
        touches.push(touch);
      }
      var touchList = document.createTouchList(touches);

      var eventTouches = (type == 'touchstart' || type == 'touchmove') ?
                          touchList : null;
      var eventChanged = (type == 'touchmove') ?
                          null : touchList;

      var e = document.createEvent('TouchEvent');
      e.initTouchEvent(type, true, true,
                       null, null, false, false, false, false,
                       eventTouches, null, eventChanged);

      panel.dispatchEvent(e);
      return e;
    }

    function touchStart(panel, xs, ys) {
      return fakeTouchDispatch('touchstart', panel, xs, ys);
    }

    function touchMove(panel, xs, ys) {
      return fakeTouchDispatch('touchmove', panel, xs, ys);
    }

    function touchEnd(panel, xs, ys) {
      return fakeTouchDispatch('touchend', panel, xs, ys);
    }

    function swipe(clock, panel, fromX, toX, fromY, toY, duration, noEnd) {
      var events = [];

      duration = duration || 350;
      events.push(touchStart(panel, [fromX], [fromY]));

      var diffX = Math.abs(toX - fromX);
      var diffY = Math.abs(toY - fromY);
      var delta = Math.max(diffX, diffY);

      var x = 0, y = 0;
      var tick = duration / delta;
      for (var i = 0; i < delta; i++) {
        var newX = fromX + x;
        var newY = fromY + y;

        events.push(touchMove(panel, [newX], [newY]));
        clock.tick(tick);

        if (newX < toX) {
          x++;
        }
        if (newX > toX) {
          x--;
        }
        if (newY < toY) {
          y++;
        }
        if (newY > toY) {
          y--;
        }
      }

      if (!noEnd) {
        events.push(touchEnd(panel, [toX], [toY]));
      }
      return events;
    }

    // Always pinch horizontally from the edges of the screen
    function pinch(clock, panel, toX, toY, duration) {
      var events = [];

      var screenWidth = window.innerWidth;

      duration = duration || 350;
      events.push(touchStart(panel, [0, screenWidth], [toY, toY]));

      var delta = Math.abs(toX);

      var x = 0;
      var tick = duration / delta;
      for (var i = 0; i < delta; i++) {
        events.push(touchMove(panel, [x, (screenWidth - x)], [toY, toY]));
        clock.tick(tick);

        if (x < toX) {
          x++;
        }
      }

      events.push(touchEnd(panel, [toX, toX], [toY, toY]));
      return events;
    }

    function fakeMouseDispatch(type, panel, x, y) {
      var e = document.createEvent('MouseEvent');

      e.initMouseEvent(type, true, true, window, 1, x, y, x, y,
                       false, false, false, false, 0, null);

      panel.dispatchEvent(e);
      return e;
    }

    var iframe;
    var panel;
    var width;

    setup(function() {
      iframe = this.sinon.stub();

      this.sinon.stub(dialer, 'getTopMostWindow').returns({
        iframe: iframe
      });

      this.sinon.stub(MockStackManager, 'getCurrent').returns(dialer);

      panel = EdgeSwipeDetector.previous;
      width = window.innerWidth;
      this.sinon.useFakeTimers();
    });

    suite('Event feast to prevent gecko reflows >', function() {
      test('it should prevent default on touch events', function() {
        var touchstart = touchStart(panel, [0], [100]);
        assert.isTrue(touchstart.defaultPrevented);

        var touchmove = touchMove(panel, [0], [100]);
        assert.isTrue(touchmove.defaultPrevented);

        var touchend = touchEnd(panel, [0], [100]);
        assert.isTrue(touchend.defaultPrevented);
      });

      test('it should prevent default on mouse events', function() {
        var mousedown = fakeMouseDispatch('mousedown', panel, 0, 100);
        assert.isTrue(mousedown.defaultPrevented);

        var mousemove = fakeMouseDispatch('mousemove', panel, 0, 100);
        assert.isTrue(mousemove.defaultPrevented);

        var mouseup = fakeMouseDispatch('mouseup', panel, 0, 100);
        assert.isTrue(mouseup.defaultPrevented);
      });
    });

    suite('During an edge swipe', function() {
      test('it should begin one transition', function() {
        var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
        swipe(this.sinon.clock, panel, 3, (width / 2), 240, 250);

        assert.isTrue(beginSpy.calledOnce);
      });

      test('it should compute the progress correctly', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        swipe(this.sinon.clock, panel, 0, (width / 2), 240, 250);

        assert.isTrue(moveSpy.lastCall.args[1] > 0.45);
        assert.isTrue(moveSpy.lastCall.args[1] < 0.55);

        swipe(this.sinon.clock, panel, 0, (width / 4), 240, 250);

        assert.isTrue(moveSpy.lastCall.args[1] > 0.20);
        assert.isTrue(moveSpy.lastCall.args[1] < 0.30);
      });

      suite('> direction detection', function() {
        test('> events from the previous panel should be ltr', function() {
          var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          swipe(this.sinon.clock, EdgeSwipeDetector.previous, 0, (width / 2),
                240, 250);

          assert.isTrue(beginSpy.calledWith('ltr'));
          assert.equal(moveSpy.lastCall.args[0], 'ltr');
        });

        test('> events from the next panel should be ltr', function() {
          var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          swipe(this.sinon.clock, EdgeSwipeDetector.next, 0, (width / 2),
                240, 250);

          assert.isTrue(beginSpy.calledWith('rtl'));
          assert.equal(moveSpy.lastCall.args[0], 'rtl');
        });
      });
    });

    suite('During a vertical swipe', function() {
      var halfScreen;

      setup(function() {
        halfScreen = Math.floor(window.innerHeight / 2);
      });

      test('it should not move the sheets', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen);
        assert.isFalse(moveSpy.called);
      });

      suite('as soon as we get a touchstart', function() {
        setup(function() {
          touchStart(panel, [12], [32]);
        });

        test('it should set the destination of the TouchForwarder', function() {
          assert.equal(EdgeSwipeDetector._touchForwarder.destination, iframe);
        });
      });

      test('it should forward the touchstart event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen);

        var call = fwSpy.firstCall;
        assert.equal(call.args[0], recvEvents[0]);
      });

      test('it should forward the touchmove events after a threshold',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen);

        var call = fwSpy.secondCall;
        assert.equal(call.args[0], recvEvents[10]);

        call = fwSpy.thirdCall;
        assert.equal(call.args[0], recvEvents[11]);
      });

      test('it should snap the sheets in place whithout waiting', function() {
        var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
        swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen,
              25, true /* no touchend */);
        assert.isTrue(snapSpy.calledOnce);
      });

      test('it should forward the touchend event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen);

        var call = fwSpy.lastCall;
        assert.equal(call.args[0], recvEvents[(recvEvents.length - 1)]);
      });
    });

    suite('During a 2 fingers pinch', function() {
      var centerX, centerY;

      setup(function() {
        centerX = Math.floor(window.innerWidth / 2);
        centerY = Math.floor(window.innerHeight / 2);
      });

      test('it should not move the sheets', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        pinch(this.sinon.clock, panel, centerX, centerY);
        assert.isFalse(moveSpy.called);
      });

      test('it should forward the touchstart event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = pinch(this.sinon.clock, panel, centerX, centerY);

        var call = fwSpy.firstCall;
        assert.equal(call.args[0], recvEvents[0]);
      });

      test('it should forward the touchmove events right away',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = pinch(this.sinon.clock, panel, centerX, centerY);

        var call = fwSpy.secondCall;
        assert.equal(call.args[0], recvEvents[1]);

        call = fwSpy.thirdCall;
        assert.equal(call.args[0], recvEvents[2]);
      });

      test('it should forward the touchend event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = pinch(this.sinon.clock, panel, centerX, centerY);

        var call = fwSpy.lastCall;
        assert.equal(call.args[0], recvEvents[(recvEvents.length - 1)]);
      });
    });

    suite('During a tap', function() {
      test('it should not move the sheets', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        swipe(this.sinon.clock, panel, 10, 10, 10, 10);
        assert.isFalse(moveSpy.called);
      });

      test('it should not move in the stack', function() {
        var backSpy = this.sinon.spy(MockStackManager, 'goNext');
        var fwSpy = this.sinon.spy(MockStackManager, 'goPrev');
        swipe(this.sinon.clock, panel, 10, 10, 10, 10);
        assert.isFalse(backSpy.called);
        assert.isFalse(fwSpy.called);
      });

      test('it should forward the touchstart event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 10, 10, 10, 10);

        this.sinon.clock.tick();

        var call = fwSpy.firstCall;
        assert.equal(call.args[0], recvEvents[0]);
      });

      test('it should forward the touchend event',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 10, 10, 10, 10);

        this.sinon.clock.tick();

        var call = fwSpy.lastCall;
        assert.equal(call.args[0], recvEvents[(recvEvents.length - 1)]);
      });
    });

    suite('During a long press', function() {
      function longPress(clock, panel, x, y) {
        var events = [];
        events.push(touchStart(panel, [x], [y]));
        clock.tick(500);
        events.push(touchEnd(panel, [x], [y]));
        return events;
      }

      test('it should not move the sheets', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        longPress(this.sinon.clock, panel, 10, 10);
        assert.isFalse(moveSpy.called);
      });

      test('it should forward the touchstart before the end of the press',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

        var receivedEvent = touchStart(panel, [10], [10]);
        this.sinon.clock.tick(500);

        var call = fwSpy.firstCall;
        assert.equal(call.args[0], receivedEvent);
      });

      test('it should not forward the touchstart event twice',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

        longPress(this.sinon.clock, panel, 10, 10);
        this.sinon.clock.tick(90);

        var call = fwSpy.getCall(1);
        assert.notEqual(call.args[0].type, 'touchstart');
      });

      test('it should not forward the touchend event twice',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

        longPress(this.sinon.clock, panel, 10, 10);
        this.sinon.clock.tick(90);

        var call = fwSpy.getCall(fwSpy.callCount - 2);
        assert.notEqual(call.args[0].type, 'touchend');
      });

      test('it should forward the touchend event',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

        var recvEvents = longPress(this.sinon.clock, panel, 10, 10);

        var call = fwSpy.lastCall;
        assert.equal(call.args[0], recvEvents[(recvEvents.length - 1)]);
      });
    });

    suite('Snaping >', function() {
      suite('when the progress was < 20%', function() {
        test('it should snap the sheets in place', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
          swipe(this.sinon.clock, panel, 3, (width / 8), 240, 250);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, 3, (width / 8), 240, 250);
          assert.isTrue(snapSpy.calledBefore(endSpy));
        });

        suite('but there is inertia', function() {
          test('it should snap the sheets back', function() {
            var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 250, 100);
            assert.isTrue(snapSpy.calledOnce);
          });

          test('it should pass the speed to snapBack', function() {
            var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 250, 100);

            var givenSpeed = snapSpy.firstCall.args[0];

            assert.isTrue(givenSpeed > 0.0010);
            assert.isTrue(givenSpeed < 0.0020);
          });

          test('it should go back in the stack',
          function() {
            var goSpy = this.sinon.spy(MockStackManager, 'goPrev');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 250, 100);
            assert.isTrue(goSpy.calledOnce);
          });
        });
      });

      suite('when the progress was > 20% ltr', function() {
        test('it should snap the sheets back', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 250);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should pass the speed to snapBack', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 250);

          var givenSpeed = snapSpy.firstCall.args[0];

          assert.isTrue(givenSpeed > 0.0009);
          assert.isTrue(givenSpeed < 0.0024);
        });

        test('it should snap go back in the stack',
        function() {
          var goSpy = this.sinon.spy(MockStackManager, 'goPrev');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 250);
          assert.isTrue(goSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 250);
          assert.isTrue(snapSpy.calledBefore(endSpy));
        });
      });

      suite('when the progress was > 20% rtl', function() {
        setup(function() {
          panel = EdgeSwipeDetector.next;
        });

        test('it should snap the sheets forward', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 250);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should pass the speed to snapForward', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 250);

          var givenSpeed = snapSpy.firstCall.args[0];

          assert.isTrue(givenSpeed > 0.0009);
          assert.isTrue(givenSpeed < 0.0024);
        });

        test('it should snap go forward in the stack',
        function() {
          var goSpy = this.sinon.spy(MockStackManager, 'goNext');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 250);
          assert.isTrue(goSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 250);
          assert.isTrue(snapSpy.calledBefore(endSpy));
        });
      });
    });
  });

  suite('Debug mode', function() {
    test('Turning it on should add the class', function() {
      screen.classList.remove('edges-debug');
      MockSettingsListener.mCallbacks['edgesgesture.debug'](true);
      assert.isTrue(screen.classList.contains('edges-debug'));
    });

    test('Turning it off should remove the class', function() {
      screen.classList.add('edges-debug');
      MockSettingsListener.mCallbacks['edgesgesture.debug'](false);
      assert.isFalse(screen.classList.contains('edges-debug'));
    });
  });
});
