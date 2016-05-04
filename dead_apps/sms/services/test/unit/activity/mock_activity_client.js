/* exported MockActivityClient */

(function(exports) {
  'use strict';

  exports.MockActivityClient = {
    init: () => {},
    postResult: () => Promise.resolve(),
    postError: () => Promise.resolve(),
    hasPendingRequest: () => false,
    on: () => {}
  };
})(window);
