/* global MockAppWindow, AppStatusbar, MocksHelper, MockTouchForwarder */
'use strict';

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_app_window.js');
require('/test/unit/mock_touch_forwarder.js');
requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/app_statusbar.js');

var mocksForAppStatusbar = new MocksHelper([
  'AppWindow',
  'TouchForwarder'
]).init();

suite('system/AppStatusbar', function() {
  mocksForAppStatusbar.attachTestHelpers();
  var app;
  var subject;
  setup(function() {
    this.sinon.useFakeTimers();
    app = new MockAppWindow({ chrome: { navigation: false }});
    subject = new AppStatusbar(app);
    this.sinon.stub(app, 'isFullScreen').returns(true);
    subject.screen = document.createElement('div');
    subject.chromeBar = document.createElement('div');
    subject.titleBar = document.createElement('div');
  });

  suite('Reset destination if browser is destroyed', function() {
    test('Suspend', function() {
      app.element.dispatchEvent(new CustomEvent('_suspended'));
      assert.isNull(subject._touchForwarder.destination);
    });

    test('Resume', function() {
      var newBrowserElement = document.createElement('iframe');
      app.browser = {
        element: newBrowserElement
      };
      app.element.dispatchEvent(new CustomEvent('_resumed'));
      assert.deepEqual(subject._touchForwarder.destination, newBrowserElement);
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
      subject.handleStatusbarTouch(e, 24);

      return e;
    }

    suite('Revealing the StatusBar >', function() {
      var transitionEndSpy;
      var element;
      setup(function() {
        element = subject.titleBar;
        transitionEndSpy = this.sinon.spy(element, 'addEventListener');
      });

      function assertStatusBarReleased() {
        assert.isFalse(element.classList.contains('dragged'));
      }

      function assertChromeBarDragging(isDragging) {
        assert.equal(subject.chromeBar.classList.contains('dragging'),
          isDragging);
      }

      teardown(function() {
        this.sinon.clock.tick(10000);
      });

      test('it should prevent default on mouse events',
        function() {
          var mousedown = fakeDispatch('mousedown', 100, 0);
          var mousemove = fakeDispatch('mousemove', 100, 2);
          var mouseup = fakeDispatch('mouseup', 100, 2);

          assert.isTrue(mousedown.defaultPrevented);
          assert.isTrue(mousemove.defaultPrevented);
          assert.isTrue(mouseup.defaultPrevented);
        });

      test('it should prevent default on all touch events to prevent reflows',
        function() {
          var touchstart = fakeDispatch('touchstart', 100, 0);
          var touchmove = fakeDispatch('touchmove', 100, 2);
          var touchend = fakeDispatch('touchend', 100, 2);

          assert.isTrue(touchstart.defaultPrevented);
          assert.isTrue(touchmove.defaultPrevented);
          assert.isTrue(touchend.defaultPrevented);
        });

      test('chromeBar dragging, then dragged then released when above ' +
        'threshold', function() {
        assertChromeBarDragging(false);
        fakeDispatch('touchstart', 100, 0);
        assertChromeBarDragging(true);
        fakeDispatch('touchmove', 100, 24);
        assertChromeBarDragging(true);
        fakeDispatch('touchend', 100, 25);
        assertChromeBarDragging(false);
        assert.isTrue(element.classList.contains('dragged'));
      });

      test('chromeBar dragging then released when below threshold', function() {
        assertChromeBarDragging(false);
        fakeDispatch('touchstart', 100, 0);
        assertChromeBarDragging(true);
        fakeDispatch('touchmove', 100, 2);
        assertChromeBarDragging(true);
        fakeDispatch('touchend', 100, 2);
        assertChromeBarDragging(false);
        assertStatusBarReleased();
      });

      test('it should stop the propagation of the events at first', function() {
        var fakeEvt = {
          stopImmediatePropagation: function() {},
          preventDefault: function() {},
          type: 'fake'
        };
        this.sinon.spy(fakeEvt, 'stopImmediatePropagation');
        subject.handleStatusbarTouch(fakeEvt, 24);
        sinon.assert.calledOnce(fakeEvt.stopImmediatePropagation);
      });

      test('it should translate the statusbar on touchmove', function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        var transform = 'translateY(calc(5px - 100%))';
        assert.equal(element.style.transform, transform);
        fakeDispatch('touchend', 100, 5);
      });

      test('it should set the dragged class on touchstart', function() {
        fakeDispatch('touchstart', 100, 0);
        assert.isFalse(element.classList.contains('dragged'));
        fakeDispatch('touchmove', 100, 24);
        fakeDispatch('touchend', 100, 25);
        assert.isTrue(element.classList.contains('dragged'));
      });

      test('it should not translate the statusbar more than its height',
      function() {
        fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 5);
        fakeDispatch('touchmove', 100, 15);
        var transform = 'translateY(calc(15px - 100%))';
        assert.equal(element.style.transform, transform);
        fakeDispatch('touchend', 100, 15);
      });

      suite('after the gesture', function() {
        suite('when the StatusBar is not fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchend', 100, 5);
          });

          test('it should hide it right away', function() {
            assertStatusBarReleased();
          });
        });

        suite('when the StatusBar is fully displayed', function() {
          setup(function() {
            fakeDispatch('touchstart', 100, 0);
            fakeDispatch('touchmove', 100, 5);
            fakeDispatch('touchmove', 100, 24);
            fakeDispatch('touchend', 100, 24);
          });

          test('it should not hide it right away', function() {
            assert.equal(subject.titleBar.style.transform, '');
            assert.equal(subject.titleBar.style.transition, '');
            assert.ok(subject.titleBar.classList.contains('dragged'));
          });

          test('but after 5 seconds', function() {
            this.sinon.clock.tick(5000);
            assertStatusBarReleased();
          });

          test('or if the user interacts with the app', function() {
            // We're faking a touchstart event on the app iframe
            var iframe = app.browser.element;
            subject._touchForwarder.destination = window;

            var e = forgeTouchEvent('touchstart', 100, 100);
            window.dispatchEvent(e);

            assertStatusBarReleased();
            subject._touchForwarder.destination = iframe;
          });
        });
      });
    });

    suite('Touch forwarding in fullscreen >', function() {
      var forwardSpy;

      setup(function() {
        forwardSpy = this.sinon.spy(MockTouchForwarder.prototype, 'forward');
      });

      test('it should forward taps to the app', function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 2);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.isTrue(forwardSpy.calledTwice);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], touchend);
      });

      suite('if it\'s not a tap and the statusbar is not fully displayed',
      function() {
        test('it should not forward any events', function() {
          fakeDispatch('touchstart', 100, 0);
          fakeDispatch('touchmove', 100, 8);
          fakeDispatch('touchend', 100, 8);

          assert.isTrue(forwardSpy.notCalled);
        });
      });

      test('it should forward touchmove once the statusbar is shown',
      function() {
        var touchstart = fakeDispatch('touchstart', 100, 0);
        fakeDispatch('touchmove', 100, 6);
        var secondMove = fakeDispatch('touchmove', 100, 26);
        var thirdMove = fakeDispatch('touchmove', 100, 28);
        var touchend = fakeDispatch('touchend', 100, 2);

        assert.equal(forwardSpy.callCount, 4);
        var call = forwardSpy.firstCall;
        assert.equal(call.args[0], touchstart);
        call = forwardSpy.getCall(1);
        assert.equal(call.args[0], secondMove);
        call = forwardSpy.getCall(2);
        assert.equal(call.args[0], thirdMove);
        call = forwardSpy.getCall(3);
        assert.equal(call.args[0], touchend);
      });
    });
  });
});
