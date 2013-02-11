'use strict';

(function(window) {

  function dispatchPerfEvent(name) {
    var evt = new CustomEvent('x-moz-perf-' + name, null);
    setTimeout(window.dispatchEvent.bind(window, evt));
  }

  window.PerformanceHelper = {
    dispatchPerfEvent: dispatchPerfEvent
  };
})(this);
