define(function(require, exports) {
'use strict';

var nextTick = require('common/next_tick');

exports.load = function(id, require, onLoad) {
  nextTick(() => onLoad());
};

});
