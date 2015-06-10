'use strict';
(function(exports) {

  function MockClock() {
    this.start = function() {};
    this.stop = function() {};
  }

  exports.MockClock = MockClock;
})(window);
