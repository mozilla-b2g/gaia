'use strict';

(function(exports) {
  var MockSheetTransitionManager = {
    transitioning: false,
    begin: function st_begin() {
    },

    moveInDirection: function st_moveInDirection(direction, progress) {
    },

    end: function st_end(callback) {
      if (callback) {
        setTimeout(callback);
      }
    },

    snapBack: function st_snapBack() {
    },
    snapForward: function st_snapForward() {
    },

    stack: null,

    mTeardown: function st_mTeardown() {
      this.transitioning = false;
    }
  };

  exports.MockSheetTransitionManager = MockSheetTransitionManager;
}(window));
