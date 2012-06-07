// GestureDetector.js: generate events for one and two finger gestures
//
// A GestureDetector object listens for touch and mouse events on a specified
// element and generates higher-level events that describe one and two finger
// gestures on the element. The hope is that this will be useful for webapps
// that need to run on mouse (or trackpad)-based desktop browsers and also
// in touch-based mobile devices.
//
// Supported events:
//
//  tap        like a click event
//  dbltap     like dblclick
//  pan        one finger motion, or mousedown followed by mousemove
//  swipe      when a finger is released following pan events
//  holdstart  touch (or mousedown) and hold. Must set an option to get these.
//  holdmove   motion after a holdstart event
//  holdend    when the finger or mouse goes up after holdstart/holdmove
//  transform  2-finger pinch and twist gestures for scaling and rotation
//             These are touch-only; they can't be simulated with a mouse.
//
// Each of these events is a bubbling CustomEvent with important details
// in the event.detail field. The event details are not yet stable
// and are not yet documented. See the calls to emitEvent() for details.
//
// To use this library, create a GestureDetector object by passing an
// element to the GestureDetector() constructor and then calling
// startDetecting() on it. The element will be the target of all the
// emitted gesture events. You can also pass an optional object as the
// second constructor argument. If you're interested in
// holdstart/holdmove/holdend events, pass {holdEvents:true} as this
// second argument. Otherwise they will not be generated.
//
// Implementation note: event processing is done with a simple
// finite-state machine. This means that in general, the various kinds
// of gestures are mutually exclusive. You won't get pan events until
// your finger or mouse has moved more than a minimum threshold, for
// example, but it does, the FSM enters a new state in which it can
// emit pan and swipe events and cannot emit hold events. Similarly,
// if you've started a 1 finger pan/swipe gesture and accidentally
// touch with a second finger, you'll continue to get pan events, and
// won't suddenly start getting 2-finger transform events.
//
// This library never calls preventDefault() or stopPropagation on any
// of the events it processes, so the raw touch or mouse events should
// still be available for other code to process. It is not clear to me
// whether this is a feature or a bug.
//
var GestureDetector = (function() {

  //
  // Constructor
  //
  function GD(e, options) {
    this.element = e;
    this.options = options || {};
    this.state = initialState;
    this.timers = {};
  }

  //
  // Public methods
  //

  GD.prototype.startDetecting = function() {
    var self = this;
    eventtypes.forEach(function(t) {
      self.element.addEventListener(t, self);
    });
  };

  GD.prototype.stopDetecting = function() {
    var self = this;
    eventtypes.forEach(function(t) {
      self.element.removeEventListener(t, self);
    });
  };

  //
  // Internal methods
  //

  GD.prototype.handleEvent = function(e) {
    var handler = this.state[e.type];
    if (!handler) return;

    // If this is a touch event handle each changed touch separately
    if (e.changedTouches) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        handler(this, e, e.changedTouches[i]);
      }
    }
    else {    // Otherwise, just dispatch the event to the handler
      handler(this, e);
    }
  };

  GD.prototype.startTimer = function(type, time) {
    this.clearTimer(type);
    var self = this;
    this.timers[type] = setTimeout(function() {
      self.timers[type] = null;
      var handler = self.state[type];
      if (handler)
        handler(self, type);
    }, time);
  };

  GD.prototype.clearTimer = function(type) {
    if (this.timers[type]) {
      clearTimeout(this.timers[type]);
      this.timers[type] = null;
    }
  };

  // Switch to a new FSM state, and call the init() function of that
  // state, if it has one.  The event and touch arguments are optional
  // and are just passed through to the state init function.
  GD.prototype.switchTo = function(state, event, touch) {
    this.state = state;
    if (state.init)
      state.init(this, event, touch);
  };

  GD.prototype.emitEvent = function(type, detail) {
    if (!this.target) {
      console.error('Attempt to emit event with no target');
      return;
    }

    var event = this.element.ownerDocument.createEvent('CustomEvent');
    event.initCustomEvent(type, true, true, detail);
    this.target.dispatchEvent(event);
  }

  //
  // Tuneable parameters
  //
  GD.HOLD_INTERVAL = 1000;     // Hold events after 1000 ms
  GD.PAN_THRESHOLD = 50;       // 50 pixels movement before touch panning
  GD.MOUSE_PAN_THRESHOLD = 25; // Mice are more precise, so smaller threshold
  GD.DOUBLE_TAP_DISTANCE = 50;
  GD.DOUBLE_TAP_TIME = 500;
  GD.VELOCITY_SMOOTHING = .5;

  // Don't start sending transform events until the gesture exceeds a threshold
  GD.SCALE_THRESHOLD = 40;     // pixels
  GD.ROTATE_THRESHOLD = 22.5;  // degrees


  //
  // Helpful shortcuts and utility functions
  //

  var abs = Math.abs, floor = Math.floor, sqrt = Math.sqrt, atan2 = Math.atan2;
  var PI = Math.PI;

  // The names of events that we need to register handlers for
  var eventtypes = [
    'touchstart',
    'touchmove',
    'touchend',
    'mousedown'  // We register mousemove and mouseup manually
  ];

  // Return the event's timestamp in ms
  function eventTime(e) {
    // In gecko, synthetic events seem to be in microseconds rather than ms.
    // So if the timestamp is much larger than the current time, assue it is
    // in microseconds and divide by 1000
    var ts = e.timeStamp;
    if (ts > 2 * Date.now())
      return Math.floor(ts / 1000);
    else
      return ts;
  }


  // Return an object containg the space and time coordinates of
  // and event and touch. We freeze the object to make it immutable so
  // we can pass it in events and not worry about values being changed.
  function coordinates(e, t) {
    return Object.freeze({
      screenX: t.screenX,
      screenY: t.screenY,
      clientX: t.clientX,
      clientY: t.clientY,
      timeStamp: eventTime(e)
    });
  }

  // Like coordinates(), but return the midpoint between two touches
  function midpoints(e, t1, t2) {
    return Object.freeze({
      screenX: floor((t1.screenX + t2.screenX) / 2),
      screenY: floor((t1.screenY + t2.screenY) / 2),
      clientX: floor((t1.clientX + t2.clientX) / 2),
      clientY: floor((t1.clientY + t2.clientY) / 2),
      timeStamp: eventTime(e)
    });
  }

  // Like coordinates(), but for a mouse event
  function mouseCoordinates(e) {
    return Object.freeze({
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: e.clientX,
      clientY: e.clientY,
      timeStamp: eventTime(e)
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
    return (dx < GD.DOUBLE_TAP_DISTANCE &&
            dy < GD.DOUBLE_TAP_DISTANCE &&
            dt < GD.DOUBLE_TAP_TIME);
  }

  //
  // The following objects are the states of our Finite State Machine
  //

  // In this state we're not processing any gestures, just waiting
  // for an event to start a gesture and ignoring others
  var initialState = {
    name: 'initialState',
    init: function(d) {
      // When we enter or return to the initial state, clear
      // the detector properties that were tracking gestures
      // Don't clear d.lastTap here, though. We need it for dbltap events
      d.target = null;
      d.start = d.last = null;
      d.touch1 = d.touch2 = null;
      d.vx = d.vy = null;
      d.startDistance = d.lastDistance = null;
      d.startDirection = d.lastDirection = null;
      d.scaled = d.rotated = null;
    },

    // Switch to the touchstarted state and process the touch event there
    // Once we've started processing a touch gesture we'll ignore mouse events
    touchstart: function(d, e, t) {
      d.switchTo(touchStartedState, e, t);
    },

    // Or if we see a mouse event first, then start processing a mouse-based
    // gesture, and ignore any touch events
    mousedown: function(d, e) {
      d.switchTo(mouseDownState, e);
    }
  };

  // One finger is down but we haven't generated any event yet. We're
  // waiting to see...  If the finger goes up soon, its a tap. If the finger
  // stays down and still, its a hold. If the finger moves its a pan/swipe.
  // And if a second finger goes down, its a transform
  var touchStartedState = {
    name: 'touchStartedState',
    init: function(d, e, t) {
      // Remember the target of the event
      d.target = e.target;
      // Remember the id of the touch that started
      d.touch1 = t.identifier;
      // Get the coordinates of the touch
      d.start = d.last = coordinates(e, t);
      // Start a timer for a hold
      // If we're doing hold events, start a timer for them
      if (d.options.holdEvents)
        d.startTimer('holdtimeout', GD.HOLD_INTERVAL);
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

      if (abs(t.screenX - d.start.screenX) > GD.PAN_THRESHOLD ||
          abs(t.screenY - d.start.screenY) > GD.PAN_THRESHOLD) {
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
    }

  };

  // A single touch has moved enough to exceed the pan threshold and now
  // we're going to generate pan events after each move and a swipe event
  // when the touch ends. We ignore any other touches that occur while this
  // pan/swipe gesture is in progress.
  var panStartedState = {
    name: 'panStartedState',
    init: function(d, e, t) {
      // If we transition into this state with a touchmove event,
      // then process it with that handler. If we don't do this then
      // we can end up with swipe events that don't know their velocity
      if (e.type === 'touchmove')
        panStartedState.touchmove(d, e, t);
    },

    touchmove: function(d, e, t) {
      // Ignore any fingers other than the one we're tracking
      if (t.identifier !== d.touch1)
        return;

      // Each time the touch moves, emit a pan event but stay in this state
      var current = coordinates(e, t);
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
      var dt = current.timeStamp - d.last.timeStamp;
      var vx = (current.screenX - d.last.screenX) / dt;
      var vy = (current.screenY - d.last.screenY) / dt;

      if (d.vx == null) { // first time; no average
        d.vx = vx;
        d.vy = vy;
      }
      else {
        d.vx = d.vx * GD.VELOCITY_SMOOTHING +
          vx * (1 - GD.VELOCITY_SMOOTHING);
        d.vy = d.vy * GD.VELOCITY_SMOOTHING +
          vy * (1 - GD.VELOCITY_SMOOTHING);
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
      var angle = atan2(dy, dx) * 180 / PI;
      if (angle < 0)
        angle += 360;

      // Direction is 'right', 'down', 'left' or 'up'
      var direction;
      if (angle >= 315 || angle < 45)
        direction = 'right';
      else if (angle >= 45 && angle < 135)
        direction = 'down';
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
    name: 'holdState',
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
        dy: current.screenY - d.start.screenY
      });
      d.switchTo(initialState);
    }
  };

  // We enter this state if a second touch starts before we start
  // recoginzing any other gesture.  As the touches move we track the
  // distance and angle between them to report scale and rotation values
  // in transform events.
  var transformState = {
    name: 'transformState',
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
        if (abs(distance - d.startDistance) > GD.SCALE_THRESHOLD)
          d.scaled = true;
        else
          distance = d.startDistance;
      }
      if (!d.rotated) {
        if (abs(rotation) > GD.ROTATE_THRESHOLD)
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
            rotate: touchRotation(d.startDirection, direction)
          },
          relative: { // transform since last gesture change
            scale: distance / d.lastDistance,
            rotate: touchRotation(d.lastDirection, direction)
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
    }
  };

  // We did a tranform and one finger went up. Wait for that finger to
  // come back down or the other finger to go up too.
  var afterTransformState = {
    name: 'afterTransformState',
    touchstart: function(d, e, t) {
      d.switchTo(transformState, e, t);
    },

    touchend: function(d, e, t) {
      if (t.identifier === d.touch1)
        d.switchTo(initialState);
    }
  };

  var mouseDownState = {
    name: 'mouseDownState',
    init: function(d, e) {
      // Remember the target of the event
      d.target = e.target;

      // Register this detector as a *capturing* handler on the document
      // so we get all subsequent mouse events until we remove these handlers
      var doc = d.element.ownerDocument;
      doc.addEventListener('mousemove', d, true);
      doc.addEventListener('mouseup', d, true);

      // Get the coordinates of the mouse event
      d.start = d.last = mouseCoordinates(e);

      // Start a timer for a hold
      // If we're doing hold events, start a timer for them
      if (d.options.holdEvents)
        d.startTimer('holdtimeout', GD.HOLD_INTERVAL);
    },

    mousemove: function(d, e) {
      // If the mouse has moved more than the panning threshold,
      // then switch to the mouse panning state. Otherwise remain
      // in this state

      if (abs(e.screenX - d.start.screenX) > GD.MOUSE_PAN_THRESHOLD ||
          abs(e.screenY - d.start.screenY) > GD.MOUSE_PAN_THRESHOLD) {
        d.clearTimer('holdtimeout');
        d.switchTo(mousePannedState, e);
      }
    },

    mouseup: function(d, e) {
      // Remove the capturing event handlers
      var doc = d.element.ownerDocument;
      doc.removeEventListener('mousemove', d, true);
      doc.removeEventListener('mouseup', d, true);

      // If there was a previous tap that was close enough in time
      // and space, then emit a 'dbltap' event
      if (d.lastTap && isDoubleTap(d.lastTap, d.start)) {
        d.emitEvent('tap', d.start);
        d.emitEvent('dbltap', d.start);
        d.lastTap = null; // so we don't get another one
      }
      else {
        // Emit a 'tap' event using the starting coordinates
        // as the event details
        d.emitEvent('tap', d.start);

        // Remember the coordinates of this tap so we can detect double taps
        d.lastTap = mouseCoordinates(e);
      }

      // In either case clear the timer and go back to the initial state
      d.clearTimer('holdtimeout');
      d.switchTo(initialState);
    },

    holdtimeout: function(d) {
      d.switchTo(mouseHoldState);
    }
  };

  // Like holdState, but for mouse events instead of touch events
  var mouseHoldState = {
    name: 'mouseHoldState',
    init: function(d) {
      d.emitEvent('holdstart', d.start);
    },

    mousemove: function(d, e) {
      var current = mouseCoordinates(e);
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

    mouseup: function(d, e) {
      var current = mouseCoordinates(e);
      d.emitEvent('holdend', {
        start: d.start,
        end: current,
        dx: current.screenX - d.start.screenX,
        dy: current.screenY - d.start.screenY
      });
      d.switchTo(initialState);
    }
  };

  var mousePannedState = {
    name: 'mousePannedState',
    init: function(d, e) {
      // If we transition into this state with a mousemove event,
      // then process it with that handler. If we don't do this then
      // we can end up with swipe events that don't know their velocity
      if (e.type === 'mousemove')
        mousePannedState.mousemove(d, e);
    },
    mousemove: function(d, e) {
      // Each time the mouse moves, emit a pan event but stay in this state
      var current = mouseCoordinates(e);
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
      var dt = current.timeStamp - d.last.timeStamp;
      var vx = (current.screenX - d.last.screenX) / dt;
      var vy = (current.screenY - d.last.screenY) / dt;

      if (d.vx == null) { // first time; no average
        d.vx = vx;
        d.vy = vy;
      }
      else {
        d.vx = d.vx * GD.VELOCITY_SMOOTHING +
          vx * (1 - GD.VELOCITY_SMOOTHING);
        d.vy = d.vy * GD.VELOCITY_SMOOTHING +
          vy * (1 - GD.VELOCITY_SMOOTHING);
      }

      d.last = current;
    },
    mouseup: function(d, e) {
      // Remove the capturing event handlers
      var doc = d.element.ownerDocument;
      doc.removeEventListener('mousemove', d, true);
      doc.removeEventListener('mouseup', d, true);

      // Emit a swipe event when the mouse goes up.
      // Report start and end point, dx, dy, dt, velocity and direction
      var current = mouseCoordinates(e);

      // FIXME:
      // lots of code duplicated between this state and the corresponding
      // touch state, can I combine them somehow?
      var dx = current.screenX - d.start.screenX;
      var dy = current.screenY - d.start.screenY;
      // angle is a positive number of degrees, starting at 0 on the
      // positive x axis and increasing clockwise.
      var angle = atan2(dy, dx) * 180 / PI;
      if (angle < 0)
        angle += 360;

      // Direction is 'right', 'down', 'left' or 'up'
      var direction;
      if (angle >= 315 || angle < 45)
        direction = 'right';
      else if (angle >= 45 && angle < 135)
        direction = 'down';
      else if (angle >= 135 && angle < 225)
        direction = 'left';
      else if (angle >= 225 && angle < 315)
        direction = 'up';

      d.emitEvent('swipe', {
        start: d.start,
        end: current,
        dx: dx,
        dy: dy,
        dt: current.timeStamp - d.start.timeStamp,
        vx: d.vx,
        vy: d.vy,
        direction: direction,
        angle: angle
      });

      // Go back to the initial state
      d.switchTo(initialState);
    }
  };

  return GD;
}());
