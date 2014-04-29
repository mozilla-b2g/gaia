define(function(require, exports, module) {
'use strict';

module.exports = {
  globals : {
    // The maximum picture size that camera is allowed to take
    CONFIG_MAX_IMAGE_PIXEL_SIZE: 5242880,
    CONFIG_MAX_SNAPSHOT_PIXEL_SIZE: 5242880,

    // Size of the exif preview embeded in images taken by camera
    CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH: 0,
    CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT: 0,

    // Minimum EXIF preview size that will be displayed as a
    // full-screen preview
    //CONFIG_REQUIRED_EXIF_PREVIEW_SIZE: { width: 640, height: 480},

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
    ZOOM_GESTURE_SENSITIVITY: 0.425
  },

  zoom: {
    disabled: false
  },

  caf: {
    // Set this property to true if you want to disable continuous auto focus
    // even on hardware that supports it.
    disabled: false
  },

  viewfinder: {
    scaleType: 'fill'
  },

  battery: {
    levels: {
      low: 15,
      verylow: 10,
      critical: 6,
      shutdown: 5,
      healthy: 100
    }
  },

  sounds: {
    list: [
      {
        name: 'shutter',
        setting: 'camera.shutter.enabled',
        url: './resources/sounds/shutter.ogg'
      },
      {
        name: 'recordingStart',
        url: './resources/sounds/camcorder_start.opus',
        setting: 'camera.recordingsound.enabled'
      },
      {
        name: 'recordingEnd',
        url: './resources/sounds/camcorder_end.opus',
        setting: 'camera.recordingsound.enabled'
      }
    ]
  },

  geolocation: {
    promptDelay: 2000
  },

  mode: {
    options: [
      {
        key: 'picture'
      },
      {
        key: 'video'
      }
    ],
    persistent: true
  },

  isoModes: {
    disabled: false,
    options: [
      {
        key: 'auto'
      }
    ],
    selected:'auto'
  },

  whiteBalance: {
    disabled: false,
    options: [
      {
        key: 'auto'
      }
    ],
    selected:'auto'
  },

  cameras: {
    options: [
      {
        key: 'back'
      },
      {
        key: 'front'
      }
    ],
    persistent: true
  },

  pictureSizesFront: {
    title: 'camera-resolution',
    header: 'camera-resolution-header',
    icon: 'icon-picture-size',
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    persistent: true
  },

  pictureSizesBack: {
    title: 'camera-resolution',
    header: 'camera-resolution-header',
    icon: 'icon-picture-size',
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    exclude: ['1920x1088'],
    persistent: true
  },

  recorderProfilesBack: {
    title: 'video-resolution',
    header: 'video-resolution-header',
    icon: 'icon-video-size',
    options: [],
    exclude: ['high', '1080p'],
    persistent: true
  },

  recorderProfilesFront: {
    title: 'video-resolution',
    header: 'video-resolution-header',
    icon: 'icon-video-size',
    options: [],
    persistent: true
  },

  flashModesPicture: {
    title: 'flash',
    options: [
      {
        key: 'auto',
        icon: 'icon-flash-auto',
        title: 'flash-auto'
      },
      {
        key: 'on',
        icon: 'icon-flash-on',
        title: 'flash-on'
      },
      {
        key: 'off',
        icon: 'icon-flash-off',
        title: 'flash-off'
      }
    ],
    persistent: true
  },

  flashModesVideo: {
    title: 'flash',
    options: [
      {
        key: 'off',
        icon: 'icon-flash-off',
        title: 'flash-off'
      },
      {
        key: 'torch',
        icon: 'icon-flash-on',
        title: 'flash-on'
      }
    ],
    persistent: true
  },

  timer: {
    title: 'self-timer',
    header: 'self-timer-header',
    icon: 'icon-timer',
    options: [
      {
        key: 'off',
        title: 'self-timer-off',
        value: 0
      },
      {
        key: '3secs',
        value: 3,
        title: 'self-timer-3-seconds'
      },
      {
        key: '5secs',
        value: 5,
        title: 'self-timer-5-seconds'
      },
      {
        key: '10secs',
        value: 10,
        title: 'self-timer-10-seconds'
      }
    ],
    persistent: false,
  },

  hdr: {
    title: 'hdr',
    header: 'hdr-header',
    icon: 'icon-hdr-menu',
    disabled: false,
    options: [
      {
        key: 'off',
        title: 'hdr-off'
      },
      {
        key: 'on',
        title: 'hdr-on'
      }
    ],
    persistent: true
  },

  scene: {
    title: 'scene-mode',
    header: 'scene-mode-header',
    icon: 'icon-scene',
    options: [
      {
        key: 'normal',
        title: 'scene-mode-normal'
      },
      {
        key: 'pano',
        title: 'scene-mode-panorama'
      },
      {
        key: 'beauty',
        title: 'scene-mode-beauty'
      }
    ],
    persistent: true,
  },

  grid: {
    title: 'grid',
    header: 'grid-header',
    icon: 'icon-frame-grid',
    options: [
      {
        key: 'off',
        title: 'grid-off'
      },
      {
        key: 'on',
        title: 'grid-on'
      }
    ],
    selected: 'off',
    persistent: true,
  },

  settingsMenu: {
    items: [
      // {
      //   key: 'scene'
      // },
      {
        key: 'hdr'
      },
      {
        key: 'timer'
      },
      // {
      //   key: 'pictureSizes'
      // },
      // {
      //   key: 'recorderProfiles'
      // },
      {
        key: 'grid'
      }
    ]
  }
};

});
