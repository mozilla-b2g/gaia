/* global DOMEventSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStateWidgetAirplaneMode */
/* global LockScreenConnectionStateWidgetRadioOn */
'use strict';

/**
 * After setup resources & properties of this component, this state
 * would receive various changes to transfer to different state that
 * would update the connection information according to the change.
 **/
(function(exports) {
  var LockScreenConnectionStatesWidgetSetup = function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesWidgetSetup';
    // Just to prevent stream without stream would throw error.
    this.configs.stream.sources = [
      new DOMEventSource({events: []}),
    ];
  };
  LockScreenConnectionStatesWidgetSetup.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesWidgetSetup.prototype.start = function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.component.fetchRadioStatus.bind(this))
      .next(this.queryElements.bind(this))
      .next(this.dispatchToNext.bind(this));
  };

  /**
   * According to the current resources to transfer to the next state.
   * Only handle the first branch of decision tree: whether it's in airplane
   * mode or not. Other detecting & transferring stuff should be handled
   * by other states.
   */
  LockScreenConnectionStatesWidgetSetup.prototype.dispatchToNext = function() {
    if (this.component.resources.airplaneMode) {
      return this.transferTo(LockScreenConnectionStateWidgetAirplaneMode);
    } else {
      return this.transferTo(LockScreenConnectionStateWidgetRadioOn);
    }
  };

  LockScreenConnectionStatesWidgetSetup.prototype.queryElements = function() {
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

  exports.LockScreenConnectionStatesWidgetSetup =
    LockScreenConnectionStatesWidgetSetup;
})(window);

