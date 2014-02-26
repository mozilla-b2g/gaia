define(function(require, exports, module) {
'use strict';

module.exports = {
  showSettings: true,
  newControls: true,
  showIndicators: true,
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
    title: 'l10n-camera-resolution',
    icon: 'icon-picture-size',
    maxBytes: 5242880,
    options: [],
    persistent: true,
    menu: 1
  },

  pictureSizesBack: {
    title: 'l10n-camera-resolution',
    icon: 'icon-picture-size',
    maxBytes: 5242880,
    options: [],
    persistent: true,
    menu: 2
  },

  recorderProfilesBack: {
    title: 'l10n-video-resolution',
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
    title: 'l10n-video-resolution',
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
    title: 'l10n-flash',
    options: [
      {
        key: 'auto',
        title: 'l10n-auto',
        icon: 'icon-flash-auto'
      },
      {
        key: 'on',
        title: 'l10n-on',
        icon: 'icon-flash-on'
      },
      {
        key: 'off',
        title: 'l10n-off',
        icon: 'icon-flash-off'
      }
    ],
    persistent: true,
    menu: 5
  },

  flashModesVideo: {
    title: 'l10n-flash',
    options: [
      {
        key: 'off',
        title: 'l10n-off',
        icon: 'icon-flash-off'
      },
      {
        key: 'torch',
        title: 'l10n-on',
        icon: 'icon-flash-on'
      }
    ],
    persistent: true,
    menu: 6
  },

  timer: {
    title: 'l10n-self-timer',
    icon: 'icon-timer',
    options: [
      {
        key: 'off',
        title: 'Off',
        value: 0
      },
      {
        key: '3secs',
        title: 'l10n-3-seconds',
        value: 3
      },
      {
        key: '5secs',
        title: 'l10n-5-seconds',
        value: 5
      },
      {
        key: '10secs',
        title: 'l10n-10-seconds',
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
        key: 'off',
        title: 'l10n-off'
      },
      {
        key: 'on',
        title: 'l10n-on'
      }
    ],
    persistent: true,
    menu: 8
  },

  scene: {
    title: 'l10n-scene-mode',
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
    title: 'l10n-grid',
    icon: 'icon-frame-grid',
    options: [
      {
        key: 'on',
        title: 'l10n-on'
      },
      {
        key: 'off',
        title: 'l10n-off'
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
