/* global Process */
/* global SettingSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetEmergencyCallsOnly */
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
      .next(this.components.fetchEmergencyCallsOnlyStatus.bind(this))
      .next((statuz) => {
        if (statuz.modeon) {
          this.transferTo(LockScreenConnectionStatesWidgetEmergencyCallsOnly);
        }
        // Otherwise, stay at this state and start the SIM components.
        // Start the components allow them to display and update the
        // individual SIM status while it's changed.
      })
      .next(this.startSIMs.bind(this));
  };

  LockScreenConnectionStatesWidgetRadioOn.prototype.handleEvent =
  function(evt) {
    if ('ril.radio.disabled' === evt.type && true === evt.detail) {
      return this.transferTo(LockScreenConnectionStatesWidgetAirplaneMode);
    }
  };

  LockScreenConnectionStatesWidgetRadioOn.prototype.startSIMs =
  function() {
    // To wait all SIMs get started.
    // Process.wait ~= Promise.all, except it waits steps in Process.
    return Process.wait(Object.keys(this.component._subcomponents.sims)
      .map((simName) => {
        // Need give it the SIM slot object from SIMSlotManager.
        // Process could 'wait' other Processes at one step.
        return this.component._subcomponent.sims[simName]
          .start(this.resources.sims[simName])
          .process;
      }));
  };

  exports.LockScreenConnectionStateWidgetRadioOn =
    LockScreenConnectionStatesWidgetRadioOn;
})(window);

