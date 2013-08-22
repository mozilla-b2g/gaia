/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

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
      delete(self.timers[timerId]);
      callback();
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
