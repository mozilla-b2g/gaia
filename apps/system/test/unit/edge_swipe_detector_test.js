'use strict';
/* global Event */
/* global MocksHelper */
/* global EdgeSwipeDetector */
/* global MockSettingsListener */
/* global MockStackManager */
/* global MockSheetsTransition */
/* global MockTouchForwarder */
/* global MockService */
/* global MockAppWindow */

requireApp('system/js/edge_swipe_detector.js');

requireApp('system/test/unit/mock_sheets_transition.js');
requireApp('system/test/unit/mock_stack_manager.js');
requireApp('system/test/unit/mock_touch_forwarder.js');
requireApp('system/test/unit/mock_app_window.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForEdgeSwipeDetector = new MocksHelper([
  'SheetsTransition',
  'StackManager',
  'SettingsListener',
  'Service',
  'TouchForwarder'
]).init();

suite('system/EdgeSwipeDetector >', function() {
  mocksForEdgeSwipeDetector.attachTestHelpers();
  var screen;
  var subject;

  var _devicePixelRatio = window.devicePixelRatio;

  setup(function() {
    home = new MockAppWindow();
    home.isHomescreen = true;

    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1
    });
    subject = new EdgeSwipeDetector();

    // DOM
    subject.previous = document.createElement('div');
    subject.previous.classList.add('gesture-panel');
    subject.next = document.createElement('div');
    subject.next.classList.add('gesture-panel');

    screen = document.createElement('div');
    screen.id = 'screen';
    subject.screen = screen;
    subject.start();
    MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
  });

  teardown(function() {
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: _devicePixelRatio
    });
  });

  var dialer = {
    url: 'app://communications.gaiamobile.org/dialer/index.html',
    origin: 'app://communications.gaiamobile.org',
    manifestURL: 'app://communications.gaiamobile.org/dialer/manifest.webapp',
    name: 'Dialer',
    getTopMostWindow: function() {}
  };

  var home;

  function homescreen() {
    MockService.mockQueryWith('getTopMostWindow', home);
    MockService.mockQueryWith('getTopMostUI', { name: 'AppWindowManager' });
    window.dispatchEvent(new Event('hierarchytopmostwindowchanged', {
      detail: home
    }));
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
    evt.initCustomEvent('appopened', true, false, config);
    window.dispatchEvent(evt);
  }

  function launchEvent(type) {
    window.dispatchEvent(new CustomEvent(type));
  }

  suite('When the homescreen is displayed', function() {
    setup(function() {
      subject.previous.classList.remove('disabled');
      subject.next.classList.remove('disabled');

      homescreen();
    });

    test('the edges should be disabled', function() {
      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
    });
  });

  suite('When the cardsview is displayed', function() {
    setup(function() {
      subject.previous.classList.remove('disabled');
      subject.next.classList.remove('disabled');

      // currently we always go to the homescreen before showing
      // the cards view. This test will fail when this behavior changes.
      homescreen();
    });

    test('the edges should be disabled', function() {
      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
    });

    test('after a card was shown from the cards view edges should be enabled',
         function() {
      cardsViewShowCard(1);
      assert.isFalse(subject.previous.classList.contains('disabled'));
      assert.isFalse(subject.next.classList.contains('disabled'));
    });
  });

  suite('When an app is launched', function() {
    setup(function() {
      subject.previous.classList.add('disabled');
      subject.next.classList.add('disabled');
    });

    test('the edges should be enabled', function() {
      launchTransitionEnd(dialer);
      assert.isFalse(subject.previous.classList.contains('disabled'));
      assert.isFalse(subject.next.classList.contains('disabled'));
    });

    suite('if the edges are disabled in the settings', function() {
      setup(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      });

      teardown(function() {
        MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      });

      test('the edges should not be enabled', function() {
        launchTransitionEnd(dialer);
        var previous = subject.previous;
        assert.isTrue(previous.classList.contains('disabled'));
        assert.isTrue(subject.next.classList.contains('disabled'));
      });
    });

    test('the edges should be enabled if an app is launched from cards view',
    function() {
      launchTransitionEnd();
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      assert.isFalse(subject.previous.classList.contains('disabled'));
      assert.isFalse(subject.next.classList.contains('disabled'));
    });

    suite('in background', function() {
      setup(function() {
        dialer.stayBackground = true;
        launchTransitionEnd(dialer);
      });

      test('the edges should not be enabled', function() {
        var cssPrevious = subject.previous.classList;
        assert.isTrue(cssPrevious.contains('disabled'));
        var cssNext = subject.next.classList;
        assert.isTrue(cssNext.contains('disabled'));
      });
    });

    test('the edges should be disabled on the FTU', function() {
      MockService.mockQueryWith('isFtuRunning', true);
      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
    });
  });

  suite('When the setting is enabled', function() {
    setup(function() {
      subject.lifecycleEnabled = true;
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      subject.previous.classList.add('disabled');
      subject.next.classList.add('disabled');

      launchTransitionEnd(dialer);
    });

    teardown(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
    });

    test('the edges should be enabled if an app is open', function() {
      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      assert.isFalse(subject.previous.classList.contains('disabled'));
      assert.isFalse(subject.next.classList.contains('disabled'));
    });

    test('the edges should not be enabled if the homescreen is open',
    function() {
      homescreen();
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);

      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
    });
  });

  suite('When the setting is disabled', function() {
    setup(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
      subject.previous.classList.remove('disabled');
      subject.next.classList.remove('disabled');

      launchTransitionEnd(dialer);
    });

    teardown(function() {
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](true);
    });

    test('the edges should be disabled', function() {
      assert.isFalse(subject.previous.classList.contains('disabled'));
      assert.isFalse(subject.next.classList.contains('disabled'));
      MockSettingsListener.mCallbacks['edgesgesture.enabled'](false);
      assert.isTrue(subject.previous.classList.contains('disabled'));
      assert.isTrue(subject.next.classList.contains('disabled'));
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

      panel = subject.previous;
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
        swipe(this.sinon.clock, panel, 3, (width / 2), 240, 240);

        assert.isTrue(beginSpy.calledOnce);
      });

      suite('if we are outside the app frame', function() {
        var nextPanel;

        setup(function() {
          MockService.mockQueryWith('LayoutManager.width', width - 50);
          nextPanel = subject.next;
        });

        test('it should not move the sheets', function() {
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          swipe(this.sinon.clock, nextPanel, width, (width - 50),
                240, 240);
          assert.isTrue(moveSpy.notCalled);
        });

        test('it should continue redispatching the whole gesture',
        function() {
          var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

          swipe(this.sinon.clock, nextPanel, width, width, 240, 240, true);
          this.sinon.clock.tick();
          touchMove(panel, [(width / 2)], [240]);
          this.sinon.clock.tick();
          touchEnd(panel, [(width / 2)], [240]);

          assert.isTrue(fwSpy.notCalled);
        });
      });

      suite('if the edge are disabled mid way', function() {
        test('it should snap in place', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
          swipe(this.sinon.clock, panel, 0, 2, 240, 240, true);
          launchEvent('installprompthidden');
          assert.isTrue(snapSpy.calledOnce);
        });

        test('and ignore the rest of the gesture', function() {
          swipe(this.sinon.clock, panel, 0, 2, 240, 240, 10, true);
          launchEvent('installpromptshown');
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          this.sinon.clock.tick(1);
          touchMove(panel, [width / 2], [240]);
          assert.isTrue(moveSpy.notCalled);
        });
      });

      test('it should compute the progress correctly', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');

        swipe(this.sinon.clock, panel, 0, (width / 2), 240, 240);

        assert.isTrue(moveSpy.lastCall.args[1] > 0.45);
        assert.isTrue(moveSpy.lastCall.args[1] < 0.55);

        swipe(this.sinon.clock, panel, 0, (width / 4), 240, 240);

        assert.isTrue(moveSpy.lastCall.args[1] > 0.20);
        assert.isTrue(moveSpy.lastCall.args[1] < 0.30);
      });

      suite('> direction detection', function() {
        test('> events from the previous panel should be ltr', function() {
          var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          swipe(this.sinon.clock, subject.previous, 0, (width / 2),
                240, 240);

          assert.isTrue(beginSpy.calledWith('ltr'));
          assert.equal(moveSpy.lastCall.args[0], 'ltr');
        });

        test('> events from the next panel should be rtl', function() {
          var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          swipe(this.sinon.clock, subject.next, width, (width / 2),
                240, 240);

          assert.isTrue(beginSpy.calledWith('rtl'));
          assert.equal(moveSpy.lastCall.args[0], 'rtl');
        });
      });
    });

    suite('Going back and forth', function() {
      test('it should continue moving even outside of the app', function() {
        var nextPanel = subject.next;
        MockService.mockQueryWith('LayoutManager.width', width - 50);
        swipe(this.sinon.clock, nextPanel, width, (width / 2),
              240, 240, true);
        this.sinon.clock.tick();

        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        touchMove(nextPanel, [(width - 25)], [250]);
        this.sinon.clock.tick();
        touchEnd(nextPanel, [(width - 25)], [250]);
        assert.isTrue(moveSpy.calledOnce);
      });

      test('it should not move back when the progress becomes negative',
      function() {
        var nextPanel = subject.next;
        MockService.mockQueryWith('LayoutManager.width', width - 50);
        swipe(this.sinon.clock, nextPanel, (width - 40), (width / 2),
              240, 240, true);
        this.sinon.clock.tick();

        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');

        // Finishing farther on the right of where we started
        touchMove(nextPanel, [(width - 25)], [240]);
        this.sinon.clock.tick();
        touchEnd(nextPanel, [(width - 25)], [240]);

        sinon.assert.notCalled(moveSpy);
      });

      test('it should never forward a tap', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');

        swipe(this.sinon.clock, panel, 0, (width / 2),
              240, 240, true);
        this.sinon.clock.tick();

        // Finishing exactly where we started
        touchMove(panel, [0], [250]);
        this.sinon.clock.tick();
        touchEnd(panel, [0], [250]);

        assert.isTrue(fwSpy.notCalled);
      });
    });

    suite('During a vertical swipe', function() {
      var halfScreen, verticalSwipe, verticalSwipeInward;

      setup(function() {
        halfScreen = Math.floor(window.innerHeight / 2);
        verticalSwipe = (function() {
          return swipe(this.sinon.clock, panel, 3, 7, 20, halfScreen);
        }).bind(this);
        verticalSwipeInward = (function() {
          return swipe(this.sinon.clock, panel, 7, 3, 20, halfScreen);
        }).bind(this);
      });

      test('it should not move the sheets', function() {
        var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
        verticalSwipe();
        assert.isFalse(moveSpy.called);
      });

      suite('as soon as we get a touchstart', function() {
        setup(function() {
          touchStart(panel, [12], [32]);
        });

        test('it should set the destination of the TouchForwarder', function() {
          assert.equal(subject._touchForwarder.destination, iframe);
        });
      });

      test('it should forward the touchstart event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = verticalSwipe();

        var call = fwSpy.firstCall;
        assert.equal(call.args[0], recvEvents[0]);
      });

      test('it should forward the touchmove events after a threshold',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = verticalSwipe();

        var call = fwSpy.secondCall;
        assert.equal(call.args[0], recvEvents[7]);

        call = fwSpy.thirdCall;
        assert.equal(call.args[0], recvEvents[8]);
      });

      test('it should still forward touch move for inward swipes',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = verticalSwipeInward();

        var call = fwSpy.secondCall;
        assert.equal(call.args[0], recvEvents[7]);

        call = fwSpy.thirdCall;
        assert.equal(call.args[0], recvEvents[8]);
      });

      test('not horizontal anymore, should snap the sheets', function() {
        var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
        swipe(this.sinon.clock, panel, 3, 17, 20, halfScreen,
              25, true /* no touchend */);
        assert.isTrue(snapSpy.calledOnce);
      });

      test('it should forward the touchend event', function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = verticalSwipe();

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

      suite('if it\'s actually a two fingers tap', function() {
        var gesture;
        setup(function() {
          var screenWidth = window.innerWidth;
          gesture = (function() {
            touchStart(panel, [screenWidth], [100, 100]);
            this.sinon.clock.tick();
            touchStart(panel, [0], [100, 100]);
            this.sinon.clock.tick();
            touchEnd(panel, [(screenWidth - 2), 2], [100, 100]);
            this.sinon.clock.tick();
            touchEnd(panel, [2], [100, 100]);
            this.sinon.clock.tick();
          }).bind(this);
        });

        test('it should not move the sheets', function() {
          var moveSpy = this.sinon.spy(MockSheetsTransition, 'moveInDirection');
          gesture();
          assert.isFalse(moveSpy.called);
        });

        test('it should not move in the stack', function() {
          var backSpy = this.sinon.spy(MockStackManager, 'goNext');
          var fwSpy = this.sinon.spy(MockStackManager, 'goPrev');
          gesture();
          assert.isFalse(backSpy.called);
          assert.isFalse(fwSpy.called);
        });
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
      test('it should not begin a transition', function() {
        var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
        swipe(this.sinon.clock, panel, 10, 10, 10, 10);
        assert.isFalse(beginSpy.called);
      });

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

      test('it should forward the touchend event after a timeout',
      function() {
        var fwSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
        var recvEvents = swipe(this.sinon.clock, panel, 10, 10, 10, 10);

        this.sinon.clock.tick(101);

        var call = fwSpy.lastCall;
        assert.equal(call.args[0], recvEvents[(recvEvents.length - 1)]);
      });

      suite('if the tap is outside the app', function() {
        setup(function() {
          MockService.mockQueryWith('LayoutManager.width', width - 50);
        });

        test('should redispatch the touch events to the system app',
        function(done) {
          var redispatched = [];
          window.addEventListener('edge-touch-redispatch', function receive(e) {
            redispatched.push(e.detail);
            if (redispatched.length < 2) {
              return;
            }

            window.removeEventListener('edge-touch-redispatch', receive);
            assert.equal(redispatched[0].type, 'touchstart');
            assert.equal(redispatched[1].type, 'touchend');
            done();
          });

          swipe(this.sinon.clock, subject.next, width, width,
                240, 240);
          this.sinon.clock.tick(300);
        });

        suite('if the app is fullscreen_layout', function() {
          setup(function() {
            MockService.mockQueryWith('getTopMostWindow', {
              isFullScreenLayout: function() {
                return true;
              }
            });
            MockService.mockQueryWith('LayoutManager.width', width);
            MockService.mockQueryWith('SoftwareButtonManager.width', 50);
          });

          test('it should take the software home button into account',
          function(done) {
            var redispatched = [];
            window.addEventListener('edge-touch-redispatch', function recv(e) {
              redispatched.push(e.detail);
              if (redispatched.length < 2) {
                return;
              }

              window.removeEventListener('edge-touch-redispatch', recv);
              assert.equal(redispatched[0].type, 'touchstart');
              assert.equal(redispatched[1].type, 'touchend');
              done();
            });

            swipe(this.sinon.clock, subject.next, width, width,
                  240, 240);
            this.sinon.clock.tick(300);
          });
        });
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
          swipe(this.sinon.clock, panel, 3, (width / 8), 240, 240);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapInPlace');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, 3, (width / 8), 240, 240);
          assert.isTrue(snapSpy.calledBefore(endSpy));
        });

        suite('but there is inertia', function() {
          test('it should snap the sheets back', function() {
            var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 240, 100);
            assert.isTrue(snapSpy.calledOnce);
          });

          test('it should pass the speed to snapBack', function() {
            var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 240, 100);

            var givenSpeed = snapSpy.firstCall.args[0];

            assert.isTrue(givenSpeed > 0.0010);
            assert.isTrue(givenSpeed < 0.0020);
          });

          test('it should go back in the stack',
          function() {
            var goSpy = this.sinon.spy(MockStackManager, 'goPrev');
            swipe(this.sinon.clock, panel, 3, (width / 8), 240, 240, 100);
            assert.isTrue(goSpy.calledOnce);
          });
        });
      });

      suite('when the progress was > 20% ltr', function() {
        test('it should snap the sheets back', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 240);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should pass the speed to snapBack', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 240);

          var givenSpeed = snapSpy.firstCall.args[0];

          assert.isTrue(givenSpeed > 0.0009);
          assert.isTrue(givenSpeed < 0.0024);
        });

        test('it should snap go back in the stack',
        function() {
          var goSpy = this.sinon.spy(MockStackManager, 'goPrev');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 240);
          assert.isTrue(goSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, 3, (width / 1.4), 240, 240);
          assert.isTrue(snapSpy.calledBefore(endSpy));
        });
      });

      suite('when the progress was > 20% rtl', function() {
        setup(function() {
          panel = subject.next;
        });

        test('it should snap the sheets forward', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 240);
          assert.isTrue(snapSpy.calledOnce);
        });

        test('it should pass the speed to snapForward', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 240);

          var givenSpeed = snapSpy.firstCall.args[0];

          assert.isTrue(givenSpeed > 0.0009);
          assert.isTrue(givenSpeed < 0.0024);
        });

        test('it should snap go forward in the stack',
        function() {
          var goSpy = this.sinon.spy(MockStackManager, 'goNext');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 240);
          assert.isTrue(goSpy.calledOnce);
        });

        test('it should snap before we end the sheets transition', function() {
          var snapSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
          var endSpy = this.sinon.spy(MockSheetsTransition, 'end');
          swipe(this.sinon.clock, panel, width, (width / 2.5), 240, 240);
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

  suite('handleEvent: accessibility-control', function() {
    setup(function() {
      subject.lifecycleEnabled = true;
    });

    test('edge-swipe-right should do an ltr autoSwipe', function() {
      var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
      var snapBackSpy = this.sinon.spy(MockSheetsTransition, 'snapBack');
      var prevSpy = this.sinon.spy(MockStackManager, 'goPrev');
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'accessibility-control',
          details: JSON.stringify({ eventType: 'edge-swipe-right' })
        }
      });
      window.dispatchEvent(evt);
      assert.isTrue(beginSpy.calledWith('ltr'));
      assert.isTrue(snapBackSpy.calledWith(1));
      assert.isTrue(prevSpy.calledOnce);
    });

    test('edge-swipe-left should do an rtl autoSwipe', function() {
      var beginSpy = this.sinon.spy(MockSheetsTransition, 'begin');
      var snapForwardSpy = this.sinon.spy(MockSheetsTransition, 'snapForward');
      var nextSpy = this.sinon.spy(MockStackManager, 'goNext');
      var evt = new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'accessibility-control',
          details: JSON.stringify({ eventType: 'edge-swipe-left' })
        }
      });
      window.dispatchEvent(evt);
      assert.isTrue(beginSpy.calledWith('rtl'));
      assert.isTrue(snapForwardSpy.calledWith(1));
      assert.isTrue(nextSpy.calledOnce);
    });

    teardown(function() {
      subject.lifecycleEnabled = false;
    });
  });

  suite('Test hierarchy changed event', function() {
    test('Hierarchy top most ui is appWindowManager', function() {
      MockService.mockQueryWith('getTopMostUI', {
        name: 'AppWindowManager'
      });
      MockService.mockQueryWith('getTopMostWindow', { isHomescreen: false});
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      assert.isTrue(subject.lifecycleEnabled);
    });

    test('Hierarchy top most ui is not appWindowManager', function() {
      MockService.mockQueryWith('getTopMostUI', {
        name: 'Rocketbar'
      });
      window.dispatchEvent(new CustomEvent('hierarchychanged'));
      assert.isFalse(subject.lifecycleEnabled);
    });
  });

  suite('handleEvent: prompt events', function() {
    setup(function() {
      subject.lifecycleEnabled = true;
      MockService.mockQueryWith('getTopMostWindow', {
        isHomescreen: false
      });
    });

    teardown(function() {
      subject.lifecycleEnabled = false;
    });

    function testLifecycleEvents(opt) {
      test('the edges should be disabled on ' + opt.on, function() {
        launchEvent(opt.on);
        assert.isTrue(subject.previous.classList.contains('disabled'));
        assert.isTrue(subject.next.classList.contains('disabled'));
      });

      test('the edges should be enabled on ' + opt.off, function() {
        launchEvent(opt.off);
        assert.isFalse(subject.previous.classList.contains('disabled'));
        assert.isFalse(subject.next.classList.contains('disabled'));
      });

      test('the edges should stay disabled when homescreen is active',
        function() {
          subject.lifecycleEnabled = false;
          MockService.mockQueryWith('getTopMostWindow').isHomescreen = true;
          launchEvent(opt.on);
          assert.isTrue(subject.previous.classList.contains('disabled'));
          assert.isTrue(subject.next.classList.contains('disabled'));
          launchEvent(opt.off);
          assert.isTrue(subject.previous.classList.contains('disabled'));
          assert.isTrue(subject.next.classList.contains('disabled'));
      });
    }

    testLifecycleEvents({
      on: 'updatepromptshown',
      off: 'updateprompthidden'
    });
    testLifecycleEvents({
      on: 'installpromptshown',
      off: 'installprompthidden'
    });
    testLifecycleEvents({
      on: 'shrinking-start',
      off: 'shrinking-stop'
    });
  });

});
