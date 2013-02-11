'use strict';

(function(window) {

  function dispatch(name) {
    if (!window.mozPerfHasListener) {
      return;
    }

    var now = window.performance.now();

    setTimeout(function() {
      //console.log('PerformanceTestingHelper: dispatching event', name);

      var detail = {
        name: name,
        timestamp: now
      };
      var evt = new CustomEvent('x-moz-perf', { detail: detail });
      window.dispatchEvent(evt);
    });
  }

  window.PerformanceTestingHelper = {
    dispatch: dispatch
  };

})(window);
