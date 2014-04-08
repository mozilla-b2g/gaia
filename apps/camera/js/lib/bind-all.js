define(function(require, exports, module) {
'use strict';

var debug = require('debug')('bind-all');

/**
 * Expose `bindAll`
 */

module.exports = bindAll;

function bindAll(object) {
  debug('start');
  var key;
  var fn;

  for (key in object) {
    fn = object[key];
    if (typeof fn === 'function') {
      object[key] = fn.bind(object);
    }
  }

  debug('done');
}

});
