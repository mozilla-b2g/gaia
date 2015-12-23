/* global Stream, DOMEventSource, MinuteClockSource */
/* global LockScreenClockWidgetSuspend, LockScreenBasicState */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetTick = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenClockWidgetTick';
    this.configs.stream.events = [
      'ftudone',
      'moztimechange',
      'lockscreen-notification-clock-tick'
    ];
    this.configs.stream.interrupts = [
      'screenchange'
    ];
    this.configs.stream.sources =
      [new DOMEventSource({events: [
        'screenchange',
        'ftudone',
        'moztimechange',
        'screenchange',
        'lockscreen-notification-clock-tick'
        ]}),
        new MinuteClockSource({
          'type': 'lockscreen-notification-clock-tick'
        })
      ];
    this.handleSourceEvent = this.handleSourceEvent.bind(this);
  };
  LockScreenClockWidgetTick.prototype =
    Object.create(LockScreenBasicState.prototype);

  /**
   * Note:
   * Due to performance issue we actually forked the start method to two,
   * the first one, with previous state is Setup, means it's from the widget
   * initialization, and need a full warming up before we call the clock
   * updating function; the second one, because of Bug 1234731, will update
   * the clock in the Suspend state in prior to this state, so we shouldn't
   * call it here again.
   *
   * In fact, a state diagram conscious solution is to split one common Tick
   * state into two "TickAfterSetup" and "TickFromSuspend" states.
   * However, this is too rigid and verbosed, so that although we concern about
   * the growth of code may soon mix the complicated statements up, we may
   * treat the argument and branch as the threshold. If we trick the start
   * method more than this case, we should immediately reconsider to split the
   * state.
   */
  LockScreenClockWidgetTick.prototype.start = function() {
    if ('LockScreenClockWidgetSetup' !==
        this.component._previousState.configs.name) {
      return this.restart();
    }

    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleSourceEvent)
      .next(this.component.updateFormatters.bind(this.component))
      .next(this.component.updateClock.bind(this.component))
      .next(this.stream.ready.bind(this.stream));
  };

  LockScreenClockWidgetTick.prototype.restart = function() {
    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleSourceEvent)
      .next(this.stream.ready.bind(this.stream));
  };

  LockScreenClockWidgetTick.prototype.stop =
  function() {
    return LockScreenBasicState.prototype.stop.call(this);
  };

  LockScreenClockWidgetTick.prototype.handleSourceEvent =
  function(evt) {
    switch (evt.type) {
      case 'moztimechange':
        this.component.updateFormatters();
        this.component.updateClock();
        break;
      case 'ftudone':
      case 'lockscreen-notification-clock-tick':
        this.component.updateClock();
        break;
      case 'screenchange':
        if (!evt.detail.screenEnabled) {
          return this.transferToSuspend();
        }
        break;
    }
  };

  LockScreenClockWidgetTick.prototype.transferToSuspend = function() {
    this.component.transferTo(LockScreenClockWidgetSuspend);
  };

  exports.LockScreenClockWidgetTick = LockScreenClockWidgetTick;
})(window);

