// GestureDetector.js: generate events for one and two finger gestures

/*
Start by handling touch events.
Then try to add non-touch compatability with mouse events and MozMagnifyGesture

Gesture events:

   tap          // or can I use click?
   dbltap       // or just dblclick?
   pan          // single touch move
   swipe        // end of a pan, includes velocity distance and direction
   holdstart
   holdmove
   holdend
   transform    // complex 2-finger gesture including scale, rotate, translate

Open question: if we're listening for gestures on an element e, will 
  other mouse and touch events ever be reported on that element, or 
  will they only report gesture events?  That is, should the gesture
  detector call preventDefault()?

Another question: do I want to try to do any kind of CSS selector-based
 filtering? Given a root element and a selector, register the handlers
 on the root element, but only detect events if they originate in 
 descendants that match the selector? Also, what element are the gesture
 events dispatched on?  Currently the same one that we register the 
 handlers on, even if the gesture itself is occurring on descendant elements. 

The GestureDetector() constructor takes an element as its first
argument and listens for events on that element (and dispatches them
on that element, too). The optional second argument is an object of options.
Pass an object with property holdEvents true if you want to receive
holdstart, holdmove and holdend events.


*/

var GestureDetector = (function() {

  // 
  // Constructor
  // 
  function GestureDetector(e, options) {
    this.element = e;
    this.options = options || {};
    this.state = initialState;
    this.timers = {};
  }

  // 
  // Public methods
  //

  GestureDetector.prototype.startDetecting = function() {
    var self = this;
    eventtypes.forEach(function(t) {
      self.element.addEventListener(t, self);
    });
  };

  GestureDetector.prototype.stopDetecting = function() {
    var self = this;
    eventtypes.forEach(function(t) {
      this.element.removeEventListener(t, self);
    });
  };

  // 
  // Internal methods
  // 

  GestureDetector.prototype.handleEvent = function(e) {
    var handler = this.state[e.type];
    if (!handler) return;

    // If this is a touch event handle each changed touch separately
    if (e.changedTouches) {
      for(var i = 0; i < e.changedTouches.length; i++) {
        handler(this, e, e.changedTouches[i]);
      }
    }
    else {    // Otherwise, just dispatch the event to the handler
      handler(this, e);
    }
  };

  GestureDetector.prototype.startTimer = function(type, time) {
    this.clearTimer(type);
    var self = this;
    this.timers[type] = setTimeout(function() {
      self.timers[type] = null;
      var handler = self.state[type];
      if (handler)
        handler(self, type);
    }, time);
  };

  GestureDetector.prototype.clearTimer = function(type) {
    if (this.timers[type]) {
      clearTimeout(this.timers[type]);
      this.timers[type] = null;
    }
  };

  // Switch to a new FSM state, and call the init() function of that 
  // state, if it has one.  The event and touch arguments are optional
  // and are just passed through to the state init function.
  GestureDetector.prototype.switchTo = function(state, event, touch) {
    this.state = state;
    if (state.init)
      state.init(this, event, touch);
  };

  GestureDetector.prototype.emitEvent = function(type, detail) {
    var event = this.element.ownerDocument.createEvent('CustomEvent');
    event.initCustomEvent(type, true, true, detail);
    this.element.dispatchEvent(event);
  }

  // 
  // Tuneable parameters
  // 
  GestureDetector.HOLD_INTERVAL = 1500;  // Hold events after 1500 ms
  GestureDetector.PAN_THRESHOLD = 50;    // 50 pixels movement before panning
  GestureDetector.DOUBLE_TAP_DISTANCE = 50;
  GestureDetector.DOUBLE_TAP_TIME = 500;
  GestureDetector.VELOCITY_SMOOTHING = .5;

  // Don't start sending transform events until the gesture exceeds a threshold
  GestureDetector.SCALE_THRESHOLD = 40;     // pixels
  GestureDetector.ROTATE_THRESHOLD = 22.5;  // degrees


  // 
  // Helpful shortcuts and utility functions
  // 

  var abs = Math.abs, floor = Math.floor, sqrt = Math.sqrt, atan2 = Math.atan2;
  var PI = Math.PI;

  // The names of events that we need to register handlers for
  var eventtypes = [
    'touchstart',
    'touchmove',
    'touchend'
    // XXX: add mouse and MozMagnifyGesture events
  ];

  // Return an object containg the space and time coordinates of 
  // and event and touch. We freeze the object to make it immutable so
  // we can pass it in events and not worry about values being changed.
  function coordinates(e, t) {
    return Object.freeze({
      screenX: t.screenX,
      screenY: t.screenY,
      clientX: t.clientX,
      clientY: t.clientY,
      pageX: t.pageX,
      pageY: t.pageY,
      timeStamp: e.timeStamp
    });
  }

  // Like coordinates(), but return the midpoint between two touches
  function midpoints(e, t1, t2) {
    return Object.freeze({
      screenX: floor((t1.screenX + t2.screenX)/2),
      screenY: floor((t1.screenY + t2.screenY)/2),
      pageX: floor((t1.pageX + t2.pageX) / 2),
      pageY: floor((t1.pageY + t2.pageY) / 2),
      clientX: floor((t1.clientX + t2.clientX)/2),
      clientY: floor((t1.clientY + t2.clientY)/2),
      timeStamp: e.timeStamp
    });
  }

  // Compute the distance between two touches
  function touchDistance(t1, t2) {
    var dx = t2.screenX - t1.screenX;
    var dy = t2.screenY - t1.screenY;
    return sqrt(dx * dx + dy * dy);
  }

  // Compute the direction (as an angle) of the line between two touches
  // Returns a number d, -180 < d <= 180
  function touchDirection(t1, t2) {
    return atan2(t2.screenY - t1.screenY,
                 t2.screenX - t1.screenX) * 180 / PI;
  }

  // Compute the clockwise angle between direction d1 and direction d2.
  // Returns an angle a -180 < a <= 180.
  function touchRotation(d1, d2) {
    var angle = d2 - d1;
    if (angle > 180) 
      angle -= 360;
    else if (angle <= -180)
      angle += 360;
    return angle;
  }

  // Determine if two taps are close enough in time and space to
  // trigger a dbltap event. The arguments are objects returned
  // by the coordinates() function.
  function isDoubleTap(lastTap, thisTap) {
    var dx = abs(thisTap.screenX - lastTap.screenX);
    var dy = abs(thisTap.screenY - lastTap.screenY);
    var dt = thisTap.timeStamp - lastTap.timeStamp;
    return (dx < GestureDetector.DOUBLE_TAP_DISTANCE &&
            dy < GestureDetector.DOUBLE_TAP_DISTANCE &&
            dt < GestureDetector.DOUBLE_TAP_TIME)
  }

  // 
  // The following objects are the states of our Finite State Machine
  // 

  // In this state we're not processing any gestures, just waiting
  // for an event to start a gesture and ignoring others
  var initialState = {
    init: function(d) {
      // When we enter or return to the initial state, clear
      // the detector properties that were tracking gestures
      // Don't clear d.lastTap here, though. We need it for dbltap events
      d.start = d.last = null;
      d.touch1 = d.touch2 = null;
      d.vx = d.vy = null;
      d.startDistance = d.lastDistance = null;
      d.startDirection = d.lastDirection = null;
      d.scaled = d.rotated = null;
    },
    
    touchstart: function(d, e, t) {
      // Switch to the touchstarted state and process the touch event there
      d.switchTo(touchStartedState, e, t);
    },
  };

  // One finger is down but we haven't generated any event yet. We're 
  // waiting to see...  If the finger goes up soon, its a tap. If the finger
  // stays down and still, its a hold. If the finger moves its a pan/swipe.
  // And if a second finger goes down, its a transform
  var touchStartedState = {
    init: function(d, e, t) {
      // Remember the id of the touch that started
      d.touch1 = t.identifier;
      // Get the coordinates of the touch
      d.start = d.last = coordinates(e,t);
      // Start a timer for a hold
      // If we're doing hold events, start a timer for them
      if (d.options.holdEvents)
        d.startTimer('holdtimeout', GestureDetector.HOLD_INTERVAL);
    },

    touchstart: function(d, e, t) {
      // If another finger goes down in this state, then 
      // go to transform state to start 2-finger gestures.
      d.clearTimer('holdtimeout');
      d.switchTo(transformState, e, t);
    },
    touchmove: function(d, e, t) {
      // Ignore any touches but the initial one
      // This could happen if there was still a finger down after
      // the end of a previous 2-finger gesture, e.g.
      if (t.identifier !== d.touch1)
        return;

      if (abs(t.screenX - d.start.screenX) > GestureDetector.PAN_THRESHOLD ||
          abs(t.screenY - d.start.screenY) > GestureDetector.PAN_THRESHOLD) {
        d.clearTimer('holdtimeout');
        d.switchTo(panStartedState, e, t);
      }
    },
    touchend: function(d, e, t) {
      // Ignore any touches but the initial one
      if (t.identifier !== d.touch1)
        return;

      // If there was a previous tap that was close enough in time
      // and space, then emit a 'dbltap' event
      if (d.lastTap && isDoubleTap(d.lastTap, d.start)) {
        d.emitEvent('tap', d.start);
        d.emitEvent('dbltap', d.start);
        // clear the lastTap property, so we don't get another one
        d.lastTap = null;
      }
      else {
        // Emit a 'tap' event using the starting coordinates
        // as the event details
        d.emitEvent('tap', d.start);
        
        // Remember the coordinates of this tap so we can detect double taps
        d.lastTap = coordinates(e, t);
      }

      // In either case clear the timer and go back to the initial state
      d.clearTimer('holdtimeout');
      d.switchTo(initialState);
    },

    holdtimeout: function(d) {
      d.switchTo(holdState);
    },

  };

  // A single touch has moved enough to exceed the pan threshold and now
  // we're going to generate pan events after each move and a swipe event
  // when the touch ends. We ignore any other touches that occur while this
  // pan/swipe gesture is in progress.
  var panStartedState = {
    init: function(d, e, t) {
      // If we transition into this state with a touchmove event,
      // then process it with that handler. If we don't do this then
      // we can end up with swipe events that don't know their velocity
      if (e.type === "touchmove")
        panStartedState.touchmove(d, e, t);
    },

    touchmove: function(d, e, t) {
      // Ignore any fingers other than the one we're tracking
      if (t.identifier !== d.touch1) 
        return;

      // Each time the touch moves, emit a pan event but stay in this state
      var current = coordinates(e,t);
      d.emitEvent('pan', {
        absolute: {
          dx: current.screenX - d.start.screenX,
          dy: current.screenY - d.start.screenY
        },
        relative: {
          dx: current.screenX - d.last.screenX,
          dy: current.screenY - d.last.screenY
        },
        position: current
      });

      // Track the pan velocity so we can report this with the swipe
      // Use a exponential moving average for a bit of smoothing
      // on the velocity
      var dt = e.timeStamp - d.last.timeStamp;
      var vx = (current.screenX - d.last.screenX)/dt;
      var vy = (current.screenY - d.last.screenY)/dt;

      if (d.vx == null) { // first time; no average
        d.vx = vx;
        d.vy = vy;
      }
      else {
        d.vx = d.vx * GestureDetector.VELOCITY_SMOOTHING + 
          vx * (1 - GestureDetector.VELOCITY_SMOOTHING);
        d.vy = d.vy * GestureDetector.VELOCITY_SMOOTHING + 
          vy * (1 - GestureDetector.VELOCITY_SMOOTHING);
      }

      d.last = current;
    },
    touchend: function(d, e, t) {
      // Ignore any fingers other than the one we're tracking
      if (t.identifier !== d.touch1) 
        return;

      // Emit a swipe event when the finger goes up.
      // Report start and end point, dx, dy, dt, velocity and direction
      var current = coordinates(e, t);
      var dx = current.screenX - d.start.screenX;
      var dy = current.screenY - d.start.screenY;
      // angle is a positive number of degrees, starting at 0 on the
      // positive x axis and increasing clockwise.
      var angle = atan2(dy,dx) * 180 / PI;
      if (angle < 0)
        angle += 360;

      // Direction is 'right', 'down', 'left' or 'up'
      var direction;
      if (angle >= 315 || angle < 45)
        direction = 'right'
      else if (angle >= 45 && angle < 135)
        direction = 'down'
      else if (angle >= 135 && angle < 225)
        direction = 'left';
      else if (angle >= 225 && angle < 315)
        direction = 'up';

      d.emitEvent('swipe', {
        start: d.start,
        end: current,
        dx: dx,
        dy: dy,
        dt: e.timeStamp - d.start.timeStamp,
        vx: d.vx,
        vy: d.vy,
        direction: direction,
        angle: angle
      });

      // Go back to the initial state
      d.switchTo(initialState);
    }
  };

  // We enter this state if the user touches and holds for long enough
  // without moving much.  When we enter we emit a holdstart event. Motion
  // after the holdstart generates holdmove events. And when the touch ends
  // we generate a holdend event. holdmove and holdend events can be used
  // kind of like drag and drop events in a mouse-based UI. Currently,
  // these events just report the coordinates of the touch.  Do we need
  // other details?
  var holdState = {
    init: function(d) {
      d.emitEvent('holdstart', d.start);
    },

    touchmove: function(d, e, t) {
      var current = coordinates(e, t);
      d.emitEvent('holdmove', {
        absolute: {
          dx: current.screenX - d.start.screenX,
          dy: current.screenY - d.start.screenY
        },
        relative: {
          dx: current.screenX - d.last.screenX,
          dy: current.screenY - d.last.screenY
        },
        position: current
      });

      d.last = current;
    },

    touchend: function(d, e, t) {
      var current = coordinates(e, t);
      d.emitEvent('holdend', {
        start: d.start,
        end: current,
        dx: current.screenX - d.start.screenX,
        dy: current.screenY - d.start.screenY,
      });
      d.switchTo(initialState);
    },
  };

  // We enter this state if a second touch starts before we start
  // recoginzing any other gesture.  As the touches move we track the
  // distance and angle between them to report scale and rotation values
  // in transform events.
  var transformState = {
    init: function(d, e, t) {
      // Remember the id of the second touch
      d.touch2 = t.identifier;

      // Get the two Touch objects
      var t1 = e.touches.identifiedTouch(d.touch1);
      var t2 = e.touches.identifiedTouch(d.touch2);

      // Compute and remember the initial distance and angle
      d.startDistance = d.lastDistance = touchDistance(t1, t2);
      d.startDirection = d.lastDirection = touchDirection(t1, t2);

      // Don't start emitting events until we're past a threshold
      d.scaled = d.rotated = false;
    },

    touchmove: function(d, e, t) {
      // Ignore touches we're not tracking
      if (t.identifier !== d.touch1 && t.identifier !== d.touch2)
        return;

      // Get the two Touch objects
      var t1 = e.touches.identifiedTouch(d.touch1);
      var t2 = e.touches.identifiedTouch(d.touch2);

      // Compute the new midpoints, distance and direction
      var midpoint = midpoints(e, t1, t2);
      var distance = touchDistance(t1, t2);
      var direction = touchDirection(t1, t2);
      var rotation = touchRotation(d.startDirection, direction);

      // Check all of these numbers against the thresholds. Otherwise
      // the transforms are too jittery even when you try to hold your
      // fingers still.
      if (!d.scaled) {
        if (abs(distance - d.startDistance) > GestureDetector.SCALE_THRESHOLD)
          d.scaled = true;
        else
          distance = d.startDistance;
      }
      if (!d.rotated) {
        if (abs(rotation) > GestureDetector.ROTATE_THRESHOLD)
          d.rotated = true;
        else
          direction = d.startDirection;
      }

      // If nothing has exceeded the threshold yet, then we
      // don't even have to fire an event.
      if (d.scaled || d.rotated) {
        // The detail field for the transform gesture event includes
        // 'absolute' transformations against the initial values and
        // 'relative' transformations against the values from the last
        // transformgesture event.
        d.emitEvent('transform', {
          absolute: { // transform details since gesture start
            scale: distance / d.startDistance,
            rotate: touchRotation(d.startDirection, direction),
          },
          relative: { // transform since last gesture change
            scale: distance / d.lastDistance,
            rotate: touchRotation(d.lastDirection, direction),
          },
          midpoint: midpoint
        });

        d.lastDistance = distance;
        d.lastDirection = direction;
      }
    },

    touchend: function(d, e, t) {
      // If either finger goes up, we're done with the gesture.
      // The user might move that finger and put it right back down
      // again to begin another 2-finger gesture, so we can't go 
      // back to the initial state while one of the fingers remains up.
      // On the other hand, we can't go back to touchStartedState because
      // that would mean that the finger left down could cause a tap or
      // pan event. So we need an afterTransform state that waits for 
      // a finger to come back down or the other finger to go up.
      if (t.identifier === d.touch2)
        d.touch2 = null;
      else if (t.identifier === d.touch1) {
        d.touch1 = d.touch2;
        d.touch2 = null;
      }
      else
        return; // It was a touch we weren't tracking
      
      d.switchTo(afterTransformState);
    },
  };

  // We did a tranform and one finger went up. Wait for that finger to 
  // come back down or the other finger to go up too.
  var afterTransformState = {
    touchstart: function(d, e, t) {
      d.switchTo(transformState, e, t);
    }, 

    touchend: function(d, e, t) {
      if (t.identifier === d.touch1)
        d.switchTo(initialState);
    }
  };

  return GestureDetector;
}());
