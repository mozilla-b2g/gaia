/*
 * On low-end devices like the Tarako, the touch-screen hardware only
 * partially supports multi-touch. The sensor hardware is arranged in
 * horizontal bands and each band can only detect a single touch. If two
 * fingers touch the screen in different bands, then two distinct touches are
 * detected. But if the two fingers touch the screen in the same band (that
 * is, if the two touches have similar Y coordinates) then only a single touch
 * will be detected. Because of the nature of the hardware, the single
 * reported touch location will be between the two actual touch positions.
 * The specific touch location reported by the hardware seems to depend on the
 * relative pressure of the touches. (Note that for apps that support
 * landscape mode, we'll have this problem with any two touches that have
 * similar X coordinates instead of Y coordinates.)
 *
 * In practice, two touches are never simultaneous, so what we see is a
 * touchstart event at the location of the first touch, followed by a series
 * of touchmove events when the second finger touches within the same sensor
 * band. This limitation of the touchscreen hardware manifests in various
 * ways:
 *
 * - In the keyboard app, touching Q and P at the same time highlights the T
 *   or Y keys. (Or a different key if you carefully control the pressure of
 *   the touches.)
 *
 * - On the pre-2.0 homescreen with side to side swiping, tapping on the left
 *   and right edges of the screen can cause a move event that will pan to a
 *   new page.
 *
 * - In the gallery app, left and right taps can be used to swipe between
 *   photos. More problematic, however is that a horizontal pinch-to-zoom
 *   gesture causes the photo to pan rather than zoom. Horizontal pinches are
 *   actually physically awkward for users so are not common. But if the phone
 *   is rotated into landscape mode, then it is vertical pinches that cause
 *   panning instead of zooming.
 *
 * There is no way to fully work around these fundamental hardware limitations
 * in software. This module attempts to minimize the bugginess of the hardware
 * by:
 *
 *  1) filtering out touchmove events that appear to be caused by two touches
 *     instead of by an actual finger motion.
 *
 *  2) alerting the user when this happens with subtle vibration so that they
 *     can learn to correct their touchscreen behavior.
 *
 * This patch was developed with the keyboard app in mind. That is an app that
 * uses lots of rapid touches, but almost no horizontal swiping. So in this
 * app, any moderately fast moves are probably failed multitouches and we can
 * safely block them. The same fix would not work for apps (like Homescreen
 * and Gallery) that actually expect the user to swipe left or right because
 * in those apps we would often incorrectly block real swipes.
 *
 * In the implementation that follows, I use the metaphor of a typewriter jam
 * (which happens during rapid typing when two of the metal arms of the
 * typewriter collide and get physically stuck). When the code detects a
 * sudden horizontal touch movement that looks like a multitouch failure, I
 * say that the touch is "jammed" and stop sending move events until it
 * becomes unjammed.
 *
 * This module is a self-executing function. To use it, it is sufficient to
 * simply include it in your app. Note, however, that it checks the
 * deviceinfo.hardware setting, so it only works in certified apps that can
 * use the settings API and and only runs on the hardware models that are
 * explicitly listed below.
 */
