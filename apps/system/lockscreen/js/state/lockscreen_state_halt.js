/* global DOMEventSource */
/* global LockScreenBasicState */
'use strict';

/**
 * Parent need a sure state that children have been halt.
 */
(function(exports) {
  var LockScreenStateHalt = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = '__halt__';
    // Give it a dummy source to prevent error.
    this.configs.stream.sources = [
      new DOMEventSource({ events: [] })
    ];
  };
  LockScreenStateHalt.prototype =
    Object.create(LockScreenBasicState.prototype);

  exports.LockScreenStateHalt = LockScreenStateHalt;
})(window);

