'use strict';
/* global asyncStorage */
/* global IccHelper */
/* global ModalDialog */
/* global AirplaneMode */

(function(exports) {

  // Local reference to mozSettings
  var settings;

  // null or unknown state will change to one of the following state
  var validCardState = [null,
                        'pinRequired',
                        'pukRequired',
                        'networkLocked',
                        'corporateLocked',
                        'serviceProviderLocked',
                        'network1Locked',
                        'network2Locked',
                        'hrpdNetworkLocked',
                        'ruimCorporateLocked',
                        'ruimServiceProviderLocked',
                        'ready'];

  /**
   * Internet Sharing module responsible for saving and restoring the internet
   * sharing state, including Wifi hotspot and USB tethering, based on sim card.
   *
   * The sharing state is linked with sim card id, iccid. When a user changes
   * sim card, this module restore the last state of that sim card.
   *
   * If the there is no sim card or sim card is not ready, this module use the
   * settings of no sim card in which Wifi hotspot will always be disabled.
   * @requires asyncStorage
   * @requires IccHelper
   * @requires ModalDialog
   * @class InternetSharing
   */
  function InternetSharing() {}

  InternetSharing.prototype = {

    /**
     * Whether or not we have added settings observers.
     * @type {Boolean}
     * @memberof InternetSharing.prototype
     */
    _observerHooked: false,

    /**
     * Current sim card state.
     * @type {String}
     * @memberof InternetSharing.prototype
     */
    _cardState: null,

    /**
     * Adds observers for when the usb or wifi setting is changed.
     * @memberof InternetSharing.prototype
     */
    addObservers: function() {
      if (this._observerHooked) {
        return;
      }
      this._observerHooked = true;
      // listen changes after value is restored.
      ['usb', 'wifi'].forEach(function(type) {
        settings.addObserver('tethering.' + type + '.enabled',
          this.internetSharingSettingsChangeHanlder.bind(this));
      }, this);
    },

    /**
     * If it is known cardState, we need to load internet sharing state from
     * settings.
     * @memberof InternetSharing.prototype
     */
    checkCardAndInternetSharing: function() {
      this._cardState = IccHelper.cardState;
      if (validCardState.indexOf(this._cardState) > -1) {
        this.addObservers();
        this.restoreInternetSharingState();
      }
    },

    /**
     * Restores the state of internet sharing.
     * Grabs the state from asyncStorage and saves it to mozSettings.
     * @memberof InternetSharing.prototype
     */
    restoreInternetSharingState: function() {
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
      // the internet sharing is linked with iccid, if cardState is not ready,
      // we just view it as no sim.
      // note if it is under pinRequired or pukRequired, it may turned into
      // ready state after user typed pin or puk.
      if (this._cardState === 'ready') {
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
    },

    /**
     * Called whenever there is a setting change in usb or wifi tethering.
     * Validates that we can turn internet sharing on, and saves state to
     * asyncStorage.
     * @memberof InternetSharing.prototype
     */
    internetSharingSettingsChangeHanlder: function(evt) {
      if (validCardState.indexOf(this._cardState) === -1) {
        return;
      }
      // link the iccid with current internet state for future restoring.
      var type = (evt.settingName.indexOf('wifi') > -1) ? 'wifi' : 'usb';
      var cardId = (IccHelper.iccInfo && IccHelper.iccInfo.iccid) || 'absent';
      var conns = window.navigator.mozMobileConnections;

      if (!conns) {
        return;
      }

      var settingKey = 'tethering.' + type + '.enabled';
      var cset = {};
      cset[settingKey] = false;
      var title;
      var buttonText;
      var message;

      var dataConnected;
      // In DualSim only one of them will have data active
      for (var i = 0; i < conns.length && !dataConnected; i++) {
        dataConnected = conns[i].data.connected;
      }

      this.getDUNConnection().then(function(DUNConnection) {
        if (type == 'wifi') {
          if (AirplaneMode.enabled && true === evt.settingValue) {
            title = 'apmActivated';
            buttonText = 'ok';
            message ='noHotspotWhenAPMisOnWifiHotspot';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          } else if ('absent' === cardId && true === evt.settingValue) {
            title = 'noSimCard';
            buttonText = 'ok';
            message = 'noSIMCardInHotspot2';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          } else if (!DUNConnection && !dataConnected &&
            true === evt.settingValue) {
            title = 'noConnectivityHead';
            buttonText = 'ok';
            message = 'noConnectivityMessageWifiHotspot';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          }
        } else {
          if (AirplaneMode.enabled && true === evt.settingValue) {
            title = 'apmActivated';
            buttonText = 'ok';
            message ='noHotspotWhenAPMisOnUsbHotspot';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          } else if ('absent' === cardId && true === evt.settingValue) {
            title = 'noSimCard';
            buttonText = 'ok';
            message = 'noSIMCardInHotspot2';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          } else if (!DUNConnection && !dataConnected &&
            true === evt.settingValue) {
            title = 'noConnectivityHead';
            buttonText = 'ok';
            message = 'noConnectivityMessageUsbHotspot';

            ModalDialog.alert(title, message, { title: buttonText });
            settings.createLock().set(cset);
          }
        }
        asyncStorage.setItem('tethering.' + type + '.simstate.card-' + cardId,
          evt.settingValue);
      });
    },

    getDUNConnection: function() {
      var lock = settings.createLock();
      var request = lock.get('ro.tethering.dun_required');
      var DUNConnection;
      return new Promise(function(resolve, reject) {
        request.onsuccess = function() {
          DUNConnection = request.result['ro.tethering.dun_required'];
          if (typeof(DUNConnection) === 'undefined') {
            DUNConnection = false;
          }
          resolve(DUNConnection);
        };

        request.onerror = function() {
          resolve(false);
        };
      });
    },

    /**
     * Starts the InternetSharing class.
     * @memberof InternetSharing.prototype
     */
    start: function() {
      settings = window.navigator.mozSettings;
      if (!IccHelper) {
        return;
      }
      this._observerHooked = false;
      this.checkCardAndInternetSharing();
      // listen cardstatechange event for ready, pin, puk, or network unlocking.
      IccHelper.addEventListener('cardstatechange',
        this.checkCardAndInternetSharing.bind(this));
    }
  };

  exports.InternetSharing = InternetSharing;

}(window));
