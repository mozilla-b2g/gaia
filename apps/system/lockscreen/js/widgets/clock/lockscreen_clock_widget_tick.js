/* global Source */
/* global LockScreenBasicComponent, LockScreenClockWidgetSuspend */
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
  var LockScreenClockWidgetTick = function() {
    LockScreenBasicComponent.apply(this);
    this.configs = {
      name: 'LockScreenClockWidgetTick',
      stream: {
        events: ['screenchange', 'timeformatchange'],
      },
      interval: 6000 // Tick interval: update clock every minute.
    };
    this.states = {
      properties: null,
      idTickInterval: null,
      timeFormat: null
    };
    this.elements = {
      view: null,
      time: '#lockscreen-clock-time',
      date: '#lockscreen-date'
    };
    this.configs.stream.sources = [
      Source.events(this.configs.stream.events)
    ];
  };
  LockScreenClockWidgetTick.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  /**
   * When we start/initialize this start (transfer to this state),
   * we tick the clock.
   */
  LockScreenClockWidgetTick.prototype.start =
  function(states, components, elements) {
    return LockScreenBasicComponent.prototype.start
      .call(this, states, components, elements)
      .next(() => {
        this.states.timeFormat = window.navigator.mozHour12 ?
            navigator.mozL10n.get('shortTimeFormat12') :
            navigator.mozL10n.get('shortTimeFormat24');
      })
      .next(this.tickClock.bind(this));
  };

  LockScreenClockWidgetTick.prototype.stop =
  function() {
    return LockScreenBasicComponent.prototype.stop
      .call(this)
      .next(() => {
        window.clearInterval(this.states.idTickInterval);
      });
  };

  LockScreenClockWidgetTick.prototype.tickClock =
  function() {
    this.states.idTickInterval =
      setInterval(this.updateClock.bind(this),
      this.configs.interval);
  };

  LockScreenClockWidgetTick.prototype.updateClock =
  function() {
    var now = new Date();
    var f = new navigator.mozL10n.DateTimeFormat();
    var _ = navigator.mozL10n.get;

    var timeFormat = this.states.timeFormat.replace('%p', '<span>%p</span>');
    var dateFormat = _('longDateFormat');

    var timeHTML = f.localeFormat(now, timeFormat);
    var dateText = f.localeFormat(now, dateFormat);

    this.elements.time.innerHTML = timeHTML;
    this.elements.date.textContent = dateText;
  };

  LockScreenClockWidgetTick.prototype.handleEvent =
  function(evt) {
    switch (evt.type) {
      case 'screenchange':
        console.log('>> screenchange in handler');
        if (!evt.screenEnabled) {
          return this.transferToSuspendState();
        }
        break;
      case 'timeformatchange':
        // Since updating clock is a fixpoint, don't transfer.
        this.states.timeFormat = window.navigator.mozHour12 ?
          navigator.mozL10n.get('shortTimeFormat12') :
          navigator.mozL10n.get('shortTimeFormat24');
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

