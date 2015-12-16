(function(exports) {
  'use strict';
  var MockPipedPromise = {
    _getPipedPromise: function (key, executor) {
      return new Promise(executor);
    }
  };

  exports.MockPipedPromise = MockPipedPromise;
}(window));
