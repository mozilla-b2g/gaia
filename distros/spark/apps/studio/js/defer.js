'use strict';

(function(exports) {
  exports.Defer = function() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  };
})(window);


