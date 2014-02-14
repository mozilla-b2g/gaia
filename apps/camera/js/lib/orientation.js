define(function(require, exports, module) {
  'use strict';

  var listener = require('vendor/orientation');
  var body = document.body;
  var classes = body.classList;
  var current = 0;

  listener.on('orientation', onOrientationChange);
  listener.start();

  function onOrientationChange(degrees) {
    classes.remove('deg' + current);
    classes.add('deg' + degrees);
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
