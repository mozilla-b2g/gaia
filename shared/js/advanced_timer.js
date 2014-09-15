/* exported advanced_timer */

'use strict';

var advanced_timer = {
  /**
   * Maps between user Ids and navigator ones
   */
  timers: {},

  /**
   * Register a new timer with the user's timerId
   */
  start: function(timerId, timeout, callback) {
    if (typeof(callback) != 'function') {
      callback = function() {};
    }

    var self = this;
    var _id = setTimeout(function advTimer() {
      var realUsedTime = new Date().getTime() - self.timers[timerId].timestamp;
      delete(self.timers[timerId]);
      callback(realUsedTime);
    }, timeout);
    this.timers[timerId] = {
      'timeout': timeout,
      'internalTimerId': _id,
      'timestamp': new Date().getTime()
    };
  },

  /**
   * Stops timer and returns the pending time
   */
  stop: function(timerId) {
    var timer = this.timers[timerId];
    if (!timer) {
      return 0;
    }
    clearTimeout(timer.internalTimerId);
    var pendingTime = this.queryPendingTime();
    delete(this.timers[timerId]);
    return pendingTime;
  },

  /**
   * Returns the pending time to timeout the timer
   */
  queryPendingTime: function(timerId) {
    var timer = this.timers[timerId];
    if (!timer) {
      return 0;
    }
    return timer.timeout - (new Date().getTime() - timer.timestamp);
  }
};
