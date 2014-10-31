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
(function(window) {
  'use strict';

  var performance = window.performance;

  if (typeof performance.mark === 'function') {
    return;
  }

  var i;

  //
  // PerformanceTimeline (PT) polyfill
  //  http://www.w3.org/TR/performance-timeline/
  //

  // Since Performance Timeline has already been implemented, we have to
  // override the methods in order to use them for performance testing.
  // This currently removes functionality related to the rest of PT, but
  // should currently only include User Timing, which is polyfilled below. We
  // specifically don't do anything if performance.mark is defined.

  // performance timeline array
  var performanceTimeline = [];

  // whether or not the timeline will require sort on getEntries()
  var performanceTimelineRequiresSort = false;

  /**
   * Adds an object to our internal Performance Timeline array.
   *
   * @param {Object} obj PerformanceEntry
   */
  var addToPerformanceTimeline = function(obj) {
    performanceTimeline.push(obj);

    //
    // If we insert a measure, its startTime may be out of order
    // from the rest of the entries because the use can use any
    // mark as the start time.  If so, note we have to sort it before
    // returning getEntries();
    //
    if (obj.entryType === 'measure') {
      performanceTimelineRequiresSort = true;
    }

    console.log('Performance Entry: %s|%s|%d|%d|%s',
      obj.entryType, obj.name, obj.startTime, obj.duration, obj.epoch || 0);
  };

  /**
   * Ensures our PT array is in the correct sorted order (by startTime)
   */
  var ensurePerformanceTimelineOrder = function() {
    if (!performanceTimelineRequiresSort) {
      return;
    }

    //
    // Measures, which may be in this list, may enter the list in
    // an unsorted order. For example:
    //
    //  1. measure('a')
    //  2. mark('start_mark')
    //  3. measure('b', 'start_mark')
    //  4. measure('c')
    //  5. getEntries()
    //
    // When calling #5, we should return [a,c,b] because technically
    // the start time of c is '0' (navigationStart), which will occur
    // before b's start time due to the mark.
    //
    performanceTimeline.sort(function(a, b) {
      return a.startTime - b.startTime;
    });

    performanceTimelineRequiresSort = false;
  };

  /**
   * Clears the specified entry types from our timeline array.
   *
   * @param {string} entryType Entry type (eg 'mark' or 'measure')
   * @param {string} [name] Entry name (optional)
   */
  var clearEntriesFromPerformanceTimeline = function(entryType, name) {
    // clear all entries from the perf timeline
    i = 0;
    while (i < performanceTimeline.length) {
      if (performanceTimeline[i].entryType !== entryType) {
        // unmatched entry type
        i++;
        continue;
      }

      if (typeof name !== 'undefined' && performanceTimeline[i].name !== name) {
        // unmatched name
        i++;
        continue;
      }

      // this entry matches our criteria, remove just it
      performanceTimeline.splice(i, 1);
    }
  };

  /**
   * Gets all entries from the Performance Timeline.
   * http://www.w3.org/TR/performance-timeline/#dom-performance-getentries
   *
   * NOTE: This will only ever return marks and measures.
   *
   * @return {PerformanceEntry[]} Array of PerformanceEntrys
   */
  performance.getEntries = function() {
    ensurePerformanceTimelineOrder();

    // get a copy of all of our entries
    return performanceTimeline.slice(0);
  };

  /**
   * Gets all entries from the Performance Timeline of the specified type.
   * http://www.w3.org/TR/performance-timeline/#dom-performance-getentriesbytype
   *
   * NOTE: This will only work for marks and measures.
   *
   * @param {string} entryType Entry type (eg 'mark' or 'measure')
   *
   * @return {PerformanceEntry[]} Array of PerformanceEntrys
   */
  performance.getEntriesByType = function(entryType) {
    // we only support marks/measures
    if (typeof entryType === 'undefined' ||
      (entryType !== 'mark' && entryType !== 'measure')) {
      return [];
    }

    // see note in ensurePerformanceTimelineOrder() on why this is required
    if (entryType === 'measure') {
      ensurePerformanceTimelineOrder();
    }

    // find all entries of entryType
    var entries = [];
    for (i = 0; i < performanceTimeline.length; i++) {
      if (performanceTimeline[i].entryType === entryType) {
        entries.push(performanceTimeline[i]);
      }
    }

    return entries;
  };

  /**
   * Gets all entries from the Performance Timeline of the specified
   * name, and optionally, type.
   * http://www.w3.org/TR/performance-timeline/#dom-performance-getentriesbyname
   *
   * NOTE: This will only work for marks and measures.
   *
   * @param {string} name Entry name
   * @param {string} [entryType] Entry type (eg 'mark' or 'measure')
   *
   * @return {PerformanceEntry[]} Array of PerformanceEntrys
   */
  performance.getEntriesByName = function(name, entryType) {
    if (entryType && entryType !== 'mark' && entryType !== 'measure') {
      return [];
    }

    // see note in ensurePerformanceTimelineOrder() on why this is required
    if (typeof entryType !== 'undefined' && entryType === 'measure') {
      ensurePerformanceTimelineOrder();
    }

    // find all entries of the name and (optionally) type
    var entries = [];
    for (i = 0; i < performanceTimeline.length; i++) {
      if (typeof entryType !== 'undefined' &&
        performanceTimeline[i].entryType !== entryType) {
        continue;
      }

      if (performanceTimeline[i].name === name) {
        entries.push(performanceTimeline[i]);
      }
    }

    return entries;
  };

  //
  // UserTiming support
  //

  // only used for measure(), to quickly see the latest timestamp of a mark
  var marks = {};

  /**
   * UserTiming mark
   * http://www.w3.org/TR/user-timing/#dom-performance-mark
   *
   * @param {string} markName Mark name
   */
  performance.mark = function (markName) {
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
    addToPerformanceTimeline({
      entryType: 'mark',
      name: markName,
      startTime: now,
      duration: 0,
      epoch: epoch // NON-STANDARD EXTENSION
    });
  };

  /**
   * UserTiming clear marks
   * http://www.w3.org/TR/user-timing/#dom-performance-clearmarks
   *
   * @param {string} markName Mark name
   */
  performance.clearMarks = function (markName) {
    if (!markName) {
      // clear all marks
      marks = {};
    } else {
      marks[markName] = [];
    }

    clearEntriesFromPerformanceTimeline('mark', markName);
  };

  /**
   * UserTiming measure
   * http://www.w3.org/TR/user-timing/#dom-performance-measure
   *
   * @param {string} measureName Measure name
   * @param {string} [startMark] Start mark name
   * @param {string} [endMark] End mark name
   */
  performance.measure = function (measureName, startMark, endMark) {
    var now = performance.now();

    if (!measureName) {
      throw new Error('Measure must be specified');
    }

    // if there isn't a startMark, we measure from navigationStart to now
    if (!startMark) {
      // add to perf timeline as well
      addToPerformanceTimeline({
        entryType: 'measure',
        name: measureName,
        startTime: 0,
        duration: now
      });

      return;
    }

    //
    // If there is a startMark, check for it first in the NavigationTiming
    // interface, then check our own marks.
    //
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

    //
    // If there is a endMark, check for it first in the NavigationTiming
    // interface, then check our own marks.
    //
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

    // add to perf timeline as well
    addToPerformanceTimeline({
      entryType: 'measure',
      name: measureName,
      startTime: startMarkTime,
      duration: duration
    });
  };

  /**
   * UserTiming clear measures
   * http://www.w3.org/TR/user-timing/#dom-performance-clearmeasures
   *
   * @param {string} measureName Measure name
   */
  performance.clearMeasures = function (measureName) {
    clearEntriesFromPerformanceTimeline('measure', measureName);
  };

  //
  // Export UserTiming to the appropriate location.
  //
  // When included directly via a script tag in the browser,
  // we're good as we've been updating the window.performance object.
  //
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