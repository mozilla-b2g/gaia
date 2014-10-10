define(function(require, exports, module) {
'use strict';

module.exports = function(name) {
  return function() {
    var args = Array.prototype.slice.call(arguments).map(JSON.stringify);
    args.unshift('[calendar] ');
    args.unshift(name);
    console.log.apply(console, args);
  };
};

});
