'use strict';

(function(window) {

  // Placeholder for storing statically generated performance timestamps,
  // similar to window.performance
  window.mozPerformance = {
    timing: {}
  };

  function dispatch(name) {
    if (!window.mozPerfHasListener) {
      return;
    }

    var now = window.performance.now();
    var epoch = Date.now();

    setTimeout(function() {
      var detail = {
        name: name,
        timestamp: now,
        epoch: epoch
      };
      var event = new CustomEvent('x-moz-perf', { detail: detail });

      window.dispatchEvent(event);
    });
  }

  [
    'moz-chrome-dom-loaded',
    'moz-chrome-interactive',
    'moz-app-visually-complete',
    'moz-content-interactive',
    'moz-app-loaded'
  ].forEach(function(eventName) {
      window.addEventListener(eventName, function mozPerfLoadHandler() {
        dispatch(eventName);
      }, false);
    });

  window.PerformanceTestingHelper = {
    dispatch: dispatch
  };

})(window);
