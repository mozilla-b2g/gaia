define(function(require, exports, module) {
'use strict';

module.exports = {
  settings: {
    keys: {
      mode: {
        title: 'Mode',
        options: ['photo', 'video'],
        'default': 'photo'
      },
      cameraNumber: {
        'default': 0
      },
      flash: {
        title: 'Flash',
        options: ['auto', 'on', 'off'],
        'default': 'auto'
      },
      timer: {
        title: 'Self Timer',
        options: ['off', '2', '5', '10'],
        'default': 'off',
        type: 'toggle'
      },
      hdr: {
        title: 'HDR',
        options: ['off', 'on', 'auto'],
        'default': 'off',
        type: 'toggle'
      },
      scene: {
        title: 'Scene Mode',
        options: ['normal', 'pano', 'beauty'],
        'default': 'normal',
        type: 'toggle'
      }
    },
    menu: [
      'timer',
      'hdr',
      'scene'
    ]
  }
};

});