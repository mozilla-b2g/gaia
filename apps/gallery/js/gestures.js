/**
 * gestures.js: high-level gesture events on top of multi-touch events.
 *  
 * This module defines an extensible multi-touch gesture event framework
 * and includes built-in support for two-finger transform (scale, rotate, 
 * translate) gestures such as pinch-to-zoom and twist-to-rotate. The
 * documentation for transform gestures appears later in this file.
 * 
 * This module defines a single global variable, Gestures, which is an
 * object with three function properties:
 * 
 * Gestures.detect(type, target):
 *   Start listening for touch events on the specified target element
 *   to detect gestures of the specified type. The type argument is a
 *   string. Support for "transform" events is built in, and new gesture
 *   types can be added with Gestures.addDetector(). When gestures are
 *   detected, custom events are fired on the target element. The event
 *   type and event details depend on the gesture detector.
 * 
 * Gestures.ignore(type, target):
 *   Stop listening for touch events on target and stop detecting 
 *   gestures of the specified type.
 *
 * Gestures.addDetector(type, detector):
 *   This function defines a new gesture detector. type is the gesture
 *   name as a string. detector is the constructor for the gesture detector
 *   class, which is described below.
 *
 * Gesture detectors are simple classes: they must define a no-argument
 * constructor and a single method named touchesChanged(). As the name
 * suggests, that method will be called every time the set of touches
 * on the target element changes. It gets called for touchstart, touchmove
 * and touchend events.  Instead of dealing with the event objects themselves,
 * though, a gesture detector just has to deal with the array of touch objects.
 * (See the touch event documentation for more on Touch objects). The return
 * value of the touchesChanged() method specifies what kind of event, if any
 * should be generated. If the method returns null, then no event is triggered.
 * Otherwise, it should return a two-element array. The first element should
 * be a string and will be the type of the event that is generated. The
 * second array element can be any value (including an object) and will 
 * be the value of the detail property of the event. Event names
 * for a gesture type "x" will typically be xgesturestart, xgesture, and
 * xgestureend, but this is dependent on the gesture detector.
 **/
var Gestures = (function() {
  // Map supported gesture types to the classes that detect them
  var gestureDetectors = {};

  // This is the public Gestures.addDetector() function
  function addDetector(type, detector) {
    gestureDetectors[type] = detector;
  }

  // The list of {type,target,handlers} tuples that are currently active.
  // Each time we call detect(), we add an entry to this array to store
  // the event handlers registered by detect(). We need this so that
  // ignore() can remove those event handlers.
  var detectors = [];

  // Find an entry in the detectors[] array.
  function findDetector(type, target) {
    for(var i = detectors.length-1; i >= 0; i--) {
      if (detectors[i].type === type && detectors[i].target === target) 
        break;
    }
    return i;
  }

  // This is the public Gestures.ignore() function
  function ignore(type, target) {
    if (!(type in gestureDetectors))
      throw Error("unknown gesture type " + type)

    var index = findDetector(type, target);
    if (index === -1)
      throw Error("not detecting " + type + " gestures for " + target);

    var listeners = detectors[index].listeners;
    detectors.splice(index, 1);

    target.removeEventListener('touchstart', listeners[0]);
    target.removeEventListener('touchmove', listeners[1]);
    target.removeEventListener('touchend', listeners[2]);
    target.removeEventListener('touchcancel', listeners[3]);
  }

  // This is the public Gestures.detect() function
  function detect(type, target) {
    if (!(type in gestureDetectors))
      throw Error("unknown gesture type " + type)

    if (findDetector(type, target) !== -1) 
      throw Error("already detecting " + type + " gestures for " + target);
  
    // Create a new detector object to handle this gesture
    var detector = new gestureDetectors[type]();

    // This is the set of touches that we're going to track
    var touches = [];

    // Now register handlers to capture the rest of the gesture 
    // and to clean up when the gesture is complete.
    target.addEventListener('touchstart', handleTouchStart);
    target.addEventListener('touchmove', handleTouchMove);
    target.addEventListener('touchend', handleTouchEnd);
    target.addEventListener('touchcancel', handleTouchCancel);

    // Save those handlers so the ignore() method can deregister them
    detectors.push({
      type: type,
      target: target,
      listeners: [
        handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel
      ]
    });

    function handleTouchStart(e) {
      // Sometimes we get more than one changedTouch. And some of them.
      // may already be in our array of touches
      for(var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        for(var j = 0; j < touches.length; j++) {
          if (t.identifier === touches[j].identifier) {
            touches[j] = t; // A changed touch that is already down
            break;
          }
        }
        if (j == touches.length) // It wasn't already in the array
          touches.push(t);       // So add it as a new touch
      }
      triggerEvent(detector.touchesChanged(touches));
    }

    function handleTouchMove(e) {
      for(var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        for(var j = 0; j < touches.length; j++) {
          if (t.identifier === touches[j].identifier) 
            touches[j] = t;
        }
      }

      triggerEvent(detector.touchesChanged(touches));
    }

    function handleTouchEnd(e) {
      for(var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        for(var j = 0; j < touches.length; j++) {
          if (t.identifier === touches[j].identifier) {
            touches.splice(j, 1);
            break;
          }
        }
      }
      triggerEvent(detector.touchesChanged(touches));
    }

    function handleTouchCancel(e) {
      // I don't know if gecko ever generates these events
      // XXX: for now, just log them, and remove the listeners
      console.warn("Unexpected touchcancel event", e);
      triggerEvent("end");
    }

    // Trigger an event based on the return value from the detector's 
    // touchesChanged() method
    function triggerEvent(value) {
      if (value === undefined)
        return;
      
      var type = value[0];
      var detail = value[1];

      var event = target.ownerDocument.createEvent('CustomEvent');
      event.initCustomEvent(type, true, true, detail);
      target.dispatchEvent(event);
    }
  }

  // Return the public methods of the Gestures object
  return {
    detect: detect,
    ignore: ignore,
    addDetector: addDetector
  };
}());

