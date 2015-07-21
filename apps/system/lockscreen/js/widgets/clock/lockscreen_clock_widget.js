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
    this._timeFormat = null;
    this.configs.logger.debug = false;  // turn on this when we're debugging
  };
  LockScreenClockWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenClockWidget.prototype.setup = function() {
    return (new LockScreenClockWidgetSetup(this));
  };

  LockScreenClockWidget.prototype.updateClock =
  function() {
    var now = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    /* In 12h format we don't want to display the AM/PM component on the
     * lockscreen. However there's no way to obtain such a string using
     * DateTimeFormat(). What we do instead is to inject a fake <span> tag
     * around the AM/PM component which we later remove from the string using
     * a regular expression. */
    var timeFormat = this._timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');

    var timeText =
      f.localeFormat(now, timeFormat).replace(/\s<span>.*<\/span>/, '');
    var dateText = f.localeFormat(now, dateFormat);

    this.resources.elements.time.textContent = timeText;
    this.resources.elements.date.textContent = dateText;
    this.logger.debug('Clock updated', now);
  };

  LockScreenClockWidget.prototype.getTimeformat = function() {
    return window.navigator.mozHour12 ?
      navigator.mozL10n.get('shortTimeFormat12') :
      navigator.mozL10n.get('shortTimeFormat24');
  };

  exports.LockScreenClockWidget = LockScreenClockWidget;
})(window);

