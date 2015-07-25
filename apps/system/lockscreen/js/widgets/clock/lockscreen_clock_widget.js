/* global LockScreenBasicComponent, LockScreenClockWidgetSetup */
'use strict';

/**
 * The Clock widget on LockScreen.
 * Clock widget states:
 * ClockSetup, ClockTick, ClockStop
 **/
(function(exports) {
  var LockScreenClockWidget = function() {
    LockScreenBasicComponent.apply(this);
    this.resources.elements.time = 'lockscreen-clock-time';
    this.resources.elements.date = 'lockscreen-date';
    this.timeFormatter = null;
    this.dateFormatter = null;
    this.configs.logger.debug = false;  // turn on this when we're debugging
  };
  LockScreenClockWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenClockWidget.prototype.setup = function() {
    return (new LockScreenClockWidgetSetup(this));
  };

  LockScreenClockWidget.prototype.updateFormatters = function() {
    this.dateFormatter = new Intl.DateTimeFormat(navigator.languages, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    this.timeFormatter = new Intl.DateTimeFormat(navigator.languages, {
      hour12: navigator.mozHour12,
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  LockScreenClockWidget.prototype.updateClock =
  function() {
    var now = new Date();

    // this is a non-standard, Gecko only API, but we have
    // no other way to get the am/pm portion of the date and remove it.
    var amPm = now.toLocaleFormat('%p');

    var timeText = this.timeFormatter.format(now).replace(amPm, '').trim();
    var dateText = this.dateFormatter.format(now);

    this.resources.elements.time.textContent = timeText;
    this.resources.elements.date.textContent = dateText;
    this.logger.debug('Clock updated', now);
  };

  exports.LockScreenClockWidget = LockScreenClockWidget;
})(window);

