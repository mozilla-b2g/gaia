/* global module, define */
//
// usertiming.js
//
// A polyfill for UserTiming (http://www.w3.org/TR/user-timing/)
//
// Copyright 2013 Nic Jansma
// http://nicj.net
//
// https://github.com/nicjansma/usertiming.js
//
// Licensed under the MIT license
//
// Modified for the Firefox OS environment by Eli Perelman <eli@mozilla.com>
//
// This is a PARTIAL implementation of User Timing, specifically only the
// methods `performance.mark` and `performance.measure`, as those are required
// for performance testing. The rest of the API will come once this API is
// properly implemented in Gecko and this shim of these methods can be removed.
(function(window) {
  'use strict';

  var performance = window.performance;
  var console = window.console;

  if (typeof performance.mark === 'function') {
    return;
  }

  // Create a performance entry in the logs in a certain format so performance
  // tests can extract and parse
  var logEntry = function(entry) {
    setTimeout(function() {
      var message = 'Performance Entry: ' +
        entry.entryType + '|' +
        entry.name + '|' +
        entry.startTime + '|' +
        entry.duration + '|' +
        (entry.time || 0);

      console.log(message);
    }, 0);
  };

  // only used for measure(), to quickly see the latest timestamp of a mark
  var marks = {};

  /**
   * UserTiming mark
   * http://www.w3.org/TR/user-timing/#dom-performance-mark
   *
   * @param {string} markName Mark name
   */
  performance.mark = function(markName) {
    var now = performance.now();
    var epoch = Date.now();

    // mark name is required
    if (typeof markName === 'undefined') {
      throw new SyntaxError('Mark name must be specified');
    }

    // mark name can't be a NT timestamp
    if (performance.timing && markName in performance.timing) {
      throw new SyntaxError('Mark name is not allowed');
    }

    if (!marks[markName]) {
      marks[markName] = [];
    }

    marks[markName].push(now);

    // add to perf timeline as well
    logEntry({
      entryType: 'mark',
      name: markName,
      startTime: now,
      duration: 0,
      time: epoch // NON-STANDARD EXTENSION
    });
  };

  /**
   * UserTiming measure
   * http://www.w3.org/TR/user-timing/#dom-performance-measure
   *
   * @param {string} measureName Measure name
   * @param {string} [startMark] Start mark name
   * @param {string} [endMark] End mark name
   */
  performance.measure = function(measureName, startMark, endMark) {
    var now = performance.now();
    var epoch = Date.now();

    if (!measureName) {
      throw new Error('Measure must be specified');
    }

    // if there isn't a startMark, we measure from navigationStart to now
    if (!startMark) {
      logEntry({
        entryType: 'measure',
        name: measureName,
        startTime: 0,
        duration: now,
        time: epoch // NON-STANDARD EXTENSION
      });

      return;
    }

    // If there is a startMark, check for it first in the NavigationTiming
    // interface, then check our own marks.
    var startMarkTime = 0;
    if (performance.timing && startMark in performance.timing) {
      // mark cannot have a timing of 0
      if (startMark !== 'navigationStart' &&
        performance.timing[startMark] === 0) {
        throw new Error(startMark + ' has a timing of 0');
      }

      // time is the offset of this mark to navigationStart's time
      startMarkTime = performance.timing[startMark] -
        performance.timing.navigationStart;
    } else {
      if (startMark in marks) {
        startMarkTime = marks[startMark][marks[startMark].length - 1];
      } else {
        throw new Error(startMark + ' mark not found');
      }
    }

    // If there is a endMark, check for it first in the NavigationTiming
    // interface, then check our own marks.
    var endMarkTime = now;

    if (endMark) {
      endMarkTime = 0;

      if (performance.timing && endMark in performance.timing) {
        // mark cannot have a timing of 0
        if (endMark !== 'navigationStart' &&
          performance.timing[endMark] === 0) {
          throw new Error(endMark + ' has a timing of 0');
        }

        // time is the offset of this mark to navigationStart's time
        endMarkTime = performance.timing[endMark] -
          performance.timing.navigationStart;
      } else {
        if (endMark in marks) {
          endMarkTime = marks[endMark][marks[endMark].length - 1];
        } else {
          throw new Error(endMark + ' mark not found');
        }
      }
    }

    // add to our measure array
    var duration = endMarkTime - startMarkTime;

    logEntry({
      entryType: 'measure',
      name: measureName,
      startTime: startMarkTime,
      duration: duration,
      time: epoch // NON-STANDARD EXTENSION
    });
  };

  // Export UserTiming to the appropriate location.
  //
  // When included directly via a script tag in the browser,
  // we're good as we've been updating the window.performance object.
  if (typeof define !== 'undefined' && define.amd) {
    //
    // AMD / RequireJS
    //
    define([], function () {
      return performance;
    });
  } else if (typeof module !== 'undefined' &&
    typeof module.exports !== 'undefined') {
    //
    // Node.js
    //
    module.exports = performance;
  }
}(typeof window !== 'undefined' ? window : undefined));