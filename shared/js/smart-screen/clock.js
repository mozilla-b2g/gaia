/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

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

/** @exports Clock */
exports.Clock = Clock;

})(window);
