/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* globals CustomEvent, MozActivity, Service,
           NfcUtils, NDEF, ScreenManager, BaseModule */

'use strict';

(function(exports) {
  var DEBUG = false;

  /**
   * NfcManager is responsible for NFC support. It controls NFC hardware
   * state, detects NFC tags and triggers appropriate activities, detects NFC
   * peers and takes part in NFC P2P sharing process (with ShrinkingUI),
   * detects NFC Handover requests and passes them to NfcHandoverManager for
   * handling.
   * @class NfcManager
   * @requires Service
   * @requires ScreenManager
   * @requires MozActivity
   * @requires NDEF
   * @requires NfcUtils
   */
  var NfcManager = function() {
  };
  NfcManager.SETTINGS = [
    'nfc.enabled',
    'nfc.debugging.enabled',
    'nfc.status'
  ];

  NfcManager.SUB_MODULES = [
    'NfcHandoverManager'
  ];

  NfcManager.STATES = [
    'isActive'
  ];

  BaseModule.create(NfcManager, {
    name: 'NfcManager',

    /**
     * Possible NFC hardware states
     * @memberof NfcManager.prototype
     * @readonly
     * @enum {string}
     */
    NFC_HW_STATE: {
      DISABLING: 'nfcDisabling',
      OFF: 'nfcOff',
      ENABLING: 'nfcEnabling',
      // active states below
      ON: 'nfcOn',
      /**
       * Active state in which NFC HW is polling for NFC tags/peers
       * @todo merge with |ON|
       */
      ENABLE_DISCOVERY: 'nfcEnableDiscovery',
      /**
       * Active state with low power consumption, NFC HW is not actively
       * polling for NFC tags/peers. Card emulation is active.
       */
      DISABLE_DISCOVERY: 'nfcDisableDiscovery'
    },

    /**
     * Current NFC Hardware state
     * @memberof NfcManager.prototype
     * @type {String}
     */
    _hwState: null,

    /**
     * Initializes NfcManager, sets up listeners and handlers
     * @memberof NfcManager.prototype
     */
    _start: function nm_start() {
      this._debug('Starting NFC Manager');
      this._hwState = this.NFC_HW_STATE.OFF;

      window.navigator.mozSetMessageHandler('nfc-manager-tech-discovered',
        (msg) => this._handleTechDiscovered(msg));
      window.navigator.mozSetMessageHandler('nfc-manager-tech-lost',
        (msg) => this._handleTechLost(msg));

      window.addEventListener('screenchange', this);
      window.addEventListener('lockscreen-appopened', this);
      window.addEventListener('lockscreen-appclosed', this);

      this._onDebugChanged = (enabled) => { DEBUG = enabled; };

      // reseting nfc.status to default state, as the device could've
      // been restarted when HW change was in progress
      this.writeSetting({ 'nfc.status':'disabled' });
    },

    /**
     * Removes all listeners and handlers
     * @memberof NfcManager.prototype
     */
    _stop: function nm_stop() {
      this._debug('Stopping NFC Manager');

      window.navigator.mozSetMessageHandler('nfc-manager-tech-discovered',
                                            null);
      window.navigator.mozSetMessageHandler('nfc-manager-tech-lost', null);

      window.removeEventListener('screenchange', this);
      window.removeEventListener('activeappchanged', this);
      window.removeEventListener('lockscreen-appopened', this);
      window.removeEventListener('lockscreen-appclosed', this);
    },

    '_observe_nfc.enabled': function(enabled) {
      this._nfcSettingsChanged(enabled);
      DEBUG = enabled;
    },

    '_observe_nfc.debugging.enabled': function(enabled) {
      this._onDebugChanged(enabled);
    },

    /**
     * Returns if NFC is active or not, depending on the hardware state
     * @memberof NfcManager.prototype
     * returns {boolean} isActive
     */
    isActive: function nm_isActive() {
      return this._hwState === this.NFC_HW_STATE.ON ||
             this._hwState === this.NFC_HW_STATE.ENABLE_DISCOVERY ||
             this._hwState === this.NFC_HW_STATE.DISABLE_DISCOVERY;
    },

    /**
     * Returns true if NFC HW state change is in progress.
     * @memberof NfcManager.prototype
     * returns {boolean} isActive
     */
    isInTransition: function nm_isInTransition() {
      return this._hwState === this.NFC_HW_STATE.ENABLING ||
             this._hwState === this.NFC_HW_STATE.DISABLING;
    },

    /**
     * Handler for nfc-manager-tech-discovered messages which originate from
     * gecko. Basing on the first NDEF record tnf and type this method can use
     * NfcHandoverManager to handle handover scenarios. Basing on the techList
     * array it can either trigger P2P sharing scenario or create MozActivities
     * for other apps to act upon.
     * @memberof NfcManager.prototype
     * @param {Object} msg gecko originated message
     * @param {Array} msg.records NDEF records
     * @param {string} msg.type set to 'techDiscovered'
     */
    _handleTechDiscovered: function nm_handleTechDiscovered(msg) {
      this._debug('Technology Discovered: ' + JSON.stringify(msg));
      msg = msg || {};
      msg.records = Array.isArray(msg.records) ? msg.records : [];

      window.dispatchEvent(new CustomEvent('nfc-tech-discovered'));
      window.navigator.vibrate([25, 50, 125]);

      if (this.nfcHandoverManager.tryHandover(msg.records, msg.peer)) {
        return;
      }

      if (msg.records.length) {
        this._fireNDEFDiscovered(msg.records);
      } else if (msg.peer) {
        this.checkP2PRegistration();
      } else {
        this._logVisibly('Got tag without NDEF records, ignoring.');
      }
    },

    /**
     * Handler for nfc-manager-tech-lost messages
     * @memberof NfcManager.prototype
     * @param {Object} msg - tech lost message
     */
    _handleTechLost: function nm_handleTechLost(msg) {
      this._debug('Technology Lost: ' + JSON.stringify(msg));

      window.navigator.vibrate([125, 50, 25]);
      window.dispatchEvent(new CustomEvent('nfc-tech-lost'));

      // Clean up P2P UI events
      window.removeEventListener('shrinking-sent', this);
      window.dispatchEvent(new CustomEvent('shrinking-stop'));
    },

    /**
     * Default event handler. Always listens for lockscreen-appopened,
     * lockscreen-appclosed, screenchange. During P2P sharing flow it
     * listens for shrinking-sent event dispatched from ShrinkingUI
     * @memberof NfcManager.prototype
     * @param {Event} event
     */
    handleEvent: function nm_handleEvent(evt) {
      var state;
      switch (evt.type) {
        case 'lockscreen-appopened': // Fall through
        case 'lockscreen-appclosed':
        case 'screenchange':
          if (!this.isActive()) {
            return;
          }
          state = (ScreenManager.screenEnabled && !Service.locked) ?
                    this.NFC_HW_STATE.ENABLE_DISCOVERY :
                    this.NFC_HW_STATE.DISABLE_DISCOVERY;
          if (state === this._hwState) {
            return;
          }
          this._changeHardwareState(state);
          break;
        case 'shrinking-sent':
          window.removeEventListener('shrinking-sent', this);
          // Notify lower layers that User has acknowledged to send NDEF msg
          this.dispatchP2PUserResponse();

          // Stop the P2P UI
          window.dispatchEvent(new CustomEvent('shrinking-stop'));
          break;
      }
    },

    /**
     * Basing on the new value of NFC Setting computes new NFC HW state
     * and uses {@link NfcManager#_changeHardwareState} to set it
     * @memberof NfcManager.prototype
     * @param {boolean} enabled - NFC setting value
     */
    _nfcSettingsChanged: function nm_nfcSettingsChanged(enabled) {
      this._debug('_nfcSettingsChanged, nfc.enabled: ' + enabled);

      if (this.isActive() === enabled || this.isInTransition()) {
        this._debug('_nfcSettingsChanged ignoring settings change');
        return;
      }

      var state = !enabled ? this.NFC_HW_STATE.DISABLING :
        (Service.locked ? this.NFC_HW_STATE.DISABLE_DISCOVERY :
                          this.NFC_HW_STATE.ENABLING);
      this._changeHardwareState(state);
    },

    /**
     * Triggers DOM request to change NFC Hardware state
     * @memberof NfcManager.prototype
     * @param {string} state - new hardware state, one of
     * {@link NfcManager#NFC_HW_STATE}
     */
    _changeHardwareState: function nm_changeHardwareState(state) {
      this._debug('_changeHardwareState - state : ' + state);
      this._hwState = state;
      var nfcdom = window.navigator.mozNfc;
      if (!nfcdom) {
        return;
      }

      var promise;
      switch (state) {
        case this.NFC_HW_STATE.DISABLING:
          promise = nfcdom.powerOff();
          this.writeSetting({ 'nfc.status':'disabling' });
          break;
        case this.NFC_HW_STATE.DISABLE_DISCOVERY:
          promise = nfcdom.stopPoll();
          break;
        case this.NFC_HW_STATE.ENABLING:
          promise = nfcdom.startPoll();
          this.writeSetting({ 'nfc.status':'enabling' });
          break;
        case this.NFC_HW_STATE.ENABLE_DISCOVERY:
          promise = nfcdom.startPoll();
          break;
      }


      promise.then(() => {
        this._debug('_changeHardwareState ' + state + ' success');
        // checking if NFC HW was in transition states and move to proper state
        if (this.isInTransition()) {
          this._handleNFCOnOff(this._hwState === this.NFC_HW_STATE.ENABLING);
        }
      }).catch(e => {
        this._logVisibly('_changeHardwareState ' + state + ' error ' + e);
        // rollback to previous state in case of transition states
        if (this.isInTransition()) {
          this._handleNFCOnOff(this._hwState !== this.NFC_HW_STATE.ENABLING);
        }
      });
    },

    _handleNFCOnOff: function nm_handleNFCOnOff(isOn) {
      this._debug('_handleNFCOnOf is on:' + isOn);

      this._hwState = (isOn) ? this.NFC_HW_STATE.ON : this.NFC_HW_STATE.OFF;
      this.writeSetting({'nfc.status': (isOn) ? 'enabled' : 'disabled'});

      // event dispatching to handle statusbar change
      // TODO remove in Bug 1103874
      var event = new CustomEvent('nfc-state-changed', {
        detail: {
          active: isOn
        }
      });
      window.dispatchEvent(event);
    },

    /**
     * Step 1 of P2P sharing. Called as a result of discovering P2P peer.
     * Triggers P2P sharing process handled with ShrinkingUI which listens for
     * check-p2p-registration-for-active-app event.
     * @memberof NfcManager.prototype
     */
    _triggerP2PUI: function nm_triggerP2PUI() {
      var evt = new CustomEvent('check-p2p-registration-for-active-app', {
        bubbles: true, cancelable: false,
        detail: this
      });
      window.dispatchEvent(evt);
    },

    /**
     * Step 2 of P2P sharing. Called by ShrinkingUI. Sends a DOM request to
     * check if app with manifestURL has registered onpeerready handler.
     * Due to security reasons DOM request will be always successful and result
     * property of the request will be true if the event handler was registered.
     * If the result is true, shrinking-start event is dispatched to
     * ShrinkingUI, which will trigger UI change asking the user to confirm
     * sharing.
     * @memberof NfcManager.prototype
     * @param {string} manifestURL - manifest url of app to check
     */
    checkP2PRegistration: function nm_checkP2PRegistration() {
      var nfcdom = window.navigator.mozNfc;
      if (!nfcdom) {
        return;
      }
      var activeApp = window.Service.currentApp;
      var manifestURL = activeApp.getTopMostWindow().manifestURL ||
        window.Service.manifestURL;

      var promise = nfcdom.checkP2PRegistration(manifestURL);
      promise.then(result => {
        if (result) {
          if (activeApp.isTransitioning() || activeApp.isSheetTransitioning()) {
            return;
          }
          // Top visible application's manifest Url is registered;
          // Start Shrink / P2P UI and wait for user to accept P2P event
          window.dispatchEvent(new CustomEvent('shrinking-start'));

          // Setup listener for user response on P2P UI now
          window.addEventListener('shrinking-sent', this);
        } else {
          // Clean up P2P UI events
          this._logVisibly('CheckP2PRegistration failed');
          window.removeEventListener('shrinking-sent', this);
          window.dispatchEvent(new CustomEvent('shrinking-stop'));
        }
      });
    },

    /**
     * Step 3 of P2P sharing. Called by ShrinkingUI when user confirms
     * sharing. Sends DOM request to Gecko which will fire onpeerready handler
     * of the web app willing to share something.
     * @memberof NfcManager.prototype
     * @param {string} manifestURL - manifest url of the sharing app
     */
    dispatchP2PUserResponse: function nm_dispatchP2PUserResponse() {
      var nfcdom = window.navigator.mozNfc;
      if (!nfcdom) {
        return;
      }
      var activeApp = window.Service.currentApp;
      var manifestURL = activeApp.getTopMostWindow().manifestURL ||
        window.Service.manifestURL;
      nfcdom.notifyUserAcceptedP2P(manifestURL);
    },

    /**
     * Fires NDEF related activities to launch other apps to perform
     * further actions with NDEF Message contents. If the first NDEF record
     * contains a well know type additional parsing will be done in helper
     * methods. In general the name of activity will be 'nfc-ndef-discovered',
     * in some case other names may be used (e.g. 'dial' in case of tel uri)
     * @memberof NfcManager.prototype
     * @param {Array} records - NDEF Message
     */
    _fireNDEFDiscovered: function nm_fireNDEFDiscovered(records) {
      this._debug('_fireNDEFDiscovered: ' + JSON.stringify(records));
      var smartPoster = this._getSmartPoster(records);
      var record = smartPoster || records[0] || { tnf: NDEF.TNF_EMPTY };

      var data = NDEF.payload.decode(record.tnf, record.type, record.payload);
      var options = this._createNDEFActivityOptions(data);

      if (data !== null) {
        options.data.records = records;
      }

      this._debug('_fireNDEFDiscovered activity options: ', options);
      var activity = new MozActivity(options);
      activity.onerror = () => {
        this._logVisibly('Firing nfc-ndef-discovered activity failed');
      };
    },

    /**
     * Retrieves Smart Poster record from NDEF records array following
     * the rule outlined in NFCForum-SmartPoster_RTD_1.0, 3.4:
     * "If an NDEF message contains one or multiple URI [URI] records
     * in addition to the Smart Poster record at the top level (i.e.,
     * not nested), the Smart Poster record overrides them. The NDEF
     * application MUST use only the Smart Poster record."
     * @memberof NfcManager.prototype
     * @param {Array} records - array of NDEF records
     * @returns {Object} record - SmartPostr record or null
     */
    _getSmartPoster: function nm_getSmartPoster(records) {
      var nfcUtils = new NfcUtils();
      if (!Array.isArray(records) || !records.length) {
        return null;
      }

      var smartPosters = records.filter(function isSmartPoster(r) {
        return nfcUtils.equalArrays(r.type, NDEF.RTD_SMART_POSTER);
      });

      if (smartPosters.length && records[0].tnf === NDEF.TNF_WELL_KNOWN &&
          (nfcUtils.equalArrays(records[0].type, NDEF.RTD_URI) ||
           nfcUtils.equalArrays(records[0].type, NDEF.RTD_SMART_POSTER))) {
        return smartPosters[0];
      }
      return null;
    },

    /**
     * Basing on decoded payload from first record of NDEF message prepares
     * activity options object which will be used to launch MozActivity
     * @memberof NfcManager.prototype
     * @param {Object} payload - decoded payload of first record from NDEF msg
     * @returns {Object} options - object used to construct MozActivity
     */
    _createNDEFActivityOptions: function nm_createNDEFActivityOptions(payload) {
      var options = { name: 'nfc-ndef-discovered', data: {}};
      if (payload === null) {
        return options;
      }

      if (payload.type === 'uri') {
        if (payload.uri.indexOf('tel:') === 0) {
          // dial a number
          options.name = 'dial';
          options.data.type = 'webtelephony/number';
          options.data.number = payload.uri.substring(4);
          options.data.uri = payload.uri;
        } else if (payload.uri.indexOf('mailto:') === 0) {
          // create new mail
          options.name = 'new';
          options.data.type = 'mail';
          options.data.url = payload.uri;
        } else if (payload.uri.indexOf('http://') === 0 ||
                   payload.uri.indexOf('https://') === 0 ||
                   payload.uri.indexOf('data:text/html') === 0) {
          // launch browser
          options.name = 'view';
          options.data.type = 'url';
          options.data.url = payload.uri;
        } else {
          options.data = payload;
        }
      } else if (payload.type === 'smartposter' &&
        (payload.uri.indexOf('http://') === 0 ||
         payload.uri.indexOf('https://') === 0)) {
        // smartposter adaptation for browser handling
        options.name = 'view';
        options.data = payload;
        options.data.type = 'url';
        options.data.url = payload.uri;
        delete options.data.uri;
      } else if (payload.type === 'text/vcard') {
        // contact import
        options.name = 'import';
        options.data = payload;
      } else {
        options.data = payload;
      }

      if (options.name !== 'nfc-ndef-discovered') {
        options.data.src = 'nfc';
      }

      return options;
    },

    /**
     * Debug function, prints log to logcat only if DEBUG flag is true
     * @memberof NfcManager.prototype
     * @param {string} msg - debug message
     * @param {Object} optObject - object to log
     */
    _debug: function nm_debug(msg, optObject) {
      if (DEBUG) {
        this._logVisibly(msg,optObject);
      }
    },

    /**
     * Logs message in logcat
     * @memberof NfcManager.prototype
     * @param {string} msg - message
     * @param {Object} optObject - object log (will be JSON.stringify)
     */
    _logVisibly: function nm_logVisibly(msg, optObject) {
      var output = '[NfcManager]: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      console.log(output);
    }
  });
}());
