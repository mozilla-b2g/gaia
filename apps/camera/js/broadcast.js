
define(function(require) {
  'use strict';
  var exports = require('libs/evt').mix({});

  // We have to store on window
  // temporarily to allow camera.js
  // to listen to and boradcast events.
  window.broadcast = exports;

  return exports;
});
