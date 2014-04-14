'use strict';

(function(exports) {

  /**
   * Creates an object used for refreshing the clock UI element. Handles all
   * related timer manipulation (start/stop/cancel).
   * @class  Clock
   */
  function Clock() {
    /**
     * One-shot timer used to refresh the clock at a minute's turn
     * @memberOf Clock
     */
    this.timeoutID = null;

    /**
     * Timer used to refresh the clock every minute
     * @memberOf Clock
     */
    this.timerID = null;

    /**
     * Start the timer used to refresh the clock, will call the specified
     * callback at every timer tick to refresh the UI. The callback used to
     * refresh the UI will also be called immediately to ensure the UI is
     * consistent.
     *
     * @param {Function} refresh Function used to refresh the UI at every timer
     *        tick, should accept a date object as its only argument.
     * @memberOf Clock
     */
    this.start = function cl_start(refresh) {
      var date = new Date();
      var self = this;

      refresh(date);

      if (this.timeoutID == null) {
        this.timeoutID = window.setTimeout(function cl_setClockInterval() {
          refresh(new Date());

          if (self.timerID == null) {
            self.timerID = window.setInterval(function cl_clockInterval() {
              refresh(new Date());
            }, 60000);
          }
        }, (60 - date.getSeconds()) * 1000);
      }
    };

    /**
     * Stops the timer used to refresh the clock
     * @memberOf Clock
     */
    this.stop = function cl_stop() {
      if (this.timeoutID != null) {
        window.clearTimeout(this.timeoutID);
        this.timeoutID = null;
      }

      if (this.timerID != null) {
        window.clearInterval(this.timerID);
        this.timerID = null;
      }
    };
  }

  exports.Clock = Clock;
})(window);

