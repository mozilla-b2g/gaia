define(function(require, exports, module) {
'use strict';

module.exports = {
  maxResolution: 99999999,
  showSettings: true,
  mode: {
    title: 'Mode',
    options: [
      {
        key: 'photo',
        title: 'Photo'
        //disables: ['videoFlashModes']
      },
      {
        key: 'video',
        title: 'Video'
        //disables: ['photoFlashModes']
      }
    ],
    selected: 0,
    persistent: true,
    menu: 5
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
    selected: 0,
    persistent: true
  },

  pictureSizes: {
    title: 'Picture Sizes',
    options: [
      {
        key: '8mp',
        title: '8MP',
      },
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
      }
    ],
    selected: 0,
    persistent: true,
    menu: 4
  },

  videoSizes: {
    title: 'Video Sizes',
    options: [
      {
        key: '720p',
        title: '720p 1280X720'
      },
      {
        key: 'cif',
        title: 'CIF 352X288'
      },
      {
        key: 'qcif',
        title: 'QCIF 176X144'
      }
    ],
    selected: 0,
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
    selected: 0,
    persistent: true
  },

  timer: {
    title: 'Self Timer',
    options: [
      {
        key: 'off',
        title: 'Off',
        value: 0
      },
      {
        key: '3secs',
        title: '3secs',
        value: 3
      },
      {
        key: '5secs',
        title: '5secs',
        value: 5
      },
      {
        key: '10secs',
        title: '10secs ',
        value: 10
      }
    ],
    selected: 0,
    persistent: false,
    menu: 3
  },

  hdr: {
    title: 'HDR',
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
    selected: 0,
    persistent: true,
    menu: 1
  },

  scene: {
    title: 'Scene Mode',
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
    selected: 0,
    persistent: true,
    menu: 2
  },

  grid: {
    title: 'Grid',
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
    selected: 1,
    persistent: true,
    menu: 3
  }
};

});