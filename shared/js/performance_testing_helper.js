'use strict';

(function(window) {

  // empty helper. Must not override the inserted one.
  // See bug 846909
  if (!window.PerformanceTestingHelper) {
    window.PerformanceTestingHelper = {
      dispatch: function() {
      }
    };
  }

})(window);
