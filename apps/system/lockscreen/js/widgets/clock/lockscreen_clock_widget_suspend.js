/* global Stream, DOMEventSource */
/* global LockScreenClockWidgetTick, LockScreenBasicState */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetSuspend = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenClockWidgetSuspend';
    this.configs.stream.interrupts = [
      'screenchange',
    ];
    this.configs.stream.sources =
      [new DOMEventSource({events: ['screenchange']})];
    this.handleSourceEvent = this.handleSourceEvent.bind(this);
  };
  LockScreenClockWidgetSuspend.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenClockWidgetSuspend.prototype.start = function() {
    this.stream = new Stream(this.configs.stream);
    return this.stream.start(this.handleSourceEvent)
      .next(this.stream.ready.bind(this.stream));
  };

  LockScreenClockWidgetSuspend.prototype.stop =
  function() {
    return LockScreenBasicState.prototype.stop.call(this);
  };

  LockScreenClockWidgetSuspend.prototype.handleSourceEvent =
  function(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (evt.detail.screenEnabled) {
          // Bug 1234731 mentioned that if we update clock in tick,
          // asynchronous step means it will be queued after other incidents
          // at the moment screen get light up (ex: ril events in Gecko),
          // so there is a visual lag that we need to deal with.
          //
          // The solution is we update the clock before we transfer to the
          // Tick state, so that the first painting will be earlier, and using
          // another entry in tick to transfer to, so that we can avoid
          // calling the function again in the Tick state.
          this.component.updateClock();
          return this.transferToTick();
        }
    }
  };

  LockScreenClockWidgetSuspend.prototype.transferToTick =
  function() {
    this.component.transferTo(LockScreenClockWidgetTick);
  };

  exports.LockScreenClockWidgetSuspend = LockScreenClockWidgetSuspend;
})(window);