/**
 * Define a detector for "transform" gestures. This gesture detector
 * looks for two finger gestures and allows scaling (pinch fingers
 * together or apart), rotation (twist fingers around their midpoint)
 * and panning (just move your two fingers in any direction).  When
 * the second finger first goes down, it fires a
 * "transformgesturestart" event. When either finger moves it fires a
 * "transformgesture" event. And when one or both fingers goes up (or
 * a third finger goes down) it fires a "transformgestureend" event.
 *
 * The transformgesturestart event has null for its detail property.
 *
 * The transformgestureend event has a detail object with four fields:
 *   scale: the overall scale factor for the gesture.
 *   rotate: the overall angle of rotation (in degrees) for the gesture.
 *   translateX: the overall X translation in pixels
 *   translateY: the overall Y translation in pixels
 * 
 * The transformgesture event has a detail object with two properties:
 * absolute and relative.  These both refer to objects with scale, rotate, 
 * translateX and translateY properties as for the transformgestureend 
 * event above. The absolute object specifes the overall transform since
 * the start of the gesture.  And the relative object specifies the 
 * how much the transform has changed since the last transformgesture 
 * event.
 **/ 
Gestures.addDetector("transform", (function() { 
  // Don't start transforming until the gesture exceeds a threshold
  var SCALE_THRESHOLD = 40;     // pixels
  var ROTATE_THRESHOLD = 22.5;  // degrees
  var TRANSLATE_THRESHOLD = 20; // pixels
  var START = ["transformgesturestart", null];

  // These utility functions will only be called when touches.length === 2
  function distanceBetween(touches) {
    var dx = touches[1].screenX - touches[0].screenX;
    var dy = touches[1].screenY - touches[0].screenY;
    return Math.sqrt(dx*dx + dy*dy);
  }
  function midpointBetween(touches) {
    return [(touches[0].screenX + touches[1].screenX)/2,
            (touches[0].screenY + touches[1].screenY)/2];
  }
  function angleBetween(touches) {
    return Math.atan2(touches[1].screenY - touches[0].screenY,
                      touches[1].screenX - touches[0].screenX) * 180 / Math.PI;
  }

  function TransformDetector() {
    this.gestureStarted = false;
    // Don't start any of these transforms until a certain 
    // minimum threshold is passed. After that, do them on each change
    this.scaled = this.rotated = this.xtranslated = this.ytranslated = false;
  }

  TransformDetector.prototype.touchesChanged = function(touches) {
    if (!this.gestureStarted) {
      if (touches.length === 2) {
        // start the gesture
        this.gestureStarted = true;
        this.initialDistance = this.lastDistance = distanceBetween(touches);
        this.initialAngle = this.lastAngle = angleBetween(touches);
        this.initialMidpoint = this.lastMidpoint = midpointBetween(touches);
        return START; // trigger gesture start
      }
      // Return undefined to trigger no event
      else return;
    }
    else {
      if (touches.length !== 2) {
        // If the gesture has started, but there are now too many
        // or too few gestures, then end the gesture.
        this.gestureStarted = false;
        this.scaled = this.rotated = false;
        this.xtranslated = this.ytranslated = false;

        // Trigger an end event, passing the overall transform between
        // the beginning and end of the gesture.
        return ["transformgestureend",  {
          scale: this.lastDistance/this.initialDistance,
          rotate: this.lastAngle - this.initialAngle,
          translateX: this.lastMidpoint[0] - this.initialMidpoint[0],
          translateY: this.lastMidpoint[1] - this.initialMidpoint[1],
        }];
      }
      else {
        // The gesture is already started and still has the right number
        // of fingers, so this is a continuation of it.  We'll be sending
        // a transformgesture event.

        // Compute the current stats about the two touches
        var newDistance = distanceBetween(touches);
        var newAngle = angleBetween(touches);
        var newMidpoint = midpointBetween(touches);

        // Check all of these numbers against the thresholds. Otherwise
        // the transforms are too jittery even when you try to hold your
        // fingers still.
        if (!this.scaled) {
          if (Math.abs(newDistance - this.initialDistance) > SCALE_THRESHOLD) 
            this.scaled = true;
          else
            newDistance = this.initialDistance;
        }
        if (!this.rotated) {
          if (Math.abs(newAngle - this.initialAngle) > ROTATE_THRESHOLD) 
            this.rotated = true;
          else
            newAngle = this.initialAngle;
        }
        if (!this.xtranslated) {
          var d = newMidpoint[0] - this.initialMidpoint[0]
          if (Math.abs(d) > TRANSLATE_THRESHOLD) 
            this.xtranslated = true;
          else
            newMidpoint[0] = this.initialMidpoint[0];
        }
        if (!this.ytranslated) {
          var d = newMidpoint[1] - this.initialMidpoint[1]
          if (Math.abs(d) > TRANSLATE_THRESHOLD) 
            this.ytranslated = true;
          else
            newMidpoint[1] = this.initialMidpoint[1];
        }

        // If nothing has exceeded the threshold yet, then we 
        // don't even have to fire an event.
        if (!this.scaled && !this.rotated &&
            !this.xtranslated && !this.ytranslated)
          return;


        // The detail field for the transform gesture event includes
        // "absolute" transformations against the initial values and
        // "relative" transformations against the values from the last
        // transformgesture event.

        var detail = {
          absolute: { // transform details since gesture start
            scale: newDistance/this.initialDistance,
            rotate: newAngle - this.initialAngle,
            translateX: newMidpoint[0] - this.initialMidpoint[0],
            translateY: newMidpoint[1] - this.initialMidpoint[1],
          },
          relative: { // transform since last gesture change
            scale: newDistance/this.lastDistance,
            rotate: newAngle - this.lastAngle,
            translateX: newMidpoint[0] - this.lastMidpoint[0],
            translateY: newMidpoint[1] - this.lastMidpoint[1],
          }
        }

        this.lastDistance = newDistance;
        this.lastAngle = newAngle;
        this.lastMidpoint = newMidpoint;

        return ["transformgesture", detail];
      }
    }
  }
 
  return TransformDetector;
}()));
