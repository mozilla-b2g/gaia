/* global DOMEventSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetRadioOn */
/* global LockScreenConnectionStatesSIMWidget*/
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
      .next(this.setupSIMs.bind(this))
      .next(this.queryElements.bind(this))
      .next(this.dispatchToNext.bind(this));
  };

  /**
   * Only set them up; don't start them.
   */
  LockScreenConnectionStatesWidgetSetup.prototype.setupSIMs = function() {
    var sims = this.component.fetchSIMs();
    if (!sims) {
      return;   // No SIMs.
    }
    this.component._subcomponents.simone =
      new LockScreenConnectionStatesSIMWidget(this.elements.simone);
    this.component._subcomponents.simtwo =
      new LockScreenConnectionStatesSIMWidget(this.elements.simtwo);
  };

  /**
   * According to the current resources to transfer to the next state.
   * Only handle the first branch of decision tree: whether it's in airplane
   * mode or not. Other detecting & transferring stuff should be handled
   * by other states.
   */
  LockScreenConnectionStatesWidgetSetup.prototype.dispatchToNext = function() {
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

