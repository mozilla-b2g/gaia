var CameraOrientation = (function() {
  'use strict';

  // The time interval is allowed between two orientation change event
  const ORIENTATION_CHANGE_INTERVAL = 300;

  // The maximum sample inter-arrival time in milliseconds. If the acceleration
  // samples are further apart than this amount in time, we reset the state of
  // the low-pass filter and orientation properties.  This helps to handle
  // boundary conditions when the app becomes invisisble, wakes from suspend or
  // there is a significant gap in samples.
  const MAX_MOTION_FILTER_TIME = 1000;

  // Filtering adds latency proportional the time constant (inversely
  // proportional to the cutoff frequency) so we don't want to make the time
  // constant too large or we can lose responsiveness.  Likewise we don't want
  // to make it too small or we do a poor job suppressing acceleration spikes.
  // Empirically, 100ms seems to be too small and 500ms is too large. Android
  // default is 200. The original version is from:
  // http://mxr.mozilla.org/mozilla-central/source/widget/gonk/
  //                                                      ProcessOrientation.cpp
  const MOTION_FILTER_TIME_CONSTANT = 200;

  var lastMotionFilteredTime = 0;
  var lastMotionData = {x: 0, y: 0, z: 0, t: 0};
  var pendingOrientation = 0;
  var orientationChangeTimer = 0;
  var eventListeners = {'orientation': []};

  function applyFilter(x, y, z) {
    var now = new Date().getTime();
    var filterReset = false;
    // The motion event is too far from last filtered data, reset the data.
    // This may be the case of hide app and go back.
    if (now > lastMotionData.t + MAX_MOTION_FILTER_TIME) {
      // clear data to re-initialize it.
      lastMotionData.x = 0;
      lastMotionData.y = 0;
      lastMotionData.z = 0;
      filterReset = true;
    }
    // applying the exponential moving average to x, y, z, when we already have
    // value of it.
    if (lastMotionData.x || lastMotionData.y || lastMotionData.z) {
      // use time to calculate alpha
      var diff = now - lastMotionFilteredTime;
      var alpha = diff / (MOTION_FILTER_TIME_CONSTANT + diff);

      // weight the x, y, z with alpha
      x = alpha * (x - lastMotionData.x) + lastMotionData.x;
      y = alpha * (y - lastMotionData.y) + lastMotionData.y;
      z = alpha * (z - lastMotionData.z) + lastMotionData.z;
    }

    // update the filter state.
    lastMotionData.x = x;
    lastMotionData.y = y;
    lastMotionData.z = z;
    lastMotionData.t = now;
    return filterReset;
  }

  function calcOrientation(x, y) {
    // use atan2(-x, y) to calculate the rotation on z axis.
    var orientationAngle = (Math.atan2(-x, y) * 180 / Math.PI);
    // The value range of atan2 is [-180, 180]. To have the [0, 360] value
    // range, we need to add 360 degrees when the angle is less than 0.
    if (orientationAngle < 0) {
      orientationAngle += 360;
    }

    // find the nearest orientation.
    // If an angle is >= 45 degrees, we view it as 90 degrees. If an angle is <
    // 45, we view it as 0 degree.
    var orientation = (((orientationAngle + 45) / 90) >> 0) % 4 * 90;
    return orientation;
  }

  function handleMotionEvent(e) {
    if (!e.accelerationIncludingGravity) {
      return;
    }
    var filterReset = applyFilter(e.accelerationIncludingGravity.x,
                                  e.accelerationIncludingGravity.y,
                                  e.accelerationIncludingGravity.z);

    // We don't need to process the event when filter is reset or no data.
    if (filterReset) {
      return;
    }

    var x = lastMotionData.x;
    var y = lastMotionData.y;
    var z = lastMotionData.z;

    // We only want to measure gravity, so ignore events when there is
    // significant acceleration in addition to gravity because this means the
    // user is moving the phone.
    if ((x * x + y * y + z * z) > 110) {
      return;
    }
    // If the camera is close to horizontal (pointing up or down) then we can't
    // tell what orientation the user intends, so we just return now without
    // changing the orientation. The constant 9.2 is the force of gravity (9.8)
    // times the cosine of 20 degrees. So if the phone is within 20 degrees of
    // horizontal, we will never change the orientation.
    if (z > 9.2 || z < -9.2) {
      return;
    }

    var orientation = calcOrientation(x, y);

    if (orientation === pendingOrientation) {
      return;
    }

    // When phone keeps the same orientation for ORIENTATION_CHANGE_INTERVAL
    // time interval, we change the orientation. Otherwrise the change is
    // cancelled. This may be that user rotates phone rapidly but captured by
    // device motion.
    if (orientationChangeTimer) {
      window.clearTimeout(orientationChangeTimer);
    }

    // create timer for waiting to rotate the phone
    pendingOrientation = orientation;
    orientationChangeTimer = window.setTimeout(function doOrient() {
      fireOrientationChangeEvent(pendingOrientation);
      orientationChangeTimer = 0;
    }, ORIENTATION_CHANGE_INTERVAL);
  }

  function start() {
    window.addEventListener('devicemotion', handleMotionEvent);
  }

  function stop() {
    window.removeEventListener('devicemotion', handleMotionEvent);
  }

  function addEventListener(type, listener) {
    if (eventListeners[type] && listener) {
      eventListeners[type].push(listener);
    }
  }

  function removeEventListener(type, listener) {
    if (!eventListeners[type]) {
      return;
    }
    var idx = eventListeners[type].indexOf(listener);
    if (idx > -1) {
      eventListeners.slice(idx, 1);
    }
  }

  function fireOrientationChangeEvent(orientation) {
    eventListeners['orientation'].forEach(function(listener) {
      if (listener.handleEvent) {
        listener.handleEvent(orientation);
      } else if ((typeof listener) === 'function') {
        listener(orientation);
      }
    });
  }

  return {
    start: start,
    stop: stop,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener
  };

})();
