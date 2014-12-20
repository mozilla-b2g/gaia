/* global LockScreenBasicComponent, LockScreenClockWidgetStart */
'use strict';

/***/
(function(exports) {
  var LockScreenClockWidgetStop = function() {
    LockScreenBasicComponent.apply(this);
    this.configs.events = ['screenchange'];
  };

  LockScreenClockWidgetStop.prototype.handleEvent = function(evt) {
    if ('screenchange' === evt.type && !evt.screenEnabled) {
      return this.transferToStartState();
    }
  };

  LockScreenClockWidgetStop.prototype.transferToStartState =
  function() {
    return this.transferTo(LockScreenClockWidgetStart);
  };

  exports.LockScreenClockWidgetStop = LockScreenClockWidgetStop;
})(window);

