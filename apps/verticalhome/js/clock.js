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
   * Contains time format (12 Hour or 24 Hour)
   *
   * @memberOf Clock
   * @type {string from localization}
   */
  this.timeFormat = null;

  /**
   * Dom Object that contains time
   *
   * @memberOf Clock
   * @type {Dom element}
   */
  this.clockTime = document.getElementById('clock-time');

  /**
   * This dom object contains date information
   *
   * @memberOf Clock
   * @type {date}
   */
  this.date = document.getElementById('date');

  window.addEventListener('timeformatchange', this);

  /**
   * Handle the event which fires when time format is chaned
   *
   * @memberOf Clock
   * @param  {object} e [Event object]
   */
  this.handleEvent = function cl_handleEvents(e){

    switch(e.type) {
      case 'timeformatchange':
        if (!this.l10nready) {
          return;
        }
        this.setClockFormat();

        break;
    }

  };

  /**
   * We need to do some refreshing thing.
   * It must be done only when l10n is ready.
   *
   * @memberOf Clock
   * @return {none}
   */
  this.setClockFormat = function cl_setClockFormat() {
    this.timeFormat = window.navigator.mozHour12 ?
      navigator.mozL10n.get('shortTimeFormat12') :
      navigator.mozL10n.get('shortTimeFormat24');
    this.refreshClock(new Date());

  };

  /**
   * Refresh clock and refresh localization
   *
   * @memberOf Clock
   * @param  {Date} now [Takes current date]
   * @return {[none]}
   */
  this.refreshClock = function cl_refreshClock(now) {
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');
    this.clockTime.innerHTML = f.localeFormat(now, timeFormat);
    this.date.textContent = f.localeFormat(now, dateFormat);
  };

  /**
   * Start the timer used to refresh the clock, will call the function
   * at every timer tick to refresh the UI.
   *
   * @memberOf Clock
   */
  this.start = function cl_start() {
    var date = new Date();
    var self = this;

    this.refreshClock(date);

    if (this.timeoutID == null) {
      this.timeoutID = window.setTimeout(function cl_setClockInterval() {

        if (self.timerID == null) {
          self.timerID = window.setInterval(function cl_clockInterval() {
            self.refreshClock(new Date());
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

  navigator.mozL10n.ready(function(){
    this.l10nready = true;
    this.setClockFormat.bind(this);
  }.bind(this));

}

/** @exports Clock */
exports.Clock = Clock;

})(window);
