/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*
 * Internet Sharing module responsible for saving and restoring the internet
 * sharing state, including Wifi hotspot and USB tethering, based on sim card.
 *
 * The sharing state is linked with sim card id, iccid. When a user changes sim
 * card, this module restore the last state of that sim card.
 *
 * If the there is no sim card or sim card is not ready, this module use the
 * settings of no sim card in which Wifi hotspot will always be disabled.
 */

var InternetSharing = (function() {

  var settings;
  // null or unknown state will change to one of the following state
  var validCardState = [null,
                        'pinRequired',
                        'pukRequired',
                        'networkLocked',
                        'corporateLocked',
                        'serviceProviderLocked',
                        'ready'];

  var observerHooked = false;

  var cardState;

  function addObservers() {
    if (observerHooked) {
      return;
    }
    observerHooked = true;
    // listen changes after value is restored.
    ['usb', 'wifi'].forEach(function(type) {
      settings.addObserver('tethering.' + type + '.enabled',
                          internetSharingSettingsChangeHanlder);
    });
  }

  function checkCardAndInternetSharing() {
    cardState = IccHelper.cardState;
    if (validCardState.indexOf(cardState) > -1) {
      // if it is known cardState, we need to load internet sharing state from
      // settings
      addObservers();
      restoreInternetSharingState(cardState);
    }
  }

  function restoreInternetSharingState(cardState) {
    // the function restores settings based on type, cardId.
    function doRestore(type, cardId, forceDisabled) {
      // build the key for asyncStorage.
      var key = 'tethering.' + type + '.simstate.card-' + cardId;
      asyncStorage.getItem(key, function callback(value) {
        // if forceDisable is true, we need to disable it always.
        var simState = forceDisabled ? false : (value || false);
        // update value for type
        var cset = {};
        cset['tethering.' + type + '.enabled'] = simState;
        settings.createLock().set(cset);
      });
    }
    // the internet sharing is linked with iccid, if cardState is not ready, we
    // just view it as no sim.
    // note if it is under pinRequired or pukRequired, it may turned into ready
    // state after user typed pin or puk.
    if (cardState === 'ready') {
      // once cardState is ready, we need to read iccid
      // if iccInfo.iccid is not ready, we need to listen change of iccinfo
      // change, until iccid is ready
      if (!IccHelper.iccInfo || !IccHelper.iccInfo.iccid) {
        IccHelper.oniccinfochange = function handler() {
          // wait for iccid is filled.
          if (IccHelper.iccInfo && IccHelper.iccInfo.iccid) {
            IccHelper.oniccinfochange = null;
            doRestore('usb', IccHelper.iccInfo.iccid);
            doRestore('wifi', IccHelper.iccInfo.iccid);
          }
        };
      } else {
        // iccInfo is ready, just use it.
        doRestore('usb', IccHelper.iccInfo.iccid);
        doRestore('wifi', IccHelper.iccInfo.iccid);
      }
    } else {
      // card is not ready, just use absent to restore the value.
      doRestore('usb', 'absent');
      // card is not ready, force wifi hotspot disabled.
      doRestore('wifi', 'absent', true);
    }
  }

  function internetSharingSettingsChangeHanlder(evt) {
    if (validCardState.indexOf(cardState) === -1) {
      return;
    }
    // link the iccid with current internet state for future restoring.
    var type = (evt.settingName.indexOf('wifi') > -1) ? 'wifi' : 'usb';
    var cardId = (IccHelper.iccInfo && IccHelper.iccInfo.iccid) || 'absent';
    // wifi hotspot cannot be enabled without sim
    if ('wifi' === type && 'absent' === cardId && true === evt.settingValue) {
      settings.createLock().set({'tethering.wifi.enabled': false});
      return;
    }
    asyncStorage.setItem('tethering.' + type + '.simstate.card-' + cardId,
                         evt.settingValue);
  }

  function _init() {
    settings = window.navigator.mozSettings;
    if (!settings) {
      return;
    }
    if (!IccHelper) {
      return;
    }
    observerHooked = false;
    checkCardAndInternetSharing();
    // listen cardstatechange event for ready, pin, puk, or network unlocking.
    IccHelper.addEventListener('cardstatechange', checkCardAndInternetSharing);
  }
  return {init: _init};
})();

InternetSharing.init();
