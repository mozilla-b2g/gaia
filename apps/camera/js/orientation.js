define(function(require) {
  'use strict';

  var listener = require('utils/orientation');
  var current = 0;

  listener.on('orientation', onOrientationChange);
  listener.start();

  function onOrientationChange(degrees) {
    document.body.setAttribute('data-orientation', 'deg' + degrees);
    current = degrees;

    //this._phoneOrientation = orientation;

    //Filmstrip.setOrientation(orientation);
    //CameraState.set('orientation', orientation);
  }

  return window.orientation = {
    on: listener.on,
    off: listener.off,
    get: function() {
      return current;
    }
  };

});
