/* global LockScreenBasicComponent, LockScreenClockWidgetTick */
'use strict';

/**
 * The Clock widget on LockScreen.
 * Clock widget states:
 * Clock (init), ClockTick, ClockStop
 *
 * This is only a initialization state, and would immediately
 * transfer to the starting state.
 *
 * Initialization state should be the only one state which isn't
 * reentrant. Other states by default should be reentrant.
 *
 * And we assume that every following step would receive the same
 * 'states' this state prepared, unless it's necessary to prepare a
 * new 'states' for some states.
 **/
(function(exports) {
  var LockScreenClockWidget = function() {
    LockScreenBasicComponent.apply(this);
    this.states = {
      properties: null,
      idTickInterval: null,
      timeFormat: window.navigator.mozHour12 ?
        navigator.mozL10n.get('shortTimeFormat12') :
        navigator.mozL10n.get('shortTimeFormat24')
    };
    this.elements = {
      view: null,
      time: '#lockscreen-clock-time',
      date: '#lockscreen-clock-date'
    };
  };

  /**
   * When we initialized this widget,
   * we tick the clock.
   */
  LockScreenClockWidget.prototype.start =
  function(states, components, elements) {
    return LockScreenBasicComponent.start
      .call(this, states, components, elements)
      .next(this.transferToClockTick.bind(this));
  };

  LockScreenClockWidget.prototype.transferToClockTick =
  function() {
    return this.transferTo(LockScreenClockWidgetTick);
  };
  exports.LockScreeClockWidget = LockScreenClockWidget;
})(window);

