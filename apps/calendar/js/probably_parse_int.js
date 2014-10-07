(function(exports) {
'use strict';

/**
 * Constants
 */
var NUMERIC = /^[0-9]+$/;

/**
 * @param {number|string} id Some id.
 */
exports.probablyParseInt = function(id) {
  // by an unfortunate decision we have both
  // string ids and number ids.. based on the
  // input we run parseInt
  if (typeof id === 'string' && id.match(NUMERIC)) {
    return parseInt(id, 10);
  }

  return id;
};

}(Calendar));
