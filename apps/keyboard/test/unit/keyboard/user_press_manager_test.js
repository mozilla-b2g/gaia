'use strict';

/* global UserPress, UserPressManager, MockEventTarget */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/js/keyboard/user_press_manager.js');

suite('UserPress', function() {
  test('(constructor)', function() {
    var el = {};
    var coords = {
      pageX: 100,
      pageY: 110
    };
    var press = new UserPress(el, coords);

    assert.equal(press.target, el);
    assert.equal(press.moved, false);
    assert.equal(press.pageX, 100);
    assert.equal(press.pageY, 110);
  });

  test('updateCoords()', function() {
    var el = {};
    var coords = {
      pageX: 100,
      pageY: 110
    };
    var press = new UserPress(el, coords);

    var newCoords = {
      pageX: 200,
      pageY: 210
    };

    press.updateCoords(newCoords, true);
    assert.equal(press.moved, true);
    assert.equal(press.pageX, 200);
    assert.equal(press.pageY, 210);
  });
});

suite('UserPressManager', function() {
  var app;
  var container;

  setup(function() {
    container = new MockEventTarget();
    this.sinon.spy(container, 'addEventListener');
    this.sinon.spy(container, 'removeEventListener');

    app = {
      getContainer: function() {
        return container;
      }
    };

    this.sinon.stub(document, 'elementFromPoint');
  });

  teardown(function() {
    document.elementFromPoint.restore();
  });

  test('(constructor)', function() {
    var manager = new UserPressManager(app);
    assert.equal(manager.app, app);
  });

  test('start()', function() {
    var manager = new UserPressManager(app);
    manager.start();

    assert.isTrue(container.addEventListener.calledWith('touchstart', manager));
    assert.isTrue(container.addEventListener.calledWith('mousedown', manager));
    assert.isTrue(
      container.addEventListener.calledWith('contextmenu', manager));
  });

  test('stop()', function() {
    var manager = new UserPressManager(app);
    manager.start();
    manager.stop();

    assert.isTrue(
      container.removeEventListener.calledWith('touchstart', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mousedown', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mousemove', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('mouseup', manager));
    assert.isTrue(
      container.removeEventListener.calledWith('contextmenu', manager));
  });

  test('contextmenu event', function() {
    var manager = new UserPressManager(app);
    manager.start();

    var el = new MockEventTarget();
    var contextmenuEvent = {
      type: 'contextmenu',
      target: el,
      preventDefault: this.sinon.stub()
    };

    container.dispatchEvent(contextmenuEvent);

    assert.isTrue(contextmenuEvent.preventDefault.calledOnce);
  });

  suite('single touch', function() {
    var manager, el;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);

      assert.isTrue(manager.onpressstart.calledOnce);
      assert.equal(manager.presses.size, 1);
      assert.deepEqual(manager.onpressstart.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      document.elementFromPoint.returns(el);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      manager.stop();
    });

    test('move within the element but less than MOVE_LIMIT', function() {
      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 101,
            pageY: 112
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);
      assert.equal(manager.onpressmove.callCount, 0);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 101,
            pageY: 112
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 101,
          pageY: 112
        }, 0]);

      manager.stop();
    });

    test('move within the element', function() {
      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      manager.stop();
    });

    test('move to another the element', function() {
      var el2 = new MockEventTarget();
      document.elementFromPoint.returns(el2);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el2,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el2,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      manager.stop();
    });

    test('ignore mouse events', function() {
      var mousedownEvent = {
        type: 'mousedown',
        target: el,
        pageX: 120,
        pageY: 130,
        preventDefault: this.sinon.stub()
      };
      el.dispatchEvent(mousedownEvent);
      container.dispatchEvent(mousedownEvent);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        pageX: 120,
        pageY: 130
      };
      el.dispatchEvent(mousemoveEvent);
      container.dispatchEvent(mousemoveEvent);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        pageX: 120,
        pageY: 130
      };
      el.dispatchEvent(mouseupEvent);
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(mousedownEvent.preventDefault.calledOnce);

      assert.equal(manager.onpressstart.callCount, 1);
      assert.equal(manager.onpressmove.callCount, 0);
      assert.equal(manager.onpressend.callCount, 0);

      manager.stop();
    });
  });

  suite('single mouse click', function() {
    var manager, el;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();
      var mousedownEvent = {
        type: 'mousedown',
        target: el,
        pageX: 100,
        pageY: 110,
        preventDefault: this.sinon.stub()
      };
      container.dispatchEvent(mousedownEvent);

      assert.isTrue(mousedownEvent.preventDefault.calledOnce);
      assert.isTrue(manager.onpressstart.calledOnce);
      assert.deepEqual(manager.onpressstart.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, '_mouse']);

      document.elementFromPoint.returns(el);
    });

    test('without moving, mouseup', function() {
      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        pageX: 100,
        pageY: 110
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, '_mouse']);
    });

    test('mousemove after mouseup', function() {
      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        pageX: 100,
        pageY: 110
      };
      container.dispatchEvent(mouseupEvent);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        pageX: 101,
        pageY: 112
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(true, 'Does not throw.');
    });


    test('move within the element but less than MOVE_LIMIT', function() {
      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        pageX: 101,
        pageY: 112
      };
      container.dispatchEvent(mousemoveEvent);

      assert.equal(manager.onpressmove.callCount, 0);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        pageX: 101,
        pageY: 112
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 101,
          pageY: 112
        }, '_mouse']);

      manager.stop();
    });

    test('move within the element', function() {
      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        pageX: 120,
        pageY: 130
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, '_mouse']);

      var mouseupEvent = {
        type: 'mouseup',
        target: el,
        pageX: 120,
        pageY: 130
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, '_mouse']);

      manager.stop();
    });

    test('move to another the element', function() {
      var el2 = new MockEventTarget();
      document.elementFromPoint.returns(el2);

      var mousemoveEvent = {
        type: 'mousemove',
        target: el,
        pageX: 120,
        pageY: 130
      };
      container.dispatchEvent(mousemoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el2,
          moved: true,
          pageX: 120,
          pageY: 130
        }, '_mouse']);

      var mouseupEvent = {
        type: 'mouseup',
        target: el2,
        pageX: 120,
        pageY: 130
      };
      container.dispatchEvent(mouseupEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el2,
          moved: true,
          pageX: 120,
          pageY: 130
        }, '_mouse']);

      manager.stop();
    });
  });

  suite('two touches', function() {
    var manager, el, el2;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);

      assert.isTrue(manager.onpressstart.calledOnce);
      assert.deepEqual(manager.onpressstart.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      el2 = new MockEventTarget();
      var touchstartEvent2 = {
        type: 'touchstart',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 200,
            pageY: 210
          }
        ]
      };
      container.dispatchEvent(touchstartEvent2);

      assert.isTrue(manager.onpressstart.calledTwice);
      assert.equal(manager.presses.size, 2);
      assert.deepEqual(manager.onpressstart.getCall(1).args,
        [{
          target: el2,
          moved: false,
          pageX: 200,
          pageY: 210
        }, 1]);

      document.elementFromPoint.withArgs(100, 110).returns(el);
      document.elementFromPoint.withArgs(200, 210).returns(el2);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 200,
            pageY: 210
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(1).args,
        [{
          target: el2,
          moved: false,
          pageX: 200,
          pageY: 210
        }, 1]);

      manager.stop();
    });

    test('move within the element', function() {
      document.elementFromPoint.withArgs(120, 130).returns(el);
      document.elementFromPoint.withArgs(220, 230).returns(el2);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchmoveEvent2 = {
        type: 'touchmove',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 220,
            pageY: 230
          }
        ]
      };
      el2.dispatchEvent(touchmoveEvent2);

      assert.isTrue(manager.onpressmove.calledTwice);
      assert.deepEqual(manager.onpressmove.getCall(1).args,
        [{
          target: el2,
          moved: true,
          pageX: 220,
          pageY: 230
        }, 1]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 220,
            pageY: 230
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(1).args,
        [{
          target: el2,
          moved: true,
          pageX: 220,
          pageY: 230
        }, 1]);

      manager.stop();
    });

    test('move to another the element', function() {
      var el3 = new MockEventTarget();
      var el4 = new MockEventTarget();
      document.elementFromPoint.withArgs(120, 130).returns(el3);
      document.elementFromPoint.withArgs(220, 230).returns(el4);

      var touchmoveEvent = {
        type: 'touchmove',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchmoveEvent);

      assert.isTrue(manager.onpressmove.calledOnce);
      assert.deepEqual(manager.onpressmove.getCall(0).args,
        [{
          target: el3,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchmoveEvent2 = {
        type: 'touchmove',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 220,
            pageY: 230
          }
        ]
      };
      el2.dispatchEvent(touchmoveEvent2);

      assert.isTrue(manager.onpressmove.calledTwice);
      assert.deepEqual(manager.onpressmove.getCall(1).args,
        [{
          target: el4,
          moved: true,
          pageX: 220,
          pageY: 230
        }, 1]);

      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 120,
            pageY: 130
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el3,
          moved: true,
          pageX: 120,
          pageY: 130
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el2,
        changedTouches: [
          {
            target: el2,
            identifier: 1,
            pageX: 220,
            pageY: 230
          }
        ]
      };
      el2.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(1).args,
        [{
          target: el4,
          moved: true,
          pageX: 220,
          pageY: 230
        }, 1]);

      manager.stop();
    });
  });

  suite('two touches on the same element', function() {
    var manager, el;

    setup(function() {
      manager = new UserPressManager(app);
      manager.onpressstart = this.sinon.stub();
      manager.onpressmove = this.sinon.stub();
      manager.onpressend = this.sinon.stub();
      manager.start();

      el = new MockEventTarget();
      this.sinon.stub(el, 'removeEventListener');
      var touchstartEvent = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      container.dispatchEvent(touchstartEvent);

      assert.isTrue(manager.onpressstart.calledOnce);
      assert.deepEqual(manager.onpressstart.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      var touchstartEvent2 = {
        type: 'touchstart',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 1,
            pageX: 200,
            pageY: 210
          }
        ]
      };
      container.dispatchEvent(touchstartEvent2);

      assert.isTrue(manager.onpressstart.calledTwice);
      assert.equal(manager.presses.size, 2);
      assert.deepEqual(manager.onpressstart.getCall(1).args,
        [{
          target: el,
          moved: false,
          pageX: 200,
          pageY: 210
        }, 1]);

      document.elementFromPoint.withArgs(100, 110).returns(el);
      document.elementFromPoint.withArgs(200, 210).returns(el);
    });

    test('without moving, touchend', function() {
      var touchendEvent = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 0,
            pageX: 100,
            pageY: 110
          }
        ]
      };
      el.dispatchEvent(touchendEvent);

      assert.isTrue(manager.onpressend.calledOnce);
      assert.equal(manager.presses.size, 1);
      assert.deepEqual(manager.onpressend.getCall(0).args,
        [{
          target: el,
          moved: false,
          pageX: 100,
          pageY: 110
        }, 0]);

      var touchendEvent2 = {
        type: 'touchend',
        target: el,
        changedTouches: [
          {
            target: el,
            identifier: 1,
            pageX: 200,
            pageY: 210
          }
        ]
      };
      el.dispatchEvent(touchendEvent2);

      assert.isTrue(manager.onpressend.calledTwice);
      assert.equal(manager.presses.size, 0);
      assert.deepEqual(manager.onpressend.getCall(1).args,
        [{
          target: el,
          moved: false,
          pageX: 200,
          pageY: 210
        }, 1]);

      assert.isTrue(el.removeEventListener.calledWith('touchmove'));
      assert.isTrue(el.removeEventListener.calledWith('touchend'));
      assert.isTrue(el.removeEventListener.calledWith('touchcancel'));
      assert.equal(el.removeEventListener.callCount, 3);

      manager.stop();
    });
  });
});
