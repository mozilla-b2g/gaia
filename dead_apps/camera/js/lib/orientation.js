define(function(require, exports, module) {
  'use strict';

  var listener = require('device-orientation');
  var classes = document.body.classList;
  var current = 0;

  listener.on('orientation', onOrientationChange);
  listener.start();

  function onOrientationChange(degrees) {
    classes.remove('deg' + current);
    classes.add('deg' + degrees);
    current = degrees;
  }

  // Camera normally has its orientation locked to portrait mode.
  // But we unlock orientation when displaying image and video previews.
  // When orientation is unlocked, we call listener.stop().
  // We calls call stop() when recording a video, and then restart
  // when recording is done. If our app ever changes so that we can call
  // unlock while the orientation listener is in the stopped state, then
  // we would need to modify the lock() function so that it did not
  // restart the listener. That is not needed now, however and is omitted.

  function unlock() {
    screen.mozUnlockOrientation();
    listener.stop();
  }

  function lock() {
    screen.mozLockOrientation('default');
    listener.start();
  }

  function rationalize(sensorAngle, angle) {
    if (typeof(angle) === 'undefined') {
      angle = current;
    }

    // The result of this operation is an angle from 0..270 degrees,
    // in steps of 90 degrees. Angles are rounded to the nearest
    // magnitude, so 45 will be rounded to 90, and -45 will be rounded
    // to -90 (not 0).
    var r = angle + sensorAngle;
    if (r >= 0) {
      r += 45;
    } else {
      r -= 45;
    }
    r /= 90;
    if (r >= 0) {
      r = Math.floor(r);
    } else {
      r = Math.ceil(r);
    }
    r %= 4;
    r *= 90;
    if (r < 0) {
      r += 360;
    }
    return r;
  }

  /**
   * Exports
   */

  module.exports = {
    on: listener.on,
    off: listener.off,
    start: listener.start,
    stop: listener.stop,
    unlock: unlock,
    lock: lock,
    rationalize: rationalize,
    get: function() {
      return current;
    }
  };
});
