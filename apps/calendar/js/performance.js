define(function() {
  'use strict';

  // this is just a helper for the performance testing events. we created this
  // dedicated module since we need some "state machine" logic to avoid race
  // conditions and the app contains way too many async operations during
  // startup and no simple way to listen to these events.

  var performance = {
    _isDayBaseInteractive: false,
    _isMonthReady: false,
    _isVisuallyActive: false,
    _isPendingReady: false,

    /**
     * Performance testing events. See <https://bugzil.la/996038>.
     */
    _dispatch: function(eventType) {
      window.dispatchEvent(new CustomEvent(eventType));
    },

    /**
     * Dispatch 'moz-chrome-dom-loaded' event.
     * Designates that the app's *core* chrome or navigation interface
     * exists in the DOM and is marked as ready to be displayed.
     */
    domLoaded: function() {
      // PERFORMANCE EVENT (1): moz-chrome-dom-loaded
      this._dispatch('moz-chrome-dom-loaded');
    },

    /**
     * Designates that the app's *core* chrome or navigation interface
     * has its events bound and is ready for user interaction.
     */
    chromeInteractive: function() {
      // PERFORMANCE EVENT (2): moz-chrome-interactive
      this._dispatch('moz-chrome-interactive');
    },

    /**
     * Should be called when the DayBased view (inherited by MonthsDayView)
     * rendered all the busytimes for that day.
     */
    dayBasedReady: function() {
      if (this._isDayBaseInteractive) {
        return;
      }
      this._isDayBaseInteractive = true;
      this._dispatchVisuallyCompleteAndInteractive();
    },

    /**
     * Should be called when the month is "ready" (rendered + event listeners)
     * including the busy times indicator.
     */
    monthReady: function() {
      if (this._isMonthReady) {
        return;
      }
      this._isMonthReady = true;
      this._dispatchVisuallyCompleteAndInteractive();
    },

    /**
     * app-visually-complete and content-interactive will happen after the
     * MonthChild#activate + rendering the busy counts for the current month +
     * DayBased#_loadRecords (inherited by MonthsDayView)
     */
    _dispatchVisuallyCompleteAndInteractive: function() {
      if (this._isVisuallyActive || !this._isDayBaseInteractive ||
          !this._isMonthReady) {
        return;
      }
      this._isVisuallyActive = true;

      // PERFORMANCE EVENT (3): moz-app-visually-complete
      // Designates that the app is visually loaded (e.g.: all of the
      // "above-the-fold" content exists in the DOM and is marked as
      // ready to be displayed).
      this._dispatch('moz-app-visually-complete');

      // PERFORMANCE EVENT (4): moz-content-interactive
      // Designates that the app has its events bound for the minimum
      // set of functionality to allow the user to interact with the
      // "above-the-fold" content.
      this._dispatch('moz-content-interactive');

      this._dispatchAppLoad();
    },

    /**
     * Register that pending manager completed first batch of operations.
     */
    pendingReady: function() {
      if (this._isPendingReady) {
        return;
      }
      this._isPendingReady = true;
      this._dispatchAppLoad();
    },

    /**
     * App is only considered "loaded" after the MonthView and MonthsDayView
     * are "ready" and the first pending operations batch is completed (loading
     * events from DB and recurring events expansion).
     */
    _dispatchAppLoad: function() {
      if (!this._isVisuallyActive || !this._isPendingReady) {
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
      this._dispatch('moz-app-loaded');
    },
  };

  return performance;
});
