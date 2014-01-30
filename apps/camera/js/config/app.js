define(function(require, exports, module) {
'use strict';

module.exports = {
  maxResolution: 99999999,
  mode: {
    title: 'Mode',
    options: ['photo', 'video'],
    persist: true,
    'default': 'photo'
  },

  selectedCamera: {
    title: 'Selected Camera',
    options: [0, 1],
    'default': 0,
    persist: true,
    menu: 1
  },

  flashMode: {
    title: 'Flash',
    options: ['auto', 'on', 'off'],
    'default': 'auto',
    persist: true
  },

  timer: {
    title: 'Self Timer',
    options: ['off', '3', '5', '10'],
    'default': 'off',
    type: 'toggle',
    menu: 3,
    persist: false
  },

  hdr: {
    title: 'HDR',
    options: ['off', 'on', 'auto'],
    'default': 'off',
    type: 'toggle',
    persist: true,
    menu: 1
  },

  scene: {
    title: 'Scene Mode',
    options: ['normal', 'pano', 'beauty'],
    'default': 'normal',
    type: 'toggle',
    persist: true,
    menu: 2
  }
};

});