/* global SIMSlotManager */
/* global LockScreenBasicComponent, LockScreenConnectionStatesWidgetSetup */
'use strict';

/**
 * There are two classes of States:
 *
 * Network: AirplainMode, RadioEnabled, NoSIMs, NoNetwork, Searching, Connected
 * SIM    : (Setup)
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
      primarySIMID: 'lockscreen-conn-states-primary-simid',
      primaryFirstline: 'lockscreen-conn-states-primary-firstline',
      primarySecondline: 'lockscreen-conn-states-primary-secondline',
      secondarySIMID: 'lockscreen-conn-states-secondary-simid',
      secondaryFirstline: 'lockscreen-conn-states-secondary-firstline',
      secondarySecondline: 'lockscreen-conn-states-secondary-secondline'
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
   * This function assume one of the existing SIMs is for the voice network.
   * So if there is no SIMs in resources it would throw error.
   *
   * This doesn't care about SIM states like roaming or operator & carrier,
   * but the whole voice network.
   *
   * Return:
   * {
   *    sim: the SIM provice voice service,
   *    states: notSearching | searching | denied | registered,
   *    noNetwork: true | false --> whether network is not ready,
   *                                reduced from the states
   *    searching: true | false --> whether the network is searching,
   *                                it doesn't depends on 'state',
   *                                which has different meaning from the UX
   *    emergencyCallOnly: true | false
   * }
   */
  LockScreenConnectionStatesWidget.prototype.fetchVoiceStatus =
  function() {
    if (null === this.resources.sims) {
      throw new Error('No available SIMs');
    }
    return this.fetchTelephonlyServiceId().then((id) => {
      var voiceSIM = (0 === id) ?
        this.resources.sims.simone :
        this.resources.sims.simtwo ;
      var voice = voiceSIM.conn.voice;
      var result = {
        'sim': voiceSIM,
        'noNetwork': false,
        'searching': false,
        'emergencyCallsOnly': false
      };
      result.states = voice.states;

      // According to Bug 777057 Comment 18 and 19.
      if (voice.emergencyCallsOnly) {
        result.emergencyCallsOnly = true;
        return result;
      }

      if (voice.state && 'notSearching' !== voice.state) {
        result.noNetwork = true;
        return result;
      }

      if (!voice.connected) {
        result.searching = true;
        return result;
      }
    }).then((result) => {
      this.resource.voiceStatus = result;
      return result;
    });
  };

  exports.LockScreenConnectionStatesWidget = LockScreenConnectionStatesWidget;
})(window);

