define(function(require, exports, module) {
'use strict';

/**
 * Exports
 */

module.exports = {
  CAMERA_MODE_TYPE: {
    PICTURE: 'picture',
    VIDEO: 'video'
  },

  STORAGE_STATE_TYPE: {
    INIT: 0,
    AVAILABLE: 1,
    NOCARD: 2,
    UNMOUNTED: 3,
    CAPACITY: 4
  },

  FOCUS_MODE_TYPE: {
    MANUALLY_TRIGGERED: 'auto',
    CONTINUOUS_CAMERA: 'continuous-picture',
    CONTINUOUS_VIDEO: 'continuous-video'
  },

  PROMPT_DELAY: 2000,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN: 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING: 1024 * 1024 * 1,

  // Minimum video duration length for creating a video that contains at least
  // few samples, see bug 899864.
  MIN_RECORDING_TIME: 1000,

  // Amount of inactivity time (in milliseconds) to hide the Zoom Bar
  ZOOM_BAR_INACTIVITY_TIMEOUT: 3000,

  // Amount (%) to adjust the Zoom Bar by when tapping the min/max indicators
  ZOOM_BAR_INDICATOR_INTERVAL: 10,

  // Used to adjust sensitivity for pinch-to-zoom gesture
  // (smaller values = more sensitivity)
  ZOOM_GESTURE_SENSITIVITY: 200
};

});
