/**
 * @fileoverview Simple helper function to convert basic platform DOMRequest
 *     into Promise. Deprecate once there is platform support for something
 *     like DOMRequest.then().
 */
define(function(require, exports, module) {
'use strict';

module.exports = function createDOMPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = resolve;
    request.onerror = reject;
  });
};

});
