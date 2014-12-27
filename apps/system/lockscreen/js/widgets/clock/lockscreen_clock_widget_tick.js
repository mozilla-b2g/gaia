/* global DOMEventSource, TimerSource */
/* global LockScreenBasicState, LockScreenClockWidgetSuspend */
'use strict';

/**
 * It would update the clock every minute.
 *
 * A side note: it needn't update clock when the 24-hour setting changed
 * because user can't change it when this state is activated (screen locked).
 * However, to fetch it from mozL10n as properties is still necessary.
 * So this states (in fact, all LockScreen states) should be activated
 * only after l10n is ready.
 **/
(function(exports) {
  var LockScreenClockWidgetTick = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenClockWidgetTick';
    this.configs.stream.events = [
      'screenchange',
      'lockscreen-notification-clock-tick'
    ];
// TODO: debug only. change to 60000.
    this.configs.tickInterval = 1000;
    // So that everytime user unlock to set the new format,
    // this state can response to use the new one, since
    // transfer back to this state means to new an instance again.
    // And that is the reason we don't need to monitor the 'timeformatchange'
    // event, since the event can't be fired while the screen is locked.
    this.configs.timeFormat = this.getTimeformat();
    this._timerSource = null;
  };
  LockScreenClockWidgetTick.prototype =
    Object.create(LockScreenBasicState.prototype);

  /**
   * When we start/initialize this start (transfer to this state),
   * we tick the clock.
   */
  LockScreenClockWidgetTick.prototype.start = function() {
    // Must set timer source in configs at this function,
    // or it would start tick in constructor.
    this._timerSource =
      new TimerSource({
        generator: () => {
          return { type: 'lockscreen-notification-clock-tick' };
        },
        interval: this.configs.tickInterval
      });
    this.configs.stream.sources = [
      new DOMEventSource({
        events: ['screenchange']
      }),
      this._timerSource
    ];
    // Need to update it first, before the clock tick.
    return LockScreenBasicState.prototype.start.apply(this, arguments)
      .next(this.updateClock.bind(this));
  };

  LockScreenClockWidgetTick.prototype.getTimeformat = function() {
    return window.navigator.mozHour12 ?
      navigator.mozL10n.get('shortTimeFormat12') :
      navigator.mozL10n.get('shortTimeFormat24');
  };

  LockScreenClockWidgetTick.prototype.stop =
  function() {
    return LockScreenBasicState.prototype.stop
      .call(this)
      .next(this._timerSource.stop.bind(this._timerSource));
  };

  LockScreenClockWidgetTick.prototype.updateClock =
  function() {
    var now = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.configs.timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');

    var timeHTML = f.localeFormat(now, timeFormat);
    var dateText = f.localeFormat(now, dateFormat);
// TODO: debug only
console.log('>> updateClock');

    this.component.resources.elements.time.innerHTML = timeHTML;
    this.component.resources.elements.date.textContent = dateText;
  };

  LockScreenClockWidgetTick.prototype.handleEvent =
  function(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled) {
          return this.transferToSuspendState();
        }
        break;
      case 'lockscreen-notification-clock-tick':
        this.updateClock();
        break;
    }
  };

  LockScreenClockWidgetTick.prototype.transferToSuspendState =
  function() {
    return this.transferTo(LockScreenClockWidgetSuspend);
  };
  exports.LockScreenClockWidgetTick = LockScreenClockWidgetTick;
})(window);

