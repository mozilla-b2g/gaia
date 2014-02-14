define(function(require, exports, module) {
  'use strict';

  var listener = require('utils/orientation');
  var current = 0;

  listener.on('orientation', onOrientationChange);
  listener.start();

  function onOrientationChange(degrees) {
    document.body.setAttribute('data-orientation', 'deg' + degrees);
    current = degrees;
  }

  /**
   * Exports
   */

  module.exports = {
    on: listener.on,
    off: listener.off,
    get: function() {
      return current;
    }
  };
});
