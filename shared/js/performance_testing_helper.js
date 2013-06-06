'use strict';

(function(window) {
  var queue = [];
  var timeoutId = 0;
  var tries = 0;
  var maxTries = 3;
  // performance.now() is relative to navigationStart, which is when
  // right after previous document unload, where fetchStart is better
  // for time within the current app.
  var offset = performance.timing.fetchStart -
               performance.timing.navigationStart;

  function sendEvent(detail) {
    console.log('PerformanceTestingHelper: dispatching event', detail.name);
    var evt = new CustomEvent('x-moz-perf', { detail: detail });
    window.dispatchEvent(evt);
  }

  function checkHelper() {
    tries += 1;
    if (tries > maxTries)
      return;

    if (window.mozPerfHasListener) {
      queue.forEach(function(detail) {
        sendEvent(detail);
      });
      queue = [];
    } else {
      timeoutId = setTimeout(checkHelper, 2000);
    }
  }

  function dispatch(name) {
    var detail = {
      name: name,
      timestamp: window.performance.now() - offset
    };

    if (window.mozPerfHasListener) {
      setTimeout(function() {
        sendEvent(detail);
      });
    } else {
      queue.push(detail);
      if (!timeoutId && tries <= maxTries) {
        checkHelper();
      }
    }
  }

  window.PerformanceTestingHelper = {
    dispatch: dispatch
  };

})(window);
