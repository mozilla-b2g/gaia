define(function(require, exports, module) {
'use strict';

/**
 * Expose `bindAll`
 */

module.exports = bindAll;

function bindAll(object) {
  var key;
  var fn;
  for (key in object) {
    fn = object[key];
    if (typeof fn === 'function') {
      object[key] = fn.bind(object);
    }
  }
}

});
