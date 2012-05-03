//
// SyntheticGestures.js: test utilities for generating gesture events.
// 
// This module defines a SyntheticGestures object whose properties are 
// utility functions that generate sequences of synthetic events. The event
// sequences are intended to be recognized as gestures by GestureDetector.js
// so this module is useful for writing tests of UI code that uses
// GestureDetector.js.
// 
// SyntheticGestures.tap(): emit touch events to generate a tap gesture
//   on the specified target element.  GestureDetector.js should emit
//   a tap event in response.  SyntheticGesture.mousetap() is the same
//   but synthesizes mouse events instead.
//
// SyntheticGestures.dbltap(): emit touch events to generate a double
//   tap gesture on the specified target element.  GestureDetector.js
//   should emit two tap events and a dbltap event in response.
//   SyntheticGesture.mousedbltap() is the same but synthesizes mouse
//   events instead of touch events.
// 
// SyntheticGestures.swipe(): emit touch events for a basic one finger
//   touch, move, lift geture over a specifed target, with given start
//   and end coordinates and gesture duration. GestureDetector.js should
//   emit a series of pan events and a final swipe event.  
//   SyntheticGestures.mouseswipe() is similar but uses mouse events
//   instead of touch events.
// 
// SyntheticGestures.hold(): emit touch events for a touch/hold/move/release
//   gesture. GestureDetector should emit a holdstart/holdmove/holdend 
//   sequence of events in response.  SyntheticGesture.mousehold() is
//   similar but uses mouse events instead.
// 
// SyntheticGestures.pinch(): emit touch events for a 2-finger pinch
//   open or pinch close gesture with given staring points for each
//   finger and a given scale factor. GestureDetector.js should
//   respond with a sequence of transform events culminating in one
//   with something very close to the specified scale factor.
//   Two-finger gestures can't be simulated with a mouse, so there is no
//   mouse-only version of this gesture, and the pinch() function will 
//   fail on platforms that do not support touch events.
//
var SyntheticGestures = (function() {
  var touchSupported = typeof document.createTouch === "function";

  // Send move events about this often
  var EVENT_INTERVAL = 50;  // milliseconds

  // The current array of all pending touches
  var touches = [];
  // For assigning unique ids to all touches
  var nextTouchId = 1000;

  // Emit a touch event of the specified type, using touch as the sole
  // member of the changedTouches property
  function emitTouchEvent(type, touch) {
    var target = touch.target;
    var doc = target.ownerDocument;
    var win = doc.defaultView;

    // Create the three lists of touches

    // All touches in the same document
    var touches = doc.createTouchList(touches.filter(function(t) {
      return t.target.ownerDocument === doc;
    }));
    // All touches on the same target
    var targetTouches = doc.createTouchList(touches.filter(function(t) {
      return t.target === target;
    }));
    // Just this one touch that changed
    var changedTouches = doc.createTouchList(touch);
    
    // Create the event object
    var event = document.createEvent("TouchEvent");
    event.initTouchEvent(type, 
                         true, // bubles
                         true, // cancellable
                         win,
                         0,    // detail
                         false, false, false, false, // no modifier keys
                         touches, 
                         targetTouches,
                         changedTouches);

    // Now dispatch it
    target.dispatchEvent(event);
  }

  // 
  // Dispatch a touchstart, touchmove+, touchend sequence of events to
  // simulate a single-finger touch of the specified duration. 
  // 
  // The xt and yt arguments are functions that must return x and y
  // coordinates of the touch at any time t, 0 <= t <= duration.
  // Alternatively, xt and yt can be two-element arrays [from,to], and
  // the mouse coordinates will be interpolated between those
  // coordinates.  The then argument is an optional callback that will
  // be invoked after the touchend event is sent. In either case, the
  // coordinates should be window coordinates, relative to the viewport
  // 
  // touch() can be called multiple times concurrently to simulate
  // 2 and 3 finger gestures.
  // 
  // This is a low-level function that the higher-level touch gesture
  // utilities are built on. Most testing code will not need to call it.
  // 
  function touch(target, duration, xt, yt, then) {
    var doc = target.ownerDocument;
    var win = doc.defaultView;
    var touchId = nextTouchId++;

    var x = typeof xt === "function" 
      ? xt
      : function(t) { return xt[0] + t/duration * (xt[1]-xt[0]); };
    var y = typeof yt === "function" 
      ? yt
      : function(t) { return yt[0] + t/duration * (yt[1]-yt[0]); };
    
    // viewport coordinates
    var clientX = Math.round(x(0)), clientY = Math.round(y(0));

    // document coordinates
    var pageX = clientX + win.pageXOffset,
        pageY = clientY + win.pageYOffset;

    // screen coordinates
    var screenX = clientX + win.mozInnerScreenX,
        screenY = clientY + win.mozInnerScreenY;
    
    // Remember the coordinates
    var lastX = clientX, lastY = clientY;

    // Create the touch object we'll be 
    var touch = doc.createTouch(win, target, touchId, 
                                pageX, pageY,
                                screenX, screenY,
                                clientX, clientY);

    // Add this new touch to the list of touches
    touches.push(touch);

    // Send the start event
    emitTouchEvent('touchstart', touch);

    var startTime = Date.now();

    setTimeout(nextEvent, EVENT_INTERVAL);
    
    function nextEvent() {
      // Figure out if we've sent all of the touchmove events
      var time = Date.now();
      var dt = time - startTime;
      var done = dt > duration;

      // Find our touch object in the touches[] array.
      // Note that its index may have changed since we pushed it
      var touchIndex = touches.indexOf(t);

      if (done) {  // If we're done, then send a touchend event
        // For a touchend, we can reuse the touch object
        // But we have to remove it from the touches array first
        // so it is in the event's changedTouches list but not
        // the touches or targetTouches lists.
        touches.splice(touchIndex, 1);
        emitTouchEvent('touchend', touch);

        // Call the callback, if there is one after sending the touchend event
        if (then)
          setTimeout(then, 0);
      }
      else {       // Otherwise, send a touchmove, if we've moved
        // If this is the penultimate event, make sure we move all the way
        if (dt + EVENT_INTERVAL > duration) 
          dt = duration;

        // New coordinates of the touch
        clientX = Math.round(x(dt));
        clientY = Math.round(y(dt));

        if (clientX !== lastX || clientY !== lastY) { // If we moved
          lastX = clientX;
          lastY = clientY;
          pageX = clientX + win.pageXOffset;
          pageY = clientY + win.pageYOffset;
          screenX = clientX + win.mozInnerScreenX;
          screenY = clientY + win.mozInnerScreenY;

          // Since we moved, we've got to create a new Touch object
          // with the new coordinates
          touch = doc.createTouch(win, target, touchId,
                                  pageX, pageY,
                                  screenX, screenY,
                                  clientX, clientY);

          // Replace the old touch object with the new one
          touches[touchIndex] = touch;

          // And send the touchmove event
          emitTouchEvent('touchmove', touch);
        }

        // Whether or not we moved, schedule another event in a little while.
        setTimeout(nextEvent, EVENT_INTERVAL);
      }
    }
  }

  // Dispatch touchstart and touchend events over the specified target
  // and then invoke the then() callback.
  // x and y are the relative to the viewport.
  // If not specified then the center of the target is used. t is the
  // optional amount of time between touchstart and touchend event.
  function tap(target, then, x, y, t) {
    if (!touchSupported) {
      console.warn('tap: touch events not supported; using mouse instead');
      return mousetap(target, then, x, y, t);
    }

    if (x == null || y == null) {
      var box = target.getClientBoundingRect();
      if (x == null)
        x = box.left + box.width/2;
      if (y == null)
        y = box.top + box.height/2;
    }

    touch(target, t || 50, [x, x], [y, y], then);
  }

  // Dispatch a dbltap gesture. The arguments are like those to tap()
  // except that interval is the time between taps rather than the time between
  // touchstart and touchend
  function dbltap(target, then, x, y, interval) {
    if (!touchSupported) {
      console.warn('dbltap: touch events not supported; using mouse instead');
      return mousedbltap(target, then, x, y, interval);
    }

    if (x == null || y == null) {
      var box = target.getClientBoundingRect();
      if (x == null)
        x = box.left + box.width/2;
      if (y == null)
        y = box.top + box.height/2;
    }

    touch(target, 50, [x, x], [y, y], function() {
      // When the first tap is done, start a timer for interval ms.
      setTimeout(function() {
        // After interval ms, send the second tap
        touch(target, 50, [x, x], [y, y], then);
      }, interval);
    });
  }

  // Swipe smoothly from (x1, y1) to (x2, y2) over duration ms
  // then invoke the then() callback.
  function swipe(target, x1, y1, x2, y2, duration, then) {
    if (!touchSupported) {
      console.warn('swipe: touch events not supported; using mouse instead');
      return mouseswipe(target, x1, y1, x2, y2, duration, then);
    }

    if (!duration)
      duration = 200;
    touch(target, duration, [x1, x2], [y1, y2], then);
  }

  // Begin a touch at x1,y1 and hold it for holdtime ms, 
  // then move smoothly to x2,y2 over movetime ms, and then invoke then().
  function hold(target, holdtime, x1, y1, x2, y2, movetime, then) {
    if (!touchSupported) {
      console.warn('hold: touch events not supported; using mouse instead');
      return mousehold(target, holdtime, x1, y1, x2, y2, movetime, then);
    }

    if (!movetime)
      movetime = 200;

    touch(target, holdtime+movetime, 
          function(t) { // x coordinate a function of t
            if (t < holdtime) 
              return x1;
            else 
              return x1 + (t-holdtime)/movetime * (x2-x1);
          },
          function(t) { // y coordinate a function of t
            if (t < holdtime) 
              return y1;
            else 
              return y1 + (t-holdtime)/movetime * (y2-y1);
          },
          then);
  }

  // Begin touches at (x1,y1) and (x2,y2) and then move them smoothly toward
  // or away from each other by the specified scale factor over duration ms.
  // Finally, invoke the then() callback
  function pinch(target, x1, y1, x2, y2, scale, duration, then) {
    if (!touchSupported) {
      console.error('pinch: touch events not supported on this platform');
      return;
    }
    var xmid = (x1 + x2)/2;
    var ymid = (y1 + y2)/2;

    var newx1 = Math.round(xmid + (x1 - xmid)*scale);
    var newy1 = Math.round(ymid + (y1 - ymid)*scale);
    var newx2 = Math.round(xmid + (x2 - xmid)*scale);
    var newy2 = Math.round(ymid + (y2 - ymid)*scale);

    // Emit two concurrent series of touch events.a
    // The first one is simple:
    touch(target, duration, [x1,newx1], [y1,newy1]);

    // The second touch moves twice as fast and then holds still and
    // lasts for an extra 100ms to ensure that both moves complete
    // before either finger lifts up.  Hopefully this means we'll get
    // the full scale effect
    touch(target, duration + 100, 
          function(t) {
            if (t < duration/2)
              return x2 + t*2/duration * (newx2-x2);
            else 
              return newx2;
          },
          function(t) {
            if (t < duration/2)
              return y2 + t*2/duration * (newy2-y2);
            else 
              return newy2;
          },
          then);
  }


  // 
  // Dispatch a mousedown, mousemove+, mouseup sequence of events over
  // duration ms to simulate a click-drag motion of the mouse or trackpad.
  // 
  // The xt and yt arguments are [x0,x1], [y0,y1] or are functions 
  // of t that specify the mouse coordinates at time t just as for the 
  // touch() function.
  //
  // Unlike the touch() function, this drag() function takes a window
  // argument instead of an element argument, and always determines the
  // target of its events using document.elementFromPoint().  Callers
  // must ensure that xt and yt specify an initial point inside the
  // desired target element.
  // 
  // This is a low-level function that the higher-level mouse gesture
  // utilities are built on. Most testing code will not need to call it.
  // 
  function drag(win, duration, xt, yt, then, detail, button) {
    var doc = win.document;
    detail = detail || 1;
    button = button || 0;

    var x = typeof xt === "function" 
      ? xt
      : function(t) { return xt[0] + t/duration * (xt[1]-xt[0]); };
    var y = typeof yt === "function" 
      ? yt
      : function(t) { return yt[0] + t/duration * (yt[1]-yt[0]); };
    
    // viewport coordinates
    var clientX = Math.round(x(0)), clientY = Math.round(y(0));

    // Remember the coordinates
    var lastX = clientX, lastY = clientY;

    // Send the initial mousedown event
    mouseEvent('mousedown', clientX, clientY);

    // Now send a sequence of mousemove events followed by mouse up
    var startTime = Date.now();
    setTimeout(nextEvent, EVENT_INTERVAL);
    
    // Send a mouse event of the specified type to whatever element is
    // at the specified coordinates in the viewport.
    function mouseEvent(type, clientX, clientY) {
      // Figure out what element the mouse would be over at (x,y)
      var target = win.elementFromPoint(x, y);
      // Create an event
      var mousedown = doc.createEvent("MouseEvent");
      // Initialize it
      mousedown.initMouseEvent(type, 
                               true, true,    // bubbles, cancellable
                               win, detail,   // window, click count
                               clientX + win.mozInnerScreenX,
                               clientY + win.mozInnerScreenY,
                               clientX, clientY,
                               false, false, false, false, // keyboard modifiers
                               button, null); // mouse button, related target
      // And dispatch it on the target element
      target.dispatchEvent(mousedown);
    }

    function nextEvent() {
      // Figure out if we've sent all of the mousemove events
      var time = Date.now();
      var dt = time - startTime;
      var done = dt > duration;

      if (done) {  // If we're done, then send a mouseup event
        mouseEvent('mouseup', lastX, lastY);

        // Call the callback, if there is one after sending the touchend event
        if (then)
          setTimeout(then, 0);
      }
      else {       // Otherwise, send a touchmove, if we've moved
        // If this is the penultimate event, make sure we move all the way
        if (dt + EVENT_INTERVAL > duration) 
          dt = duration;

        // New coordinates of the touch
        clientX = Math.round(x(dt));
        clientY = Math.round(y(dt));

        if (clientX !== lastX || clientY !== lastY) { // If we moved
          lastX = clientX;
          lastY = clientY;
          mouseEvent('mousemove', clientX, clientY);
        }

        // Whether or not we moved, schedule another event in a little while.
        setTimeout(nextEvent, EVENT_INTERVAL);
      }
    }
  }

  // Send a mousedown/mouseup pair
  // XXX: will the browser automatically follow this with a click event?
  function mousetap(target, then, x, y, t) {
    if (x == null || y == null) {
      var box = target.getClientBoundingRect();
      if (x == null)
        x = box.left + box.width/2;
      if (y == null)
        y = box.top + box.height/2;
    }

    drag(target.ownerDocument.defaultView, t || 50, [x, x], [y, y], then);
  }

  // Dispatch a dbltap gesture. The arguments are like those to tap()
  // except that interval is the time between taps rather than the time between
  // touchstart and touchend
  function mousedbltap(target, then, x, y, interval) {
    if (x == null || y == null) {
      var box = target.getClientBoundingRect();
      if (x == null)
        x = box.left + box.width/2;
      if (y == null)
        y = box.top + box.height/2;
    }

    drag(target.ownerDocument.defaultView, 50, [x, x], [y, y], function() {
      // When the first tap is done, start a timer for interval ms.
      setTimeout(function() {
        // After interval ms, send the second tap with the click count set to 2.
        drag(target.ownerDocument.defaultView, 50, [x, x], [y, y], then, 2);
      }, interval);
    });
  }

  // Swipe smoothly with the mouse from (x1, y1) to (x2, y2) over duration ms
  // then invoke the then() callback.
  function mouseswipe(target, x1, y1, x2, y2, duration, then) {
    if (!duration)
      duration = 200;
    drag(target.ownerDocument.defaultView, duration, [x1, x2], [y1, y2], then);
  }

  // Mousedown at x1,y1 and hold it for holdtime ms, 
  // then move smoothly to x2,y2 over movetime ms, then mouse up, 
  // and then invoke then().
  function hold(target, holdtime, x1, y1, x2, y2, movetime, then) {
    if (!movetime)
      movetime = 200;
    drag(target.ownerDocument.defaultView, holdtime+movetime, 
          function(t) { // x coordinate a function of t
            if (t < holdtime) 
              return x1;
            else 
              return x1 + (t-holdtime)/movetime * (x2-x1);
          },
          function(t) { // y coordinate a function of t
            if (t < holdtime) 
              return y1;
            else 
              return y1 + (t-holdtime)/movetime * (y2-y1);
          },
          then);
  }

  return {
    tap: tap,
    mousetap: mousetap,
    dbltap: dbltap,
    mousedbltap: mousedbltap,
    swipe: swipe,
    mouseswipe: mouseswipe,
    hold: hold,
    mousehold: mousehold,
    pinch: pinch, // There is no mouse-based alternative to this
  };
}());
