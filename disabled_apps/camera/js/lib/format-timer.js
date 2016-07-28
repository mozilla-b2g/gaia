define(function(require, exports, module) {
'use strict';

var format = require('format');

/**
 * Dependencies
 */

function digits(value) {
  return format.padLeft(value, 2, '0');
}

/**
 * Exports
 */

module.exports = function(ms) {
  var totalSeconds = ms / 1000;
  var seconds = Math.round(totalSeconds % 60);
  var minutes = Math.floor(totalSeconds / 60);
  var hours;

  if (minutes < 60) {
    return digits(minutes) + ':' + digits(seconds);
  } else {
    hours = Math.floor(minutes / 60);
    minutes = Math.round(minutes % 60);
    return hours + ':' + digits(minutes) + ':' + digits(seconds);
  }

  return '';
};

});
