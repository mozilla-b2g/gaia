'use strict';

/**
 * Create a UUID string.
 *
 * http://jsperf.com/guid-generation-stackoverflow
 *
 * @return {String}
 */

exports.uuid = (function (){
  var l = [];
  for (var i=0; i<256; i++) { l[i] = (i<16?'0':'')+(i).toString(16); }
  return function () {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return l[d0&0xff]+l[d0>>8&0xff]+l[d0>>16&0xff]+l[d0>>24&0xff]+'-'+
      l[d1&0xff]+l[d1>>8&0xff]+'-'+l[d1>>16&0x0f|0x40]+l[d1>>24&0xff]+'-'+
      l[d2&0x3f|0x80]+l[d2>>8&0xff]+'-'+l[d2>>16&0xff]+l[d2>>24&0xff]+
      l[d3&0xff]+l[d3>>8&0xff]+l[d3>>16&0xff]+l[d3>>24&0xff];
  };
})();

/**
 * Check that the given arguments
 * match the given types.
 *
 * Example:
 *
 *   typesMatch([1, 'foo'], ['number', 'string']) //=> true
 *   typesMatch([1, 'foo'], ['string', 'number']) //=> false
 *
 * @param  {Array} args
 * @param  {Array} types
 * @return {Boolean}
 */

exports.typesMatch = function (args, types) {
  for (var i = 0, l = args.length; i < l; i++) {
    if (typeof args[i] !== types[i]) return false;
  }

  return true;
};

/**
 * Returns a Promise packaged
 * inside an object.
 *
 * This is convenient as we don't
 * have to have a load of callbacks
 * directly inside our funciton body.
 *
 * @return {Object}
 */

exports.deferred = function () {
  var deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

/**
 * Parses a url query string and
 * spits out a key/value object.
 *
 * Example:
 *
 *   query('?foo=bar').foo; //=> 'bar'
 *   query('?foo=bar&baz=bat').baz; //=> 'bat'
 *
 * @param  {String} string
 * @return {Object}
 */

exports.query = function(string) {
  var result = {};

  string
    .replace('?', '')
    .split('&')
    .forEach(function(param) {
      var parts = param.split('=');
      result[parts[0]] = parts[1];
    });

  return result;
};

/**
 * Returns type of environment
 * the current script is running in.
 *
 * @return {String}
 */

exports.env = function() {
  return {
    'Window': 'window',
    'SharedWorkerGlobalScope': 'sharedworker',
    'DedicatedWorkerGlobalScope': 'worker',
    'ServiceWorkerGlobalScope': 'serviceworker'
  }[self.constructor.name] || 'unknown';
};
