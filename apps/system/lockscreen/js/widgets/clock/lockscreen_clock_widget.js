/* global LockScreenBasicComponent, LockScreenClockWidgetSetup, mozIntl */
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
    this.dateFormatter = Intl.DateTimeFormat(navigator.languages, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });

    // we're using mozIntl.DateTimeFormat to remove dayperiod
    this.timeFormatter = mozIntl.DateTimeFormat(navigator.languages, {
      hour12: navigator.mozHour12,
      dayperiod: false,
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  LockScreenClockWidget.prototype.updateClock =
  function() {
    var now = new Date();

    var timeText = this.timeFormatter.format(now);
    var dateText = this.dateFormatter.format(now);

    this.resources.elements.time.firstChild.data = timeText;
    this.resources.elements.date.firstChild.data = dateText;
    this.logger.debug('Clock updated', now);
  };

  exports.LockScreenClockWidget = LockScreenClockWidget;
})(window);

