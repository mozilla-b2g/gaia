define(function(require, exports, module) {
'use strict';

module.exports = {
  showSettings: false,
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

  pictureSizes: {
    title: 'Camera Resolution',
    icon: 'icon-picture-size',
    options: [
      {
        key: '5mp',
        title: '5MP'
      },
      {
        key: '3mp',
        title: '3MP'
      },
      {
        key: '1mp',
        title: '1MP'
      },
      {
        key: 'vga',
        title: 'VGA'
      },
      {
        key: 'qvga',
        title: 'QVGA'
      }
    ],
    persistent: true,
    menu: 4
  },

  recorderProfiles: {
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

  flashModes: {
    title: 'Flash',
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
    persistent: true
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
    menu: 3
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
    menu: 1
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
    menu: 2
  },

  grid: {
    title: 'Grid',
    icon: 'icon-frame-grid',
    options: [
      {
        key: 'on',
        title: 'On',
        value: true
      },
      {
        key: 'off',
        title: 'Off',
        value: false
      }
    ],
    selected: 'off',
    persistent: true,
    menu: 3
  }
};

});