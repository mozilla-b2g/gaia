/* global Source */
/* global LockScreenBasicComponent, LockScreenClockWidgetStop */
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
  var LockScreenClockWidgetStart = function() {
    LockScreenBasicComponent.apply(this);
    this.configs = {
      stream: {
        events: ['screenchange'],
        interval: 60000 // Tick interval: update clock every minute.
      }
    };
    this.states = {
      properties: null,
      idTickInterval: null,
      timeFormat: null
    };
    this.elements = {
      view: null,
      time: '#lockscreen-clock-time',
      date: '#lockscreen-clock-date'
    };
    this.configs.stream.sources = [
      Source.events(this.configs.stream.events)
      //TODO: mozSettings since even unlocked, settings change
    ];
  };

  /**
   * When we start/initialize this start (transfer to this state),
   * we tick the clock.
   */
  LockScreenClockWidgetStart.prototype.start =
  function(states, components, elements) {
    return LockScreenBasicComponent.start
      .call(this, states, components, elements)
      .next(this.ready.bind(this))
      .next(this.tickClock.bind(this));
  };

  LockScreenClockWidgetStart.prototype.stop =
  function() {
    return LockScreenBasicComponent.stop
      .call(this)
      .next(() => {
        window.clearInterval(this.states.idTickInterval);
      });
  };

  LockScreenClockWidgetStart.prototype.tickClock =
  function() {
    this.states.idTickInterval =
      setInterval(this.updateClock.bind(this),
      this.configs.interval);
  };

  LockScreenClockWidgetStart.prototype.updateClock =
  function() {
    var now = Date.now();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.configs.timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');
    var clockHTML = f.localeFormat(now, timeFormat);
    var dateText = f.localeFormat(now, dateFormat);

    this.elements.clock.innerHTML = clockHTML;
    this.elements.date.textContent = dateText;
  };

  LockScreenClockWidgetStart.prototype.handleEvent =
  function(evt) {
    if ('screenchange' === evt.type && !evt.screenEnabled) {
      return this.transferToStopState();
    }
  };

  LockScreenClockWidgetStart.prototype.transferToStopState =
  function() {
    return this.transferTo(LockScreenClockWidgetStop);
  };
  exports.LockScreeClockWidgetStart = LockScreenClockWidgetStart;
})(window);

