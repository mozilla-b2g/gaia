define(function(require, exports, module) {
'use strict';

module.exports = {
  maxResolution: 99999999,

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
    default: 0,
    persistent: true
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
    default: 1,
    persistent: true
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
    default: 0,
    persistent: true
  },

  // flashModes: {
  //   title: 'Flash',
  //   options: ['auto', 'on', 'off'],
  //   'default': 'auto',
  //   persist: true
  // },

  // timer: {
  //   title: 'Self Timer',
  //   options: ['off', '3', '5', '10'],
  //   'default': 'off',
  //   type: 'toggle',
  //   menu: 3,
  //   persist: false
  // },

  // hdr: {
  //   title: 'HDR',
  //   options: ['off', 'on', 'auto'],
  //   'default': 'off',
  //   type: 'toggle',
  //   persist: true,
  //   menu: 1
  // },

  // scene: {
  //   title: 'Scene Mode',
  //   options: ['normal', 'pano', 'beauty'],
  //   'default': 'normal',
  //   type: 'toggle',
  //   persist: true,
  //   menu: 2
  // }
};

});