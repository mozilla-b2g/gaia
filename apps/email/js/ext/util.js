define('util',['require','exports','module','events'],function (require, exports, module) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.log = function (msg) {};

exports.pump = null;

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});