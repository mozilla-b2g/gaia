/* global Process, LockScreenSettingsCache */
/* global SIMSlotManager */
/* global LockScreenBasicComponent, LockScreenConnectionStatesWidgetSetup */
'use strict';

/**
 * There are two classes of States:
 *
 * Network: AirplainMode, RadioOn, EmergencyCallsOnly
 * [SIM]  : (Setup: would update info when the updating event comes)
 *
 * Network states means it occurs all lines on the connection states element.
 * So when we transfer to such state, it would stop the SIM widgets.
 *
 * For SIMs the constructor would be instantiated as components, and each one
 * would update its message when the event comes. There is no need to create
 * more states than the setup state for SIMs, since all of these updating would
 * be 'fixed point' style updating, which involves no state transferring.
 **/
(function(exports) {
  var LockScreenConnectionStatesWidget = function(view) {
    LockScreenBasicComponent.call(this, view);
    this._subcomponents = {
      //'simone',
      //'simtwo'
    };
    this._settingsCache = new LockScreenSettingsCache();

    // null, {simone: SIM one}, {simtwo: SIM two}, {simone, simtwo}
    this.resources.sims = null;
    // @see fetchVoiceStatus
    this.resources.airplaneMode = false;
    this.resources.elements = {
      view: null,
      simone: 'lockscreen-conn-states-simone',
      simtwo: 'lockscreen-conn-states-simtwo',
      simoneline: 'lockscreen-conn-states-simoneline',
      simtwoline: 'lockscreen-conn-states-simtwoline',
      simoneid:  'lockscreen-conn-states-simoneid',
      simtwoid:  'lockscreen-conn-states-simtwoid'
    };

    this.configs.logger.debug = true;  // turn on this when we're debugging
  };
  LockScreenConnectionStatesWidget.EMERGENCY_CALL_MESSAGE_MAP = {
      'unknown': 'emergencyCallsOnly-unknownSIMState',
      'pinRequired': 'emergencyCallsOnly-pinRequired',
      'pukRequired': 'emergencyCallsOnly-pukRequired',
      'networkLocked': 'emergencyCallsOnly-networkLocked',
      'serviceProviderLocked': 'emergencyCallsOnly-serviceProviderLocked',
      'corporateLocked': 'emergencyCallsOnly-corporateLocked',
      'network1Locked': 'emergencyCallsOnly-network1Locked',
      'network2Locked': 'emergencyCallsOnly-network2Locked',
      'hrpdNetworkLocked' : 'emergencyCallsOnly-hrpdNetworkLocked',
      'ruimCorporateLocked' : 'emergencyCallsOnly-ruimCorporateLocked',
      'ruimServiceProviderLocked':'emergencyCallsOnly-ruimServiceProviderLocked'
    };
  LockScreenConnectionStatesWidget.prototype =
    Object.create(LockScreenBasicComponent.prototype);

  LockScreenConnectionStatesWidget.prototype.setup = function() {
    return (new LockScreenConnectionStatesWidgetSetup(this));
  };

  /**
   * Methods like this is for each state to fetch things sequentially to
   * detect whether they should transfer to other states.
   *
   * 'fetch' means it would update resources while return/resolve the result
   * as fetched status.
   */
  LockScreenConnectionStatesWidget.prototype.fetchRadioStatus =
  function() {
    return this._settingsCache.get('ril.radio.disabled')
    .then((disabled) => {
      this.resources.airplaneMode = disabled;
      return disabled;
    });
  };

  /**
   * Resolve with: null, {simone: SIM one}, {simtwo: SIM two}, {simone, simtwo}
   *
   * Note: it doesn't care whether we're on a multi-SIM device. To get the
   * information, call the 'SIMSlotManager.isMultiSIM' function instead.
   */
  LockScreenConnectionStatesWidget.prototype.fetchSIMs =
  function() {
    var result = SIMSlotManager.getSlots().reduce((acc, currentSlot) => {
      // No card in this slot.
      if (!currentSlot.simCard && null === acc) {
        return acc;
      }
      // One card in this slot.
      // Don't merge these branches: from the past it shows
      // try to merge branches likes this would generate messy code
      // that no one include author could understand.
      if (0 === currentSlot.index) {
        if (null === acc) {
          return { 'simone': currentSlot };
        } else {
          acc.simone = currentSlot;
          return acc;
        }
      } else if (1 === currentSlot.index) {
        if (null === acc) {
          return { 'simtwo': currentSlot };
        } else {
          acc.simtwo = currentSlot;
          return acc;
        }
      }
    }, null);
    this.resources.sims = result;
    return result;
  };

  /**
   * Detect if it's in emergency calls only mode. This is a special mode
   * since it's the only one case that involves two cards but shows only
   * one label (and its label). Other cases involve the cards would show
   * their status individually.
   *
   * And since for this mode the reason depends on different details,
   * so the return result would be:
   *
   * {
   *    modeon: true | false,
   *    reason: the reason of why it's emergency calls only.
   *            @see LockScreenConnectionStatesWidget.EMERGENCY_CALL_MESSAGE_MAP
   * }
   *
   * This result would be set as 'this.resources.emergencyCallsOnly'
   */
  LockScreenConnectionStatesWidget.prototype.fetchEmergencyCallsOnlyStatus =
  function() {
    var sims = this.resources.sims;
    var process = new Process();
    return process.start().next(() => {
      //this.resources.emergencyCallsOnly = {
      var results = {
        'modeon': false,
        'reason': null,
      };
      this.resources.emergencyCallsOnly = results;
      if (!sims) {
        results.modeon = true;
        results.reason = 'emergencyCallsOnly-noSIM';
        this.logger.debug('Emergency call only: no SIMs');
        return results;
      }

      // If both SIMs are emergency calls only and
      // not connected.
      if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
        results.modeon = true;
        results.reason = '';
        this.logger.debug('Emergency call only: no connected SIMs');
        return results;
      }
      var simonevoice = (sims.simone) ? sims.simone.voice : null;
      var simtwovoice = (sims.simtwo) ? sims.simtwo.voice : null;

      if (simonevoice && simonevoice.emergencyCallsOnly &&
          simtwovoice && simtwovoice.emergencyCallsOnly) {
        results.modeon = true;
        var message = LockScreenConnectionStatesWidget
          .EMERGENCY_CALL_MESSAGE_MAP[sims.simone.simCard.cardState];
        results.reason = (message);
        this.logger.debug('Emergency call only: ', message);
        return results;
      }
      this.logger.debug('Not in ordinary emergency calls only mode');
      return results; // Otherwise, it's not in the mode by this check.
    }).next((results) => {
      // Note: this is an advanced check after the 'no connected SIMs' check in
      // the previous function. So even we have the 'no connected SIMs' check
      // result, we still need this to make sure it's or it isn't this special
      // case.
      return this.fetchTelephonyServiceId().then((id) => {
        // A special case: if SIM#2 is primary and it's locked,
        // it should show the emergency calls only label. Although
        // we needn't do that if SIM#1 is primary and it's locked.
        var sims = this.resources.sims;
        if ((true === sims.simtwo.isLocked() && 1 === id) &&
            (!sims.simone.isLocked())) {
          var message = LockScreenConnectionStatesWidget
            .EMERGENCY_CALL_MESSAGE_MAP[sims.simtwo.simCard.cardState];
          results.modeon = true;
          results.reason = {
            'simtwolocked': true,
            'message': message
          };
          this.logger.debug(
            'In emergency calls only mode due to primary SIM#2 locked');
        } else if (!results.modeon){
          this.logger.debug('After all, not in emergency calls only mode');
        }
        // else: checked by the previous function.
        return results;
      });
    }).next((results) => {
      this.resources.emergencyCallsOnly = results;
      return results;
    });
  };

  LockScreenConnectionStatesWidget.prototype.fetchTelephonyServiceId =
  function() {
    return this._settingsCache.get('ril.telephony.defaultServiceId')
      .then((id) => {
        this.resources.telephonyDefaultServiceId = id;
        return id;
      });
  };

  /**
   * Alias it to make it more clear.
   */
  LockScreenConnectionStatesWidget.prototype.writeLabel =
  function(node, l10nId, l10nArgs, text) {
    if (l10nId) {
      navigator.mozL10n.setAttributes(node, l10nId, l10nArgs);
    } else if (text) {
      node.textContent = text;
    }
    node.hidden = false;
  };

  LockScreenConnectionStatesWidget.prototype.eraseLabel =
  function(node) {
    node.removeAttribute('data-l10n-id');
    node.textContent = '';
    node.hidden = true;
  };

  /**
   * Should reset lines before any new state want to write things.
   */
  LockScreenConnectionStatesWidget.prototype.resetAppearance =
  function() {
    [ this.resources.elements.simoneline,
      this.resources.elements.simtwoline,
      this.resources.elements.simoneid,
      this.resources.elements.simtwoid ].forEach((node) => {
        node.textContent = '';
        node.removeAttribute('data-l10n-id');
        // Only when a node is written it should be visible.
        node.hidden = true;
      });
  };

  exports.LockScreenConnectionStatesWidget = LockScreenConnectionStatesWidget;
})(window);

