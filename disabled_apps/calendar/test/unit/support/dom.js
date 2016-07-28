/* global requireElements */
define(function(require, exports) {
'use strict';

var nextTick = require('common/next_tick');

exports.load = function(id, require, onLoad) {
  requireElements('calendar/elements/' + id + '.html');
  nextTick(() => onLoad());
};

});
