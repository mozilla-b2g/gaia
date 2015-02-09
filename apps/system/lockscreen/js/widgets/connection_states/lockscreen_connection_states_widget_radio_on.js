/* global Process */
/* global SettingSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetEmergencyCallsOnly */
/* global LockScreenConnectionStatesSIMWidget*/
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

 /**
  * In radio on we assume that:
  * 1. NOT AirplaneMode
  * 2. Detect if it's emergency call only and dispatch to the state
  * 3. Fetch SIM informantion here. Since either no SIMs or in AirplaneMode
  *   we're unable to fetch SIM information.
  */
  LockScreenConnectionStatesWidgetRadioOn.prototype.start =
  function() {
    // Need to reset appearance since we may kick off the subcomponents
    // in this state.
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.component.resetAppearance.bind(this.component))
      .next(this.component.fetchSIMs.bind(this.component))
      .next(this.component.fetchEmergencyCallsOnlyStatus.bind(this.component))
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

  LockScreenConnectionStatesWidgetRadioOn.prototype.handleSourceEvent =
  function(evt) {
    this.component.logger.debug(
      `Check event if it\'s going to transfer state: ${evt.type}`);
    if ('ril.radio.disabled' === evt.type && true === evt.detail) {
      return this.transferTo(LockScreenConnectionStatesWidgetAirplaneMode);
    }
  };

  LockScreenConnectionStatesWidgetRadioOn.prototype.startSIMs =
  function() {
    // To wait all SIMs get started.
    // Process.wait ~= Promise.all, except it waits steps in Process.
    return Process.wait.apply({},
      Object.keys(this.component.resources.sims)
      .map((simName) => {
        var simslot = this.component.resources.sims[simName];
        this.component._subcomponents[simName] =
          new LockScreenConnectionStatesSIMWidget(
            this.component.resources.elements[simName]);
        // Start the sub-components, and turn the Stream returned by this
        // action into Process, so the outside 'Process.wait' could really
        // wait it.
        //
        // Need give it the SIM slot object from SIMSlotManager.
        return () => this.component._subcomponents[simName]
          .start({'simslot': simslot})
          .process;
      }));
  };

  exports.LockScreenConnectionStatesWidgetRadioOn =
    LockScreenConnectionStatesWidgetRadioOn;
})(window);

