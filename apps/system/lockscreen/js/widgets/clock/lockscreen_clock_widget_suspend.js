/* global DOMEventSource */
/* global LockScreenBasicState, LockScreenClockWidgetTick */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetSuspend = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenClockWidgetSuspend';
    this.configs.stream.events = ['screenchange'];
    this.configs.stream.sources = [
      new DOMEventSource({ events: ['screenchange'] }) ];
  };
  LockScreenClockWidgetSuspend.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenClockWidgetSuspend.prototype.handleEvent = function(evt) {
    if ('screenchange' === evt.type && evt.detail.screenEnabled) {
      return this.transferToTickState();
    }
  };

  LockScreenClockWidgetSuspend.prototype.transferToTickState =
  function() {
    return this.transferTo(LockScreenClockWidgetTick);
  };

  exports.LockScreenClockWidgetSuspend = LockScreenClockWidgetSuspend;
})(window);

