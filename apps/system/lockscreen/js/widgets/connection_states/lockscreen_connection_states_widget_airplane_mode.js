/* global SettingSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetRadioOn */
'use strict';

(function(exports) {
  var LockScreenConnectionStatesWidgetAirplaneMode =
  function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesWidgetAirplaneMode';
    this.configs.stream.interrupts = [
      'ril.radio.disabled'
    ];
    this.configs.stream.sources = [
      new SettingSource({settings: [
        'ril.radio.disabled'
      ]})
    ];
  };
  LockScreenConnectionStatesWidgetAirplaneMode.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesWidgetAirplaneMode.prototype.start =
  function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.render.bind(this));
  };

  LockScreenConnectionStatesWidgetAirplaneMode.prototype.handleSourceEvent =
  function(evt) {
    if ('ril.radio.disabled' === evt.type && false === evt.detail) {
      return this.transferTo(LockScreenConnectionStatesWidgetRadioOn);
    }
  };

  LockScreenConnectionStatesWidgetAirplaneMode.prototype.render =
  function() {
    var elements = this.component.resources.elements;
    // Must explicit call this or would leave undefined lines when updating.
    this.component.resetAppearance();
    this.component.writeLabel(elements.simoneline, 'airplaneMode');
  };

  exports.LockScreenConnectionStatesWidgetAirplaneMode =
    LockScreenConnectionStatesWidgetAirplaneMode;
})(window);

