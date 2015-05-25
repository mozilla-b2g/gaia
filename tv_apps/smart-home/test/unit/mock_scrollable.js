(function(exports) {
  'use strict';

  var MockScrollable = function() {};

  MockScrollable.prototype = {
    addNode: function() {},
    resetScroll: function() {},
    clean: function() {}
  };

  exports.MockScrollable = MockScrollable;
}(window));
