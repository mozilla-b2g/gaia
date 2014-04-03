define(function(require, exports, module) {
'use strict';


module.exports = [
  {
    name: 'shutter',
    setting: 'camera.shutter.enabled',
    url: './resources/sounds/shutter.ogg'
  },
  {
    name: 'recordingStart',
    url: './resources/sounds/camcorder_start.opus',
    setting: 'camera.recordingsound.enabled'
  },
  {
    name: 'recordingEnd',
    url: './resources/sounds/camcorder_end.opus',
    setting: 'camera.recordingsound.enabled'
  }
];


});
