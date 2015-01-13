/* global SIMSlotManager */
/* global LockScreenBasicComponent, LockScreenConnectionStatesWidgetSetup */
'use strict';

/**
 * There are two classes of States:
 *
 * Network: AirplainMode, RadioOn, NoSIMs, NoNetwork, Searching, Connected
 * [SIM]  : (Setup: would update info when the updating event comes)
 *
 * Network states would take the whole board to update the message, while
 * SIM states would only care it's own line. This is to prevent to manage SIM
 * and network changes at one group of states, which may be too complicated
 * and need too much states.
 *
 * As other components, to split the complicated if...else to multiple states
 * with transferring rules is the most important thing. So no matter how tiny
 * or transient these states may be, if to create a new state could eliminate
 * the depth of conditional statements, it's always worth.
 *
 * For SIMs the constructor would be instantiated as components, and each one
 * would update its message when the event comes. There is no need to create
 * more states than the setup state for SIMs, since all of these updating would
 * be 'fixed point' style updating, which involves no state transferring.
 **/
(function(exports) {
  var LockScreenConnectionStatesWidget = function() {
    LockScreenBasicComponent.apply(this);
    this.properties.emergencyCallMessageMap = {
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
    // null, {simone: SIM one}, {simtwo: SIM two}, {simone, simetwo}
    this.resources.sims = null;
    // @see fetchVoiceStatus
    this.resources.voiceStatus = null;
    this.resources.airplaneMode = false;
    this.resources.telephonyDefaultServiceId = null;
    this.resources.elements = {
      simoneline: 'lockscreen-conn-states-simoneline',
      simtwoline: 'lockscreen-conn-states-simtwoline',
      simeoneid:  'lockscreen-conn-states-simeoneid',
      simetwoid:  'lockscreen-conn-states-simetwoid'
    };
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
   *
   * TODO: methods like this should be cached via SettingsCache.
   */
  LockScreenConnectionStatesWidget.prototype.fetchRadioStatus =
  function() {
    return new Promise((resolve, reject) => {
      var lock = navigator.mozSettings.createLock();
      var request = lock.get('ril.radio.disabled');
      request.onsuccess = () => {
        this.resources.airplaneMode = !!request.result;
        resolve(!!request.result);
      };
      request.onerror = reject;
    });
  };

  /* TODO: methods like this should be cached via SettingsCache. */
  LockScreenConnectionStatesWidget.prototype.fetchTelephonlyServiceId =
  function() {
    return new Promise((resolve, reject) => {
      var lock = navigator.mozSettings.createLock();
      var request = lock.get('ril.telephony.defaultServiceId');
      request.onsuccess = () => {
        this.resources.telephonyDefaultServiceId = request.result;
        resolve(request.result);
      };
      request.onerror = reject;
    });
  };

  /**
   * Resolve with: null, {simone: SIM one}, {simtwo: SIM two}, {simone, simetwo}
   *
   * Note: it doesn't care whether we're on a multi-SIM device. To get the
   * information, call the 'SIMSlotManager.isMultiSIM' function instead.
   */
  LockScreenConnectionStatesWidget.prototype.fetchSIMs =
  function() {
    if (SIMSlotManager.noSIMCardOnDevice()) {
      return null;
    }
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
   *            @see this.properties.emergencyCallsOnlyMessages
   * }
   *
   * This result would be set as 'this.resources.emergencyCallsOnly'
   */
  LockScreenConnectionStatesWidget.prototype.fetchEmergencyCallsOnlyStatus =
  function() {
    this.resources.emergencyCallsOnly = {
      'modeon': false,
      'reason': null
    };
    var results = this.resources.emergencyCallsOnly;
    if (SIMSlotManager.noSIMCardOnDevice()) {
      results.modeon = true;
      results.reason = 'emergencyCallsOnly-noSIM';
      return results;
    }

    // If both SIMs are emergency calls only and
    // not connected.
    if (SIMSlotManager.noSIMCardConnectedToNetwork()) {
      results.modeon = true;
      results.reason = '';
      return results;
    }

    var sims = this.resources.sims;
    var simonevoice = (sims.simone) ? sims.simone.voice : null;
    var simtwovoice = (sims.simtwo) ? sims.simtwo.voice : null;

    if (simonevoice && simonevoice.emergencyCallsOnly &&
        simtwovoice && simtwovoice.emergencyCallsOnly) {
      results.modeon = true;
      results.reason = sims.simone.simCard.cardState;
      return results;
    }
  };

  exports.LockScreenConnectionStatesWidget = LockScreenConnectionStatesWidget;
})(window);

