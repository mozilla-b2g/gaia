define(function(require, exports, module) {
'use strict';

var resolved = Promise.resolve();

/**
 * Very similar to node's nextTick.
 * Much faster than setTimeout or window.postMessage
 */
module.exports = function(callback) {
  resolved.then(callback);
};

});
