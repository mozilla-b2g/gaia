'use strict';

(function(exports) {
  var Deferred = function() {
    this.promise = new Promise(function(resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }.bind(this));
    return this;
  };
  exports.Deferred = Deferred;
}(window));
