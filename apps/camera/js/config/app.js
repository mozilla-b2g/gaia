define(function(require, exports, module) {
'use strict';

module.exports = {
  showSettings: true,
  mode: {
    title: 'Mode',
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

  cameras: {
    title: 'Selected Camera',
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
    title: 'Camera Resolution',
    icon: 'icon-picture-size',
    maxBytes: 5242880,
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    persistent: true,
    menu: 1
  },

  pictureSizesBack: {
    title: 'Camera Resolution',
    icon: 'icon-picture-size',
    maxBytes: 5242880,
    options: [
      // {
      //   key: '2048x1536'
      // }
    ],
    persistent: true,
    menu: 2
  },

  recorderProfilesBack: {
    title: 'Video Resolution',
    icon: 'icon-video-size',
    options: [

      // NOTE: Disabled due to Helix crashing
      // when trying to record at these resolutions.

      // {
      //   key: '720p',
      //   title: '720p 1040X720'
      // },
      // {
      //   key: '480p',
      //   title: '480p 720X480'
      // },
      {
        key: 'cif',
        title: 'CIF 352X288'
      },
      {
        key: 'qcif',
        title: 'QCIF 176X144'
      }
    ],
    persistent: true,
    menu: 3,
  },

  recorderProfilesFront: {
    title: 'Video Resolution',
    icon: 'icon-video-size',
    options: [

      // NOTE: Disabled due to Helix crashing
      // when trying to record at these resolutions.

      // {
      //   key: '720p',
      //   title: '720p 1040X720'
      // },
      // {
      //   key: '480p',
      //   title: '480p 720X480'
      // },
      {
        key: 'cif',
        title: 'CIF 352X288'
      },
      {
        key: 'qcif',
        title: 'QCIF 176X144'
      }
    ],
    persistent: true,
    menu: 4
  },

  flashModesPicture: {
    title: 'Picture Flash',
    options: [
      {
        key: 'auto',
        title: 'Auto',
        icon: 'icon-flash-auto'
      },
      {
        key: 'on',
        title: 'On',
        icon: 'icon-flash-on'
      },
      {
        key: 'off',
        title: 'Off',
        icon: 'icon-flash-off'
      }
    ],
    persistent: true,
    menu: 5
  },

  flashModesVideo: {
    title: 'Video Flash',
    options: [
      {
        key: 'off',
        title: 'Off',
        icon: 'icon-flash-off'
      },
      {
        key: 'torch',
        title: 'On',
        icon: 'icon-flash-on'
      }
    ],
    persistent: true,
    menu: 6
  },

  timer: {
    title: 'Self Timer',
    icon: 'icon-self-timer',
    options: [
      {
        key: 'off',
        title: 'Off',
        value: 0
      },
      {
        key: '3secs',
        title: '3 Seconds',
        value: 3
      },
      {
        key: '5secs',
        title: '5 Seconds',
        value: 5
      },
      {
        key: '10secs',
        title: '10 Seconds',
        value: 10
      }
    ],
    persistent: false,
    menu: 7
  },

  hdr: {
    title: 'HDR',
    icon: 'icon-hdr',
    options: [
      {
        key: 'auto',
        title: 'Auto',
        icon: 'A'
      },
      {
        key: 'on',
        title: 'On',
        icon: 'O'
      },
      {
        key: 'off',
        title: 'Off',
        icon: 'O'
      }
    ],
    persistent: true,
    menu: 8
  },

  scene: {
    title: 'Scene Mode',
    icon: 'icon-scene',
    options: [
      {
        key: 'normal',
        title: 'Normal'
      },
      {
        key: 'pano',
        title: 'Panorama'
      },
      {
        key: 'beauty',
        title: 'Beauty'
      }
    ],
    persistent: true,
    menu: 9
  },

  grid: {
    title: 'Grid',
    icon: 'icon-frame-grid',
    options: [
      {
        key: 'on',
        title: 'On'
      },
      {
        key: 'off',
        title: 'Off'
      }
    ],
    selected: 'off',
    persistent: true,
    menu: 10
  },

  settingsMenu: {
    items: [
      {
        key: 'hdr'
      },
      {
        key: 'scene'
      },
      {
        key: 'grid'
      },
      {
        key: 'timer'
      },
      {
        key: 'pictureSizesBack',
        condition: { 'cameras': 'back' }
      },
      {
        key: 'pictureSizesFront',
        condition: { 'cameras': 'front' }
      },
      {
        key: 'recorderProfilesBack',
        condition: { 'cameras': 'back' }
      },
      {
        key: 'recorderProfilesFront',
        condition: { 'cameras': 'front' }
      }
    ]
  }
};

});