(function fixLowEndTouchScreen() {
  'use strict';

  // The list of device names for devices that need this fix.
  // According to bug 1038045 the ZTE Open should also be added to this list.
  const LOW_END_DEVICES = [
    'sp8810'   // Tarako
  ];

  const DEBUG = true;
  var debug;
  if (DEBUG) {
    debug = function debug(...args) {
      args.unshift('[TouchScreenFix]');
      console.log.apply(console, args);
    };
  }
  else {
    debug = function() {};
  }

  // The constants that follow are values that we might need to tweak to
  // get this to work well. We could make them configurable through the
  // settings database if we need to so that they can be tuned to different
  // hardware.

  // These are values that we use to define what sequences of touchmove events
  // consititute a multitouch jam.
  const MINIMUM_DISTANCE = 20;  // pixel in a single touchmove event
  const MAXIMUM_SLOPE = 0.5;    // absolute value of rise over run
  const MAXIMUM_INTERVAL = 30;  // milliseconds between move events
  const MIMIMUM_VELOCITY = 1.7; // pixels per millisecond

  // This constant specifies how long a touch needs to be still at a point
  // to be considered the starting position before a jam began.
  const STILLNESS_TIME = 75;     // milliseconds

  // This constant specifies how close we need to get back to the jam
  // start position before we consider the jam to have ended
  const JAM_OVER_DISTANCE = 10; // pixels

  // When a jam occurs we offer feedback by vibrating with this pattern
  const JAM_VIBRATION_PATTERN = [25, 50, 25, 50, 25];

  // Before we actually do anything, we need to find out if we're on a
  // device with a low-end touch screen. If we're not on one of the low-end
  // devices listed above, this will never call startFiltering and we will
  // never do anything.
  isLowEndDevice();

  function isLowEndDevice() {
    var req = navigator.mozSettings.createLock().get('deviceinfo.hardware');
    req.onsuccess = function() {
      var device = req.result['deviceinfo.hardware'];
      if (LOW_END_DEVICES.indexOf(device) !== -1) {
        debug('Filtering events from low-end touch screen on device:', device);
        startFiltering();
      }
      else {
        debug('Not filtering touch events for device:', device);
      }
    };
  }

  function startFiltering() {
    window.addEventListener('touchstart', handleTouchStart, true);
    window.addEventListener('touchmove', handleTouchMove, true);
    window.addEventListener('touchend', handleTouchEnd, true);
  }

  // This object holds all the data we need to store to filter touches.
  // Its properties are touch ids and the values of those properties are
  // other objects.
  var touchData = {};

  // For touchstart we just record the initial position but don't filter.
  function handleTouchStart(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      touchData[t.identifier] = {
        identifier: t.identifier,
        jammed: false,
        touches: [{
          x: t.pageX,
          y: t.pageY,
          t: e.timeStamp
        }]
      };
    }
  }

  // Every time we see a touch move we check to see if it is a rapid movement
  // that might be a failed multi-touch and filter it out if so.
  function handleTouchMove(e) {
    // If this is an event we've synthesized, ignore it
    if (!e.isTrusted) {
      return;
    }

    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var data = touchData[t.identifier];
      if (data) {
        data.touches.push({
          x: t.pageX,
          y: t.pageY,
          t: e.timeStamp
        });

        if (!data.jammed) {         // If we're not already jammed
          if (isJammed(data)) {     // Then if we've found a jam
            data.jammed = true;
            e.stopPropagation();                // don't send the event
            sendJamFeedback();                  // alert the user
            moveBackToJamStart(e, t, data);     // undo previous moves
            debug('multitouch jam detected.');
          }
        }
        else {                      // If we are jammed,
          if (isUnjammed(data)) {   // See if the jam is over
            data.jammed = false;
            debug('multitouch jam over');
          }
          else {                    // And if not
            e.stopPropagation();    // then ignore this move event.
          }
        }
      }
    }
  }

  // When a touchend event arrives, we can delete the data we've stored.
  // But if we're still jammed when this happens, we have to filter out
  // the touchend and send a synthetic one instead.
  function handleTouchEnd(e) {
    // If this is an event we've synthesized, ignore it
    if (!e.isTrusted) {
      return;
    }

    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      var data = touchData[t.identifier];

      if (data.jammed) {
        e.stopPropagation();
        debug('cancelling touchend event while jammed');
        sendSyntheticTouchEnd(e, t, data);
      }

      delete touchData[t.identifier];
    }
  }

  // Do the last two touch events indicate that a multitouch jam has occured?
  function isJammed(data) {
    var touches = data.touches;

    // We need at least two events to tell if this is a jam
    if (touches.length < 2) {
      return false;
    }

    var touch0 = touches[touches.length - 2];
    var touch1 = touches[touches.length - 1];
    var dx = touch1.x - touch0.x;
    var dy = touch1.y - touch0.y;
    var dt = touch1.t - touch0.t;

    // If the phone is in portrait mode, a sudden horizontal movement
    // may be a jam. In landscape mode, a sudden vertical movement may
    // be a jam. There are various constants we use to define "sudden",
    // "horizontal", "vertical" and "movement".
    var jammed;
    if (screen.width < screen.height) {           // Portrait orientation:
      jammed =
        Math.abs(dx) >= MINIMUM_DISTANCE &&       // big enough motion
        Math.abs(dy / dx) <= MAXIMUM_SLOPE &&     // flat enough trajectory
        dt <= MAXIMUM_INTERVAL &&                 // sudden enough
        Math.abs(dx / dt) >= MIMIMUM_VELOCITY;    // fast enough
    }
    else {                                        // Landscape orientation:
      jammed =
        Math.abs(dy) >= MINIMUM_DISTANCE &&       // big enough motion
        Math.abs(dx / dy) <= MAXIMUM_SLOPE &&     // flat enough trajectory
        dt <= MAXIMUM_INTERVAL &&                 // sudden enough
        Math.abs(dy / dt) >= MIMIMUM_VELOCITY;    // fast enough
    }

    // Clean up if the array of touches has gotten long
    if (!jammed && touches.length >= 64) {
      touches = touches.splice(0, touches.length - 8);
    }

    return jammed;
  }

  //
  // When we detect a jam we start blocking the propagation of touch move
  // events. But by the time we detect it, we've typically already let at
  // least one bad touch move event get through. So now we need to try to
  // figure out where the touch was positioned when the jam started and
  // send a synthetic event to move back to that position. To figure out
  // when and where the jam stared we look back through the list of
  // touches to find a period of stillness before rapid move events begin.
  //
  // We could go farther here and ensure that all of the touchmove events
  // we consider are actually movements on the same trajectory as the jam
  // but given how relatively short the STILLNESS_TIME interval is that does
  // not seem necessary.
  //
  // Note that this is not a perfect algorithm and users can fake it
  // out.  With very gentle pressure on the second touch a use can
  // cause move events that do not exceed the jam thresholds and can
  // gently move the touch point, then hold it still, then cause a
  // rapid motion (with a sudden increase in pressure and
  // release). In this case a jam will be detected but the starting
  // point will be incorrect, and we will move the touch to the wrong
  // spot. This is not likely to occur in typical keyboard usage, however.
  //
  function moveBackToJamStart(e, t, data) {
    // Loop back through the touches to try to find the last one
    // before the jam began.
    for (var i = data.touches.length - 2; i > 0; i--) {
      if (data.touches[i + 1].t - data.touches[i].t > STILLNESS_TIME) {
        break;
      }
    }
    var jamStart = data.touches[i];

    // Record the touch coordinates where the jam started. We'll use these
    // when deciding that the jam is over.
    data.jamX = jamStart.x;
    data.jamY = jamStart.y;

    // This is the most recent unfiltered touchmove
    var lastTouch = data.touches[data.touches.length - 2];

    // If the jam did not start with the most recent move event, then
    // send a synthetic event to move back to the jam start location
    if (jamStart !== lastTouch) {
      debug('sending synthetic touchmove event to:', data.jamX, data.jamY);

      var dx = t.pageX - jamStart.x;
      var dy = t.pageY - jamStart.y;
      var syntheticTouch =
        document.createTouch(window, e.target, data.identifier,
                             jamStart.x, jamStart.y,
                             t.screenX - dx, t.screenY - dy,
                             t.clientX - dx, t.clientY - dy,
                             t.radiusX, t.radiusY, t.rotationAngle, t.force);
      var syntheticTouches = document.createTouchList([syntheticTouch]);
      var syntheticEvent = document.createEvent('TouchEvent');
      syntheticEvent.initTouchEvent('touchmove', true, true,
                                    e.view, e.detail,
                                    e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                                    syntheticTouches,
                                    syntheticTouches,
                                    syntheticTouches);
      e.target.dispatchEvent(syntheticEvent);
    }
  }

  // We go back to an unjammed state (and stop filtering touchmove events)
  // when the touch has moved back to be close to the start point of the jam.
  function isUnjammed(data) {
    var touches = data.touches;

    // Clean up if the array of touches has gotten long
    if (touches.length >= 64) {
      touches = touches.splice(0, touches.length - 8);
    }

    if (!data.jammed) {
      return true;
    }

    if (!touches.length) {
      return false;
    }

    // If the most recent touch is close enough to the location of the
    // original jam, then we consider ourselves unjammed.
    var lastTouch = touches[touches.length - 1];
    var dx = lastTouch.x - data.jamX;
    var dy = lastTouch.y - data.jamY;

    return Math.abs(dx) < JAM_OVER_DISTANCE && Math.abs(dy) < JAM_OVER_DISTANCE;
  }

  // Give the user feedback that a jam has occured. For the keyboard
  // app this serves as a 'type slower' signal.
  // We should probably have a setting that controls whether we do this.
  function sendJamFeedback() {
    navigator.vibrate(JAM_VIBRATION_PATTERN);
  }

  // If we get a touchend event while we're still jammed (typically
  // because the user lifted the original finger first, and then
  // lifted the second finger) we filter that touchend out because it
  // will have the wrong coordinates. In that case, we need to send a
  // fake touchend event with the coordinates at which the jam started.
  function sendSyntheticTouchEnd(e, t, data) {
    debug('sending synthetic touchend event at:', data.jamX, data.jamY);
    var dx = t.pageX - data.jamX;
    var dy = t.pageY - data.jamY;

    var syntheticTouch =
      document.createTouch(window, e.target, t.identifier,
                           data.jamX, data.jamY,
                           t.screenX - dx, t.screenY - dy,
                           t.clientX - dx, t.clientY - dy,
                           t.radiusX, t.radiusY, t.rotationAngle, t.force);
    var syntheticTouches = document.createTouchList([syntheticTouch]);
    var syntheticEvent = document.createEvent('TouchEvent');
    syntheticEvent.initTouchEvent('touchend', true, true,
                                  e.view, e.detail,
                                  e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                                  syntheticTouches,
                                  syntheticTouches,
                                  syntheticTouches);
    e.target.dispatchEvent(syntheticEvent);
  }
}());
