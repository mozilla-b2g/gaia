const CAMERA_MODE_TYPE = {
    CAMERA: 'camera',
    VIDEO: 'video'
  },

  STORAGE_STATE_TYPE = {
    INIT: 0,
    AVAILABLE: 1,
    NOCARD: 2,
    UNMOUNTED: 3,
    CAPACITY: 4
  },

  FOCUS_MODE_TYPE = {
    MANUALLY_TRIGGERED: 'auto',
    CONTINUOUS_CAMERA: 'continuous-picture',
    CONTINUOUS_VIDEO: 'continuous-video'
  },

  FILMSTRIP_DURATION = 5000,

  PROMPT_DELAY = 2000,

  // The minimum available disk space to start recording a video.
  RECORD_SPACE_MIN = 1024 * 1024 * 2,

  // Number of bytes left on disk to let us stop recording.
  RECORD_SPACE_PADDING = 1024 * 1024 * 1,

  // An estimated JPEG file size is caluclated from 90% quality 24bit/pixel
  ESTIMATED_JPEG_FILE_SIZE = 300 * 1024,

  // Minimum video duration length for creating a video that contains at least
  // few samples, see bug 899864.
  MIN_RECORDING_TIME = 500,

  MIN_VIEWFINDER_SCALE = 1.0,

  MAX_VIEWFINDER_SCALE = 4.0;
