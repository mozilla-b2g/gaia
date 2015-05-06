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

  LockScreenClockWidgetTick.prototype.start = function() {
    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleSourceEvent)
      .next(() => {
        this.component._timeFormat = this.component.getTimeformat();
      })
      .next(this.component.updateClock.bind(this.component))
      .next(this.stream.ready.bind(this.stream));
  };

  LockScreenClockWidgetTick.prototype.stop =
  function() {
    return LockScreenBasicState.prototype.stop.call(this);
  };

  LockScreenClockWidgetTick.prototype.handleSourceEvent =
  function(evt) {
    switch (evt.type) {
      case 'ftudone':
      case 'moztimechange':
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

