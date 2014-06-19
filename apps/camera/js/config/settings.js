define(function(require, exports, module) {
'use strict';

module.exports = {
  zoom: {
    disabled: false,

    // The viewfinder preview stream should automatically
    // reflect the current zoom value. However, on some
    // devices, the viewfinder needs to be scaled by the
    // application. Set this flag if the preview stream
    // does not visually reflect the zoom value properly.
    useZoomPreviewAdjustment: false
  },
  caf: {
    // Set this property to true if you want to disable continuous auto focus
    // even on hardware that supports it.
    disabled: false
  },
  previewGallery: {

    // Flag for determining if the preview should limit the
    // image size to the value of CONFIG_MAX_IMAGE_PIXEL_SIZE
    // (enable for devices with limited memory)
    limitMaxPreviewSize: true,

    // Dimensions for thumbnail image (will automatically be
    // multiplied by the devicePixelRatio)
    thumbnailWidth: 54,
    thumbnailHeight: 54
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
    persistent: false
  },
  activity: {

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
  loadingScreen: {
    delay: 600
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
    persistent: false
  },

  pictureSizesFront: {
    title: 'camera-resolution',
    header: 'camera-resolution-header',
    icon: 'icon-picture-size',
    maxPixelSize: window.CONFIG_MAX_SNAPSHOT_PIXEL_SIZE,
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
    maxPixelSize: window.CONFIG_MAX_SNAPSHOT_PIXEL_SIZE,
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
