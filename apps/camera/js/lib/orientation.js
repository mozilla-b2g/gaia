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
    get: function() {
      return current;
    }
  };
});
