define(function(require, exports) {
'use strict';

require('shared/performance_testing_helper');

// Helper for the performance testing events. we created
// this dedicated module since we need some "state machine" logic to avoid
// race conditions and the app contains way too many async operations during
// startup and no simple way to listen to these events.

exports._isMonthAgendaInteractive = false;
exports._isMonthReady = false;
exports._isVisuallyActive = false;
exports._isPendingReady = false;

// TODO: It would be nice if this had an events interface so I could
//     simply do performance.once('moz-app-loaded', () => ...) and
//     I would be called immediately if we were already loaded or
//     when we're loaded otherwise.
var dispatched = {};

/**
 * Performance testing events. See <https://bugzil.la/996038>.
 */
function dispatch(eventType) {
  dispatched[eventType] = true;
  window.dispatchEvent(new CustomEvent(eventType));
}

exports.isComplete = function(eventType) {
  return dispatched[eventType];
};

/**
 * Dispatch 'moz-chrome-dom-loaded' event.
 * Designates that the app's *core* chrome or navigation interface
 * exists in the DOM and is marked as ready to be displayed.
 */
exports.domLoaded = function() {
  window.performance.mark('navigationLoaded');
  // PERFORMANCE EVENT (1): moz-chrome-dom-loaded
  dispatch('moz-chrome-dom-loaded');
};

/**
 * Designates that the app's *core* chrome or navigation interface
 * has its events bound and is ready for user interaction.
 */
exports.chromeInteractive = function() {
  window.performance.mark('navigationInteractive');
  // PERFORMANCE EVENT (2): moz-chrome-interactive
  dispatch('moz-chrome-interactive');
};

/**
 * Should be called when the MonthsDayView
 * rendered all the busytimes for that day.
 */
exports.monthsDayReady = function() {
  if (exports._isMonthAgendaInteractive) {
    return;
  }

  exports._isMonthAgendaInteractive = true;
  dispatchVisuallyCompleteAndInteractive();
};

/**
 * Should be called when the month is "ready" (rendered + event listeners)
 * including the busy times indicator.
 */
exports.monthReady = function() {
  if (exports._isMonthReady) {
    return;
  }

  exports._isMonthReady = true;
  dispatchVisuallyCompleteAndInteractive();
};

/**
 * app-visually-complete and content-interactive will happen after the
 * MonthChild#activate + rendering the busy counts for the current month +
 * DayBased#_loadRecords (inherited by MonthsDayView)
 */
function dispatchVisuallyCompleteAndInteractive() {
  if (exports._isVisuallyActive ||
      !exports._isMonthAgendaInteractive ||
      !exports._isMonthReady) {
    return;
  }

  exports._isVisuallyActive = true;

  // PERFORMANCE EVENT (3): moz-app-visually-complete
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  window.performance.mark('visuallyLoaded');
  dispatch('moz-app-visually-complete');

  // PERFORMANCE EVENT (4): moz-content-interactive
  // Designates that the app has its events bound for the minimum
  // set of functionality to allow the user to interact with the
  // "above-the-fold" content.
  window.performance.mark('contentInteractive');
  dispatch('moz-content-interactive');

  dispatchAppLoad();
}

/**
 * Register that pending manager completed first batch of operations.
 */
exports.pendingReady = function() {
  if (exports._isPendingReady) {
    return;
  }

  exports._isPendingReady = true;
  dispatchAppLoad();
};

/**
 * App is only considered "loaded" after the MonthView and MonthDayAgenda
 * are "ready" and the first pending operations batch is completed (loading
 * events from DB and recurring events expansion).
 */
function dispatchAppLoad() {
  if (!exports._isVisuallyActive || !exports._isPendingReady) {
    // to avoid race conditions (in case this is called before month view
    // is built), should not happen, but maybe in the future when IDB gets
    // faster this might be possible.
    return;
  }

  // PERFORMANCE EVENT (5): moz-app-loaded
  // Designates that the app is *completely* loaded and all relevant
  // "below-the-fold" content exists in the DOM, is marked visible,
  // has its events bound and is ready for user interaction. All
  // required startup background processing should be complete.
  window.performance.mark('fullyLoaded');
  dispatch('moz-app-loaded');
}

});
