'use strict';

/* global SwipingDetector */
require('/js/views/swiping_detector.js');

suite('View utils > SwipingDetector', function() {
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
    var step = step || 1;

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

  function createFakeCoordinates(x, y, timeStamp, id) {
    return Object.freeze({
      screenX: x,
      screenY: y,
      clientX: x,
      clientY: y,
      timeStamp: timeStamp,
      identifier: id
    });
  }

  var swipingDetector = null;
  var element = null;

  setup(function() {
    element = document.createElement('div');
    swipingDetector = new SwipingDetector(element);

    this.sinon.useFakeTimers();
  });

  test('init', function() {
    swipingDetector.start();
  });

  test('pan', function() {
    swipingDetector.start();

    var panHandler = this.sinon.stub();
    swipingDetector.onpan = panHandler;

    swipe(this.sinon.clock, element, 21, 0, 0, 0, 100, true);

    assert.equal(panHandler.lastCall.args[0].dx, -20);
  });

  test('swipe', function() {
    swipingDetector.start();

    var swipeHandler = this.sinon.stub();
    swipingDetector.onswipe = swipeHandler;

    swipe(this.sinon.clock, element, 0, 21, 0, 0, 100);
    assert.equal(swipeHandler.firstCall.args[0].direction, 'right');

    swipe(this.sinon.clock, element, 20, 0, 0, 0, 300);
    assert.equal(swipeHandler.lastCall.args[0].direction, 'left');
  });

  test('swipe will report velocity', function() {
    swipingDetector.start();

    var swipeHandler = this.sinon.stub();
    swipingDetector.onswipe = swipeHandler;

    swipingDetector.handleEvent({
      type: 'touchstart',
      touches: [createFakeCoordinates(0, 0, 0)],
      timeStamp: 0
    });

    swipingDetector.handleEvent({
      type: 'touchmove',
      touches: [createFakeCoordinates(20, 0, 0)],
      timeStamp: 100
    });

    swipingDetector.handleEvent({
      type: 'touchend',
      changedTouches: [createFakeCoordinates(20, 0, 0)],
      timeStamp: 100
    });

    assert.equal(swipeHandler.firstCall.args[0].vx, 0.2);
  });
});
