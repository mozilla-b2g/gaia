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

