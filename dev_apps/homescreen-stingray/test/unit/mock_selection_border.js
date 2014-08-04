'use strict';

(function(exports) {

  function MockSelectionBorder(options) {
    MockSelectionBorder.singleton._options = options;
    return MockSelectionBorder.singleton;
  }

  MockSelectionBorder.singleton = {
    select: function() {},
    selectRect: function() {},
    deselect: function() {},
    deselectRect: function() {},
    deselectAll: function() {},
    reset: function() {}
  };

  MockSelectionBorder.mTeardown = MockSelectionBorder.singleton.reset;
  exports.MockSelectionBorder = MockSelectionBorder;
})(window);
