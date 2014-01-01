define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var padLeft = require('utils/padleft');

/**
 * Exports
 */

module.exports = function(ms) {
  var totalSeconds = ms / 1000;
  var seconds = Math.round(totalSeconds % 60);
  var minutes = Math.floor(totalSeconds / 60);
  var hours;

  if (minutes < 60) {
    return padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  } else {
    hours = Math.floor(minutes / 60);
    minutes = Math.round(minutes % 60);
    return hours + ':' + padLeft(minutes, 2) + ':' + padLeft(seconds, 2);
  }

  return '';
};

});
