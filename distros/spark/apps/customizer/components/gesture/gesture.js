/*jshint esnext:true*/
;(function (g,n,f) {
  'use strict';
  if (typeof define === 'function' && define.amd){ define(f); }
  else { g[n]=f(); }
}(this, 'Gesture', function() {

  var Gesture = {
    DEBUG: false
  };

  function debug(...args) {
    if (Gesture.DEBUG) {
      console.log('[Gesture]', ...args);
    }
  }

  // Return a promise that will resolve when the specified gesture is
  // detected. Note that the gesture is detected only once. You must call
  // this function again if you want to detect it again. The returned
  // promise will have a cancel() method on it. When called, gesture
  // detection stops and the promise is rejected.
  function detect(gestureSpec) {

    // These are the states of the gesture detector
    const NOT_STARTED = 0;    // We have not detected the gesture start yet
    const STARTED = 1;        // Gesture has begun but has not finished
    const FINISHED = 2;       // Gesture finished or was cancelled

    var state;                // Current gesture detection state
    var startEvent;           // The touchstart event that started the gesture

    var promise;              // The promise we return;
    var promiseResolver;      // The resolve function for the promise
    var promiseRejector;      // The reject function for the promise

    /*
     * Functions init(), start(), fail(), succeed(), cancel() and cleanup()
     * below handle state transitions between NOT_STARTED, STARTED and
     * FINISHED and also register and unregister event handlers, and
     * resolve or reject the promise.
     */

    // Call this function once to start listening.
    function init() {
      debug('Initializing');
      // Set our initial state
      state = NOT_STARTED;

      // Register a capturing event listener for touchstart events.
      // This is the only event handler that is registered when
      // we are in the NOT_STARTED state.
      window.addEventListener('touchstart', touchstart, true);
    }

    // Called when we detect that the gesture has started because
    // the right number of fingers are in the starting zone.
    // It registers handlers for touchmove and touchend and sets 
    // the state to STARTED.
    function start() {
      debug('Start of gesture detected');
      state = STARTED;
      window.addEventListener('touchmove', touchmove, true);
      window.addEventListener('touchend', touchend, true);
    }

    // This is called when the gesture fails (an additional finger
    // is added, for example, or the time limit is exceeded). It
    // unregisters the touchmove and touchend handlers and resets
    // the state to NOT_STARTED where it continues listening for new
    // touches.
    function fail(why) {
      debug('Gesture did not complete:', why);
      state = NOT_STARTED;
      window.removeEventListener('touchmove', touchmove, true);
      window.removeEventListener('touchend', touchend, true);
    }

    // This is called when the gesture is successfully detected.
    // It resolves the promise and cleans up any listeners.
    // The data argument contains information about the gesture that
    // is used to resolve the promise.
    function succeed(data) {
      debug('Gesture completed:', data);
      cleanup();
      promiseResolver(data);
    }

    // This is called if the caller cancels gesture detection.
    // It rejects the promise and cleans up any listeners
    function cancel() {
      cleanup();
      promiseRejector('cancelled');
    }

    // Unregister all currently registered event listeners
    function cleanup() {
      state = FINISHED;
      window.removeEventListener('touchstart', touchstart, true);
      window.removeEventListener('touchmove', touchmove, true);
      window.removeEventListener('touchend', touchend, true);
    }

    /*
     * The touchstart(), touchmove(), touchend() functions below handle
     * touch events and call the state transition functions above as
     * appopriate.
     */

    // This is called whenever the user touches the screen.
    // But it doesn't do anything unless this event looks like the
    // start of a gesture.
    function touchstart(e) {
      debug('touch start', e.touches.length);
      // If a gesture has already started and another finger 
      // goes down, then this is not the gesture we thought it was,
      // so we cancel it and go back to the initial state
      if (state === STARTED) {
        fail('already started');
        return;
      }

      // Otherwise, check if the current touches meet the gesture
      // start condition, and switch to STARTED if so
      if (isGestureStart(e)) {
        startEvent = e;
        start();
      }
    }

    function touchmove(e) {
      debug(e.type, e.touches.length,
            e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      var gestureData;
      try {
        gestureData = isGestureEnd(startEvent, e);
      }
      catch(ex) {
        // If isGestureEnd throws an exception, the gesture fails.
        fail(ex.message);
        return;
      }

      // If isGestureEnd returns a truthy value, the gesture succeeds.
      if (gestureData) {
        succeed(gestureData);
      }

      // Otherwise, we just keep listening for more move events
    }

    // Handle touchend events in the same way that we handle touchmove events
    function touchend(e) {
      touchmove(e);
    }

    // Return true if this event marks the start of the specified gesture
    function isGestureStart(event) {
      return Detectors[gestureSpec.type].isGestureStart(gestureSpec,
                                                        event);
    }

    function isGestureEnd(startEvent, endEvent) {
      return Detectors[gestureSpec.type].isGestureEnd(gestureSpec,
                                                      startEvent,
                                                      endEvent);
    }

    // Make sure we know how to detect the specified gesture
    if (!Detectors[gestureSpec.type]) {
      return Promise.reject('Unsupported gesture: ' + gestureSpec.type);
    }

    // If we do, then create the promise that we will return
    // and start detecting gestures when the promise is ready

    promise = new Promise(function(resolve, reject) {
      // Store resolve and reject in the outer scope where we can use them
      promiseResolver = resolve;
      promiseRejector = reject;
      init();
    });

    // Add a method to the returned promise that allows the client to
    // stop listening for the gesture
    promise.cancel = cancel;

    return promise;
  }


  // A utility function to determine whether the Touch t is in the region r.
  // Regions are specified in units relative to the window size.
  // (0,0) is the top-left corner of the window and (1,1) is the bottom right.
  function touchInRegion(t, r) {
    var x = t.clientX / window.innerWidth;
    var y = t.clientY / window.innerHeight;
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  }

  var Detectors = {
    swipe: {
      isGestureStart: function isSwipeStart(spec, event) {
        var touches = event.touches;

        // If the number of touches is not correct, this is not a gesture start
        if (touches.length !== spec.numFingers) {
          return false;
        }

        // If any of the touches is in the wrong place,
        // this is not a gesture start
        if (spec.startRegion) {
          for(var i = 0; i < touches.length; i++) {
            var t = touches[i];
            if (!touchInRegion(t, spec.startRegion)) {
              return false;
            }
          }
        }

        // The gesture has started
        return true;
      },

      //
      // This function tests whether the endEvent marks the end of the specified
      // gesture that started with the startEvent. There are three possible
      // outcomes:
      //
      // - if this is the end of the gesture, this function returns an object
      //   that holds information about the gesture, and that object will be
      //   used to resolve the promise.
      //
      // - if endEvent is not the end of the gesture, this function returns
      //   false
      //
      // - if endEvent is indicates that the gesture has failed (for example
      //   if the user's fingers are moving in the wrong direction) then this
      //   function should throw an error which will cause the gesture detector
      //   to reset to its NOT_STARTED state
      //
      isGestureEnd: function isSwipeEnd(spec, startEvent, endEvent) {
        var dt = endEvent.timeStamp - startEvent.timeStamp;
        var startTouches = startEvent.touches;
        var endTouches = endEvent.touches;

        // The gesture fails if:
        // 1) it has taken too long
        // 2) a finger is lifted before success
        // 3) there are the wrong number of touches (that should not happen).
        if (spec.maxTime && dt > spec.maxTime) {
          throw new Error('timeout:' + dt);
        }
        if (endEvent.type === 'touchend') {
          throw new Error('touchend');
        }
        if (endTouches.length !== startTouches.length) {
          // This should not happen, but it does happen for unknown reasons
          // See bug 1139575. If we throw an error here it aborts the gesture
          // and makes it hard for the user to swipe on some devices.
          // So instead we just return false and act like it never happened
          // throw new Error('wrong number of touches');
          return false;
        }

        var data = {
          dt: dt,
          fingers: []
        };

        for(var i = 0; i < startTouches.length; i++) {
          var st = startTouches[i];
          var et = endTouches.identifiedTouch(st.identifier);
          if (!et) { // this should not happen
            throw new Error('mismatch');
          }

          // If the gesture spec specifies and endRegion and this touch is
          // not in it, then this is not the end of the gesture
          // (For some types of gestures it might be better to specify
          // a minimum and maximum required distance in each direction
          // instead of a end region.)
          if (spec.endRegion && !touchInRegion(et, spec.endRegion)) {
            return false;
          }

          // This touch passes the test, so record it in the data
          data.fingers.push({
            x0: st.clientX,
            y0: st.clientY,
            x1: et.clientX,
            y1: et.clientY
          });
        }

        // If all the touches were okay, then we've found the end of the gesture
        return data;
      }
    }
  };

  Gesture.detect = detect;
  return Gesture;
}));
