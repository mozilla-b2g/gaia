define(function(require, exports, module) {
'use strict';

module.exports = {
  maxResolution: 99999999,
  showSettings: false,
  mode: {
    title: 'Mode',
    options: [
      {
        value: 'photo',
        title: 'Photo'
      },
      {
        value: 'video',
        title: 'Video'
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
        value: 'back',
        title: 'Back'
      },
      {
        value: 'front',
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
        value: 8,
        title: '8MP',
      },
      {
        value: 5,
        title: '5MP'
      },
      {
        value: 3,
        title: '3MP'
      },
      {
        value: 1,
        title: '1MP'
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
        value: 'auto',
        title: 'Auto',
        icon: 'A'
      },
      {
        value: 'on',
        title: 'On',
        icon: 'O'
      },
      {
        value: 'off',
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
        title: 'Off',
        value: 0
      },
      {
        title: '3secs',
        value: 3
      },
      {
        title: '5secs',
        value: 5
      },
      {
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
        value: 'auto',
        title: 'Auto',
        icon: 'A'
      },
      {
        value: 'on',
        title: 'On',
        icon: 'O'
      },
      {
        value: 'off',
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
        title: 'Normal',
        value: 'normal'
      },
      {
        title: 'Panorama',
        value: 'pano'
      },
      {
        title: 'Beauty',
        value: 'beauty'
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
        title: 'On',
        value: true
      },
      {
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