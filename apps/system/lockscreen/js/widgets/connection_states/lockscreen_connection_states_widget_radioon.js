/* global SettingSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
'use strict';

/***/
(function(exports) {
  var LockScreenConnectionStatesWidgetRadioOn =
  function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesWidgetRadioOn';
    this.configs.stream.interrupts = [
      'ril.radio.disabled'
    ];
    this.configs.stream.sources = [
      new SettingSource({settings: [
        'ril.radio.disabled'
      ]})
    ];
  };
  LockScreenConnectionStatesWidgetRadioOn.prototype =
    Object.create(LockScreenBasicState.prototype);

  LockScreenConnectionStatesWidgetRadioOn.prototype.start =
  function() {
    // After the first line the interrupt get registered,
    // so if the radio get off, it would automatically be handled and
    // transfer to AirplaneMode.
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.dispatchToNext.bind(this));
  };

  LockScreenConnectionStatesWidgetRadioOn.prototype.handleEvent =
  function(evt) {
    if ('ril.radio.disabled' === evt.type && true === evt.detail) {
      return this.transferTo(LockScreenConnectionStatesWidgetAirplaneMode);
    }
  };

  LockScreenConnectionStatesWidgetRadioOn.prototype.dispatchToNext =
  function() {
    return this.component.fetchSIMs().then((sims) => {
      if (null === sims) {
        this.transferTo(LockScreenConnectionStatesWidgetNoSIMs);
      } else {
        this.resources.sims = sims;
      }
    })
    .then(this.components.fetchEmergencyCallsOnlyStatus.bind(this))
  };

  exports.LockScreenConnectionStateWidgetRadioOn =
    LockScreenConnectionStatesWidgetRadioOn;
})(window);

