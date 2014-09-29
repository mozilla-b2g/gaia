define(function(require, exports) {
'use strict';

var nextTick = require('next_tick');

exports.load = function(id, require, onLoad) {
  nextTick(() => onLoad());
};

});
