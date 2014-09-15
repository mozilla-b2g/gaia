(function(exports) {
'use strict';

/**
 * Constants
 */
var DEBUG = Calendar.DEBUG;

exports.debug = function(name) {
  return function() {
    if (!DEBUG) {
      return;
    }

    var args = Array.prototype.slice.call(arguments).map(JSON.stringify);
    args.unshift('[calendar] ');
    args.unshift(name);
    console.log.apply(console, args);
  };
};

exports.log = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('CALENDAR:');
  console.error.apply(console, args);
};

}(Calendar));
