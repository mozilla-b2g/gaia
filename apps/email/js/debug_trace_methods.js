/*global performance */
'use strict';
/**
 * This module allows wrapping all the methods on an object to log their calls
 * and their first argument. There is an option to try to log methods that take
 * too long too, but it is very coarse. This is mostly useful when wanting to
 * see a stream of calls in realtime in the log to try to figure out where a
 * bug is happening. It should just be used in debugging and not used for code
 * that is committed to the repo.
 */
define(function() {
  return function debugTraceMethods(obj, moduleId, perfLogThreshold) {
    // 16 ms threshold for 60 fps, set to 0 to just log all calls,
    // without timings. Unless set to 0, log calls are batched
    // and written to the console later, so they will not appear
    // in the correct order as compared to console logs done outside
    // this module. Plus they will appear out of order since the log
    // call does not complete until after the wrapped function
    // completes. So if other function calls complete inside that
    // function, they will be logged before the containing function
    // is logged.
    perfLogThreshold = perfLogThreshold || 0;

    var logQueue = [],
        logTimeoutId = 0;

    function logPerf() {
      logQueue.forEach(function(msg) {
        console.log(msg);
      });
      logQueue = [];
      logTimeoutId = 0;
    }

    function queueLog(prop, time, arg0) {
      var arg0Type = typeof arg0;
      logQueue.push(moduleId + ': ' + prop +
        (arg0Type === 'number' ||
         arg0Type === 'boolean' ||
         arg0Type === 'string' ?
         ': (' + arg0 + ')' : '') +
        (perfLogThreshold === 0 ? '' : ': ' + time));
      if (perfLogThreshold === 0) {
        logPerf();
      } else {
        if (!logTimeoutId) {
          logTimeoutId = setTimeout(logPerf, 2000);
        }
      }
    }

    function perfWrap(prop, fn) {
      return function() {
        var start = performance.now();
        if (perfLogThreshold === 0) {
          queueLog(prop, 0, arguments[0]);
        }
        var result = fn.apply(this, arguments);
        var end = performance.now();

        var time = end - start;
        if (perfLogThreshold > 0 && time > perfLogThreshold) {
          queueLog(prop, end - start, arguments[0]);
        }
        return result;
      };
    }

    if (perfLogThreshold > -1) {
      Object.keys(obj).forEach(function (prop) {
        var proto = obj;
        if (typeof proto[prop] === 'function') {
          proto[prop] = perfWrap(prop, proto[prop]);
        }
      });
    }
  };
});