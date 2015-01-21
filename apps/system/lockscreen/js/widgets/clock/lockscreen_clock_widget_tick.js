/* global Stream */
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
      'ftudone',
      'moztimechange',
      'screenchange',
      'lockscreen-notification-clock-tick'
    ];
    this.configs.tickInterval = 60000;
    // So that every time user unlock to set the new format,
    // this state can response to use the new one, since
    // transfer back to this state means to new an instance again.
    // And that is the reason we don't need to monitor the 'timeformatchange'
    // event, since the event can't be fired while the screen is locked.
    this.configs.timeFormat = this.getTimeformat();
    this._timerSource = new TimerSource({
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
  };
  LockScreenClockWidgetTick.prototype =
    Object.create(LockScreenBasicState.prototype);

  /**
   * When we start/initialize this start (transfer to this state),
   * we tick the clock.
   */
  LockScreenClockWidgetTick.prototype.start = function() {
    // When first start, update the clock first.
    this.updateClock();
    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleEvent.bind(this))
      .next(this.waitLastSeconds.bind(this))
      .next(this.stream.ready.bind(this.stream));
  };

  // This is necessary. Since we need to wait the last seconds
  // in the current minute to bootstrap the timer.
  LockScreenClockWidgetTick.prototype.waitLastSeconds = function() {
    return new Promise((resolve) => {
      // Which second in this minute we're.
      var seconds = (new Date()).getSeconds();
      var leftSeconds = 60 - seconds;
      window.setTimeout(() => {
        resolve();
      }, leftSeconds * 1000);
    });
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

    this.component.resources.elements.time.innerHTML = timeHTML;
    this.component.resources.elements.date.textContent = dateText;
  };

  LockScreenClockWidgetTick.prototype.handleEvent =
  function(evt) {
    switch (evt.type) {
      case 'ftudone':
      case 'moztimechange':
      case 'lockscreen-notification-clock-tick':
        this.updateClock();
        break;
      case 'screenchange':
        if (!evt.detail.screenEnabled) {
          return this.transferToSuspendState();
        }
        break;
    }
  };

  LockScreenClockWidgetTick.prototype.transferToSuspendState =
  function() {
    return this.transferTo(LockScreenClockWidgetSuspend);
  };
  exports.LockScreenClockWidgetTick = LockScreenClockWidgetTick;
})(window);

