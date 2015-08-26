'use strict';

(function(exports) {
  var id = 0;
  var MockMutationObserver = function MockMutationObserver(callback) {
    var o = {
      id: id++,
      type: 'MockMutationObserver',

      observe: function(element, config) {},

      disconnect: function() {},

      mTriggerCallback: function(mutations) {
        callback(mutations);
      }
    };

    MockMutationObserver.mLastObserver = o;
    return o;
  };
  MockMutationObserver.mTeardown = function() {
    this.mLastObserver = null;
  };

  exports.MockMutationObserver = MockMutationObserver;
})(window);
