/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetRadioOn */
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
  };
  LockScreenConnectionStatesWidgetSetup.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesWidgetSetup.prototype.start = function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.component.fetchRadioStatus.bind(this.component))
      .next(this.queryElements.bind(this))
      .next(this.dispatchToNext.bind(this));
  };

  /**
   * According to the current resources to transfer to the next state.
   * Only handle the first level of the whole tree of possibilities.
   */
  LockScreenConnectionStatesWidgetSetup.prototype.dispatchToNext = function() {
    // No SIMs must be emergency-calls-only, which is detected after this stage.
    if (this.component.resources.airplaneMode) {
      return this.transferTo(LockScreenConnectionStatesWidgetAirplaneMode);
    } else {
      return this.transferTo(LockScreenConnectionStatesWidgetRadioOn);
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

