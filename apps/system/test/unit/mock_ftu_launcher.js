'use strict';

(function(exports) {
  var MockFtuLauncher = function() { };
  MockFtuLauncher.prototype = {
    mIsRunning: false,

    isFtuRunning: function() {
      return this.mIsRunning;
    },

    retrieve: function() {

    },

    start: function() {

    }
  };

  exports.MockFtuLauncher = MockFtuLauncher;
}(window));
