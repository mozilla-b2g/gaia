/* global DOMEventSource */
/* global LockScreenBasicState */
/* global LockScreenClockWidgetTick */
'use strict';

/**
 * Setup state would initialize all resources and properties the
 * component has.
 *
 * This is only a initialization state, and would immediately
 * transfer to the starting state.
 *
 * Initialization state should be the only one state which isn't
 * reentrant. Other states by default should be reentrant.
 **/
(function(exports) {
  var LockScreenClockWidgetSetup = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenClockWidgetSetup';
    // Just to prevent stream without stream would throw error.
    this.configs.stream.sources = [ new DOMEventSource({}) ];
  };
  LockScreenClockWidgetSetup.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenClockWidgetSetup.prototype.start = function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.queryElements.bind(this))
      .next(this.component.updateFormatters.bind(this.component))
      .next(this.component.updateClock.bind(this.component))
      .next(this.transferToTick.bind(this));
  };

  LockScreenClockWidgetSetup.prototype.transferToTick = function() {
    return this.transferTo(LockScreenClockWidgetTick);
  };

  LockScreenClockWidgetSetup.prototype.queryElements = function() {
    var elements = this.component.resources.elements;
    for (var key in elements) {
      if ('string' === typeof elements[key]) {
        var query = elements[key];
        var result = document.getElementById(query);
        if (!result) {
          throw new Error(`Can't query element ${key} with query: ${query}`);
        }
        elements[key] = result;
      }
    }
  };

  exports.LockScreenClockWidgetSetup = LockScreenClockWidgetSetup;
})(window);

