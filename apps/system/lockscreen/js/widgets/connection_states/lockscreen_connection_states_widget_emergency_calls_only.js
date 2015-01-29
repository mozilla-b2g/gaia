/* global SettingSource, DOMEventSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetRadioOn */
'use strict';

/***/
(function(exports) {
  var LockScreenConnectionStatesWidgetEmergencyCallsOnly =
  function(component) {
    LockScreenBasicState.apply(this, arguments);
    this.configs.name = 'LockScreenConnectionStatesWidgetEmergencyCallsOnly';

    // If these events occur it deserves a check to transfer to another state.
    this.configs.stream.interrupts = [
      'ril.radio.disabled',
      'simslot-iccinfochange',
      'simslot-cardstatechange',
      'voicechange'
    ];
    this.configs.stream.sources = [
      new SettingSource({settings: [
        'ril.radio.disabled'
      ]}),
      new DOMEventSource({events: [
      'simslot-iccinfochange',
      'simslot-cardstatechange',
      'voicechange'
      ]})
    ];
  };
  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype =
    Object.create(LockScreenBasicState.prototype);

  /**
   * The previous state should determinate if it's in emergency calls only mode
   * and update the status in the resources of component. There shouldn't be
   * any case that the mode is actally off but transfer to this state.
   */
  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype.start =
  function() {
    return LockScreenBasicState.prototype.start.call(this)
      .next(this.render.bind(this));
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype.handleEvent =
  function(evt) {
    if ('ril.radio.disabled' === evt.type && true === evt.detail) {
      return this.transferTo(LockScreenConnectionStatesWidgetAirplaneMode);
    } else {
      return this.component.fetchEmergencyCallsOnlyStatus()
      .next((result) => {
        if (!result.modeon) {
          // Should transfer back if the mode now is off.
          return this.transferTo(LockScreenConnectionStatesWidgetRadioOn)
            .process;
        }
      });
    }
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype.render =
  function() {
    var elements = this.component.elements;
    this.component.writeLabel(elements.simoneline, 'emergencyCallsOnly');
    this.component.writeLabel(elements.simtwoline,
      this.component.resources.emergencyCallsOnly.reason);
  };

  exports.LockScreenConnectionStatesWidgetEmergencyCallsOnly =
    LockScreenConnectionStatesWidgetEmergencyCallsOnly;
})(window);

