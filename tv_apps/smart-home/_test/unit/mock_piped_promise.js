(function(exports) {
  'use strict';
  var MockPipedPromise = function() {
    this._getPipedPromise = function (key, executor) {
      return new Promise(executor);
    };
  };

  exports.MockPipedPromise = MockPipedPromise;
}(window));
