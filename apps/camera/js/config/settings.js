define(function(require, exports, module) {
'use strict';

module.exports = {
  zoom: {
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
  mode: {
    options: [
      {
        key: 'picture',
        title: 'Picture'
      },
      {
        key: 'video',
        title: 'Video'
      }
    ],
    persistent: false
  },

  isoModes: {
    disabled: false,
    options: [
      {
        key: 'auto',
        title: 'Auto'
      }
    ],
    selected:'auto'
  },

  whiteBalance: {
    disabled: false,
    options: [
      {
        key: 'auto',
        title: 'Auto'
      }
    ],
    selected:'auto'
  },

  cameras: {
    options: [
      {
        key: 'back',
        title: 'Back'
      },
      {
        key: 'front',
        title: 'Front'
      }
    ],
    persistent: false
  },

  pictureSizesFront: {
    title: 'camera-resolution',
    icon: 'icon-picture-size',
    maxPixelSize: window.CONFIG_MAX_IMAGE_PIXEL_SIZE,
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    persistent: true,
    l10n: { title: 'camera-resolution' }
  },

  pictureSizesBack: {
    title: 'camera-resolution',
    icon: 'icon-picture-size',
    maxPixelSize: window.CONFIG_MAX_IMAGE_PIXEL_SIZE,
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
    icon: 'icon-video-size',
    options: [],
    exclude: ['high', '1080p'],
    persistent: true
  },

  recorderProfilesFront: {
    title: 'video-resolution',
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
    persistent: true,
    l10n: { title: 'flash' }
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
    persistent: true,
    l10n: { title: 'flash' }
  },

  timer: {
    title: 'self-timer',
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
       {
         key: 'hdr'
       },
      // {
      //   key: 'scene'
      // },
      {
        key: 'grid'
      },
      {
        key: 'timer'
      },
      {
        key: 'pictureSizes',
      },
      {
        key: 'recorderProfiles',
      }
    ]
  }
};

});
