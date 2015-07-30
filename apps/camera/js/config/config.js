define(function(require, exports, module) {
'use strict';

module.exports = {
  // This remaining globals are required by external dependencies of camera.
  // shared/js/media/jpeg_metadata_parser.js
  // shared/js/media/media_frame.js
  globals : {
    // The maximum picture size that camera is allowed to take
    CONFIG_MAX_IMAGE_PIXEL_SIZE: 24 * 1024 * 1024,
    CONFIG_MAX_SNAPSHOT_PIXEL_SIZE: 24 * 1024 * 1024,

    // Size of the exif preview embeded in images taken by camera
    CONFIG_REQUIRED_EXIF_PREVIEW_WIDTH: 0,
    CONFIG_REQUIRED_EXIF_PREVIEW_HEIGHT: 0
  },

  zoom: {
    disabled: false,

    // The viewfinder preview stream should automatically
    // reflect the current zoom value. However, on some
    // devices, the viewfinder needs to be scaled by the
    // application. Set this flag if the preview stream
    // does not visually reflect the zoom value properly.
    useZoomPreviewAdjustment: false
  },

  focus: {
    // Set this properties to false if you
    // want to disable focus modes
    // even on hardware that supports them
    // -----------------------------------
    // The camera will be continously focusing
    // on a point of the scene. It is the center of the image
    // unless touch to focus is enabled and the user selects a
    // different region.
    continuousAutoFocus: true,
    // The user can select the area of the image
    // where the camera is going to try to focus the scene.
    touchFocus: true,
    // The camera detects faces and tries to focus
    // on them.
    faceDetection: true
  },

  previewGallery: {
    // Dimensions for thumbnail image (will automatically be
    // multiplied by the devicePixelRatio)
    thumbnailWidth: 54,
    thumbnailHeight: 54
  },

  viewfinder: {
    scaleType: 'fill',
    // Used to adjust sensitivity for pinch-to-zoom gesture
    // (smaller values = more sensitivity)
    zoomGestureSensitivity: 0.425
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
        url: './resources/sounds/shutter.opus',
        setting: 'camera.sound.enabled'
      },
      {
        name: 'countdown',
        url: './resources/sounds/countdown.opus',
        setting: 'camera.sound.enabled'
      },
      {
        name: 'recordingStart',
        url: './resources/sounds/camcorder_start.opus',
        setting: 'camera.sound.enabled'
      },
      {
        name: 'recordingEnd',
        url: './resources/sounds/camcorder_end.opus',
        setting: 'camera.sound.enabled'
      }
    ]
  },

  keyDownEvents: {
    camera: 'capture',
    volumeup: 'capture',
    volumedown: 'capture',
    mozcamerafocusadjust: 'focus',
  },

  activity: {

    // The amount to scale pixelSize derived from
    // 'pick' activities that define `width` or `height`
    // parameters. The larger the scale factor, the larger
    // the activity `maxPixelSize` icreasing the probability
    // that a larger pictureSize will be chosen for the activity.
    maxPixelSizeScaleFactor: 2.5,

    // Reduce the size of images returned by pick activities.
    // A pick activity can specify its own maximum size. However,
    // this setting can lower that pixel size limitation even
    // further. To prevent further limiting the pixel size for
    // pick activities, set this value to `0`.
    // (useful for devices with limited memory)
    maxPickPixelSize: 0,

    // Reduce the size of images returned by share activities.
    // To prevent resizing images that are shared, set this
    // value to `0`.
    // (useful for devices with limited memory)
    maxSharePixelSize: 0
  },

  spinnerTimeouts: {
    takingPicture: 1650,
    requestingCamera: 850,
    loadingVideo: 100
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
    persistent: false
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
        key: 'back',
        icon: 'toggle-camera-rear',
        title: 'toggle-camera-rear'
      },
      {
        key: 'front',
        icon: 'toggle-camera-front',
        title: 'toggle-camera-front'
      }
    ],
    persistent: false
  },

  pictureSizesFront: {
    title: 'camera-resolution',
    header: 'camera-resolution-header',
    icon: 'picture-size',
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    exclude: {
      aspects: ['5:3', '11:9', '16:9']
    },
    persistent: true,
    optionsLocalizable: false,
  },

  pictureSizesBack: {
    title: 'camera-resolution',
    header: 'camera-resolution-header',
    icon: 'picture-size',
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    exclude: {
      keys: ['1920x1088'],
      aspects: ['5:3', '11:9', '16:9'],
    },
    persistent: true,
    optionsLocalizable: false,
  },

  recorderProfilesBack: {
    title: 'video-resolution',
    header: 'video-resolution-header',
    icon: 'video-size',
    options: [],
    exclude: ['high', '1080p', '4kuhd'],
    persistent: true,
    optionsLocalizable: false,
  },

  recorderProfilesFront: {
    title: 'video-resolution',
    header: 'video-resolution-header',
    icon: 'video-size',
    options: [],
    persistent: true,
    optionsLocalizable: false,
  },

  flashModesPicture: {
    title: 'flash',
    options: [
      {
        key: 'auto',
        icon: 'flash-auto',
        title: 'flash-auto'
      },
      {
        key: 'on',
        icon: 'flash-on',
        title: 'flash-on'
      },
      {
        key: 'off',
        icon: 'flash-off',
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
        icon: 'flash-off',
        title: 'flash-off'
      },
      {
        key: 'torch',
        icon: 'flash-on',
        title: 'flash-on'
      }
    ],
    persistent: true
  },

  countdown: {
    title: 'self-timer',
    header: 'self-timer-header',
    icon: 'self-timer',
    options: [
      {
        key: 'off',
        title: 'self-timer-off',
        value: 0
      },
      {
        key: 'secs2',
        value: 2,
        title: 'self-timer-2-seconds'
      },
      {
        key: 'secs5',
        value: 5,
        title: 'self-timer-5-seconds'
      },
      {
        key: 'secs10',
        value: 10,
        title: 'self-timer-10-seconds'
      }
    ],
    persistent: false,
  },

  hdr: {
    title: 'hdr',
    header: 'hdr-header',
    icon: 'hdr-boxed',
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
    icon: 'scene',
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
    icon: 'grid-circular',
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
    notifications: false
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
        key: 'countdown'
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
