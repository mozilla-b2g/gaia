(function(exports) {
'use strict';

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
   * Dom Object that contains all information about time
   * @type {Dom element}
   */
  this.timeContainer = this.clockTime.parentNode;

  /**
   * This dom object contains date information
   *
   * @memberOf Clock
   * @type {date}
   */
  this.date = document.getElementById('date');

  window.addEventListener('timeformatchange', this);
  window.addEventListener('tick', this);

  /**
   * Handle the event which fires when time format is chaned
   *
   * @memberOf Clock
   * @param  {object} e [Event object]
   */
  this.handleEvent = function cl_handleEvents(e){

    switch(e.type) {
      /**
       * This event is recieved when time format has been changed.
       * For example from 24 hours time format to 12 hours time format.
       */
      case 'timeformatchange':
        if (!this.l10nready) {
          return;
        }
        this.setClockFormat();

        break;

      case 'tick':
        this.refreshClock(new Date());
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
    if (window.navigator.mozHour12){
      this.timeFormat = navigator.mozL10n.get('shortTimeFormat12Time');
      this.meridiem = navigator.mozL10n.get('shortTimeFormat12Meridiem');
    }else{
      this.timeFormat = navigator.mozL10n.get('shortTimeFormat24');
      this.meridiem = null;
    }
    this.refreshClock(new Date());

  };

  this.hide = function cl_hide() {
    this.timeContainer.classList.add('not-visible');
  };

  this.show = function cl_show(){
    this.timeContainer.classList.remove('not-visible');
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

    var dateFormat = _('longDateFormat');
    this.clockTime.innerHTML = '';
    this.clockTime.textContent = f.localeFormat(now, this.timeFormat);

    if (this.meridiem){
      var meridiemHTML = document.createElement('span');
      meridiemHTML.textContent = f.localeFormat(now, this.meridiem);
      this.clockTime.appendChild(meridiemHTML);
    }

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
    window.dispatchEvent(new CustomEvent('tick'));

    if (this.timeoutID == null) {
      this.timeoutID = window.setTimeout(function cl_setClockInterval() {

        if (self.timerID == null) {
          self.timerID = window.setInterval(function cl_clockInterval() {
            window.dispatchEvent(new CustomEvent('tick'));
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
