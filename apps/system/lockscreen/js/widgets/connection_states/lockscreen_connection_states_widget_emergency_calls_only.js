/* global SettingSource, DOMEventSource */
/* global LockScreenBasicState */
/* global LockScreenConnectionStatesWidgetAirplaneMode */
/* global LockScreenConnectionStatesWidgetRadioOn */
/* global LockScreenConnectionStatesSIMWidget */
/* global LockScreenConnectionStatesWidget */
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
      new DOMEventSource({events: [
      'simslot-iccinfochange',
      'simslot-cardstatechange',
      'voicechange'
      ]}),
      new SettingSource({settings: [
        'ril.radio.disabled'
      ]})
    ];
    // @see 'renderSIMTwoLocked' method.
    this._domLineSIMTwoLocked = null;
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
    return LockScreenBasicState.prototype.start.apply(this, arguments)
      .next(this.startForwardVoicechange.bind(this))
      .next(() => {
        var reason = this.component.resources.emergencyCallsOnly.reason;
        if ('string' === typeof reason) {
          return this.render();
        } else if (reason.simtwolocked) {
          return this.renderSIMTwoLocked();
        }
      });
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype.stop =
  function() {
    return LockScreenBasicState.prototype.stop.apply(this, arguments)
      .next(this.stopForwardVoicechange.bind(this))
      .next(() => {
        if (this._domLineSIMTwoLocked) {
          return this.reverseSIMTwoLocked();
        }
      });
  };

  /**
   * A necessary forwarding hack since the original 'voicechange'
   * event bring nothing about which SIM slot is the event source,
   * and it wouldn't bubble to the top window.
   */
  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype
  .startForwardVoicechange = function() {
    if (!this.component.resources.sims) {
      return; // no SIMs.
    }
    for (var simName in this.component.resources.sims) {
      var simslot = this.component.resources.sims[simName];
      simslot.conn.addEventListener('voicechange',
        this.stream.configs.sources[0].onchange);
    }
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype
  .stopForwardVoicechange = function() {
    if (!this.component.resources.sims) {
      return; // no SIMs.
    }
    for (var simName in this.component.resources.sims) {
      var simslot = this.component.resources.sims[simName];
      simslot.conn.removeEventListener('voicechange',
        this.stream.configs.sources[0].onchange);
    }
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype
  .handleSourceEvent = function(evt) {
    this.component.logger.debug(
      `Check event if it\'s going to transfer state: ${evt.type}`);
    if ('ril.radio.disabled' === evt.type &&
        true === evt.detail) {
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

  /**
   * A special case: if SIM#2 is primary and it's locked,
   * it should show the emergency calls only label. Although
   * we needn't do that if SIM#1 is primary and it's locked.
   */
  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype
  .renderSIMTwoLocked = function() {
    // The rendering example:
    //
    //  SIM 1 AT&T (roaming)          -- line #1
    //  SIM 2 Emergency Calls Only    -- line #2
    //  (SIM PIN Required)            -- line #3
    //
    //  To render line #1 we need to create a SIM widget and delegate the
    //  rendering to it, since we don't want to duplicate the rendering
    //  code in this state.
    //
    //  To render line #2 we need a simple 'writeLabel' function call.
    //  To render line #3 we need to create a temporary DIV to contain
    //  the extra message, and make sure the line would be removed when
    //  the state exits.
    var elements = this.component.resources.elements;
    var simone = this.component.resources.sims.simone;
    var simtwo = this.component.resources.sims.simtwo;
    var message = LockScreenConnectionStatesWidget
      .EMERGENCY_CALL_MESSAGE_MAP[simtwo.simCard.cardState];
    this.component._subcomponents.simone =
      new LockScreenConnectionStatesSIMWidget(elements.simone);
    // This would render the line asynchronously.
    this.component._subcomponents.simone.start({
      'simslot': simone
    });
    this.component.writeLabel(elements.simtwoid, 'lockscreen-sim-id',
      { 'n': 2 });
    this.component.writeLabel(elements.simtwoline, 'emergencyCallsOnly');
    this._domLineSIMTwoLocked = document.createElement('div');
    this._domLineSIMTwoLocked.id =
      'lockscreen-connection-states-emergencycallsonly-simtwolocked';
    elements.simtwo.appendChild(this._domLineSIMTwoLocked);
    this.component.writeLabel(this._domLineSIMTwoLocked, message);
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype.render =
  function() {
    var elements = this.component.resources.elements;
    this.component.resetAppearance();
    this.component.writeLabel(elements.simoneline, 'emergencyCallsOnly');
    this.component.writeLabel(elements.simtwoline,
      this.component.resources.emergencyCallsOnly.reason);
  };

  LockScreenConnectionStatesWidgetEmergencyCallsOnly.prototype
  .reverseSIMTwoLocked = function() {
    this.component._subcomponents.simone.stop();
    this._domLineSIMTwoLocked.hidden = true;
    // Dare we make this more annoying? I see why people hate native DOM APIs.
    this._domLineSIMTwoLocked.parentNode.removeChild(this._domLineSIMTwoLocked);
    delete this._domLineSIMTwoLocked;
  };

  exports.LockScreenConnectionStatesWidgetEmergencyCallsOnly =
    LockScreenConnectionStatesWidgetEmergencyCallsOnly;
})(window);

