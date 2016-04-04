define(function(require, exports, module) {
'use strict';

module.exports = function(object) {
  var key;
  var fn;
  for (key in object) {
    fn = object[key];
    if (typeof fn === 'function') {
      object[key] = fn.bind(object);
    }
  }
};

});
