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
           NfcUtils, NDEF, ScreenManager, BaseModule, NfcIcon,
           LazyLoader */

'use strict';

(function(exports) {

  const NFC_HW_EVENTS =
    ['enable', 'disable', 'enable-polling', 'disable-polling',
     'hw-change-success', 'hw-change-failure'];

  const NFC_HW_STATE_TABLE = {
    'disabling': [null, null, null, null, 'disabled', 'enabled'],
    'disabled': ['enabling', null, null, null, null, null],
    'enabling': [null, null, null, null, 'enabled', 'disabled'],
    'enabled': [null, 'disabling', 'polling-on', 'polling-off', null, null],
    // enabled state in which NFC HW is polling for NFC tags/peers
    'polling-on': [null, 'disabling', null, 'polling-off', null, null],
    // enabled state with low power consumption, NFC HW is not actively
    // polling for NFC tags/peers. Card emulation is active.
    'polling-off': [null, 'disabling', 'polling-on', null, null, null]
  };

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
    'nfc.debugging.enabled'
  ];

  NfcManager.SUB_MODULES = [
    'NfcHandoverManager'
  ];

  NfcManager.STATES = [
    'isActive'
  ];

  NfcManager.EVENTS = [
    'screenchange',
    'lockscreen-appopened',
    'lockscreen-appclosed'
  ];

  BaseModule.create(NfcManager, {
    name: 'NfcManager',

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
      this.debug('Starting NFC Manager');
      this._hwState = 'disabled';
      LazyLoader.load(['js/nfc_icon.js']).then(function() {
        this.icon = new NfcIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });

      window.navigator.mozSetMessageHandler('nfc-manager-tech-discovered',
        (msg) => this._handleTechDiscovered(msg));
      window.navigator.mozSetMessageHandler('nfc-manager-tech-lost',
        (msg) => this._handleTechLost(msg));

      // reseting nfc.status to default state, as the device could've
      // been restarted when HW change was in progress
      this.writeSetting({ 'nfc.status':'disabled' });
    },

    /**
     * Removes all listeners and handlers
     * @memberof NfcManager.prototype
     */
    _stop: function nm_stop() {
      this.debug('Stopping NFC Manager');

      window.navigator.mozSetMessageHandler('nfc-manager-tech-discovered',
                                            null);
      window.navigator.mozSetMessageHandler('nfc-manager-tech-lost', null);
    },

    '_observe_nfc.enabled': function(enabled) {
      this._doNfcStateTransition(enabled ? 'enable' : 'disable');
    },

    '_observe_nfc.debugging.enabled': function(enabled) {
      this.DEBUG = enabled;
    },

    _handle_screenchange: function(evt) {
      var nfcEvt = ScreenManager.screenEnabled && !Service.locked ?
                    'enable-polling' : 'disable-polling';
      this._doNfcStateTransition(nfcEvt);
    },

    '_handle_lockscreen-appopened': function(evt) {
      this._doNfcStateTransition('disable-polling');
    },

    '_handle_lockscreen-appclosed': function(evt) {
      this._doNfcStateTransition('enable-polling');
    },

    /**
     * Returns if NFC is active or not, depending on the hardware state
     * @memberof NfcManager.prototype
     * returns {boolean} isActive
     */
    isActive: function nm_isActive() {
      return this._hwState === 'enabled' || this._hwState === 'polling-on' ||
             this._hwState === 'polling-off';
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
      this.debug('Technology Discovered: ' + JSON.stringify(msg));
      msg = msg || {};
      msg.records = Array.isArray(msg.records) ? msg.records : [];

      this.publish('nfc-tech-discovered', this, /* without prefix */ true);
      window.navigator.vibrate([25, 50, 125]);

      if (this.nfcHandoverManager.tryHandover(msg.records, msg.peer)) {
        return;
      }

      if (msg.records.length) {
        this._fireNDEFDiscovered(msg.records);
      } else if (msg.peer) {
        this._checkP2PRegistration();
      } else {
        this.debug('Got tag without NDEF records, ignoring.');
      }
    },

    /**
     * Handler for nfc-manager-tech-lost messages
     * @memberof NfcManager.prototype
     * @param {Object} msg - tech lost message
     */
    _handleTechLost: function nm_handleTechLost(msg) {
      this.debug('Technology Lost: ' + JSON.stringify(msg));

      window.navigator.vibrate([125, 50, 25]);
      window.dispatchEvent(new CustomEvent('nfc-tech-lost'));

      // Clean up P2P UI events
      this._cleanP2PUI();
    },

    /**
     * Performs NFC state transition. Checks in NFC HW State Table
     * if NFC HW Event (argument) triggers a transition from current HW state
     * to a different one. If transition exists, _hwState is changed to new
     * state and state entry function is called.
     * @memberof NfcManager.prototype
     * @param {string} evt - NFC HW Event
     */
    _doNfcStateTransition: function(evt) {
      var evtIdx = NFC_HW_EVENTS.indexOf(evt);
      var state = NFC_HW_STATE_TABLE[this._hwState][evtIdx];
      if (!state) {
        this.debug('no transition from ' + this._hwState + '[' + evt + ']');
        return;
      }

      this.debug('state: ' + this._hwState + '[' + evt + ']' + ' -> ' + state);
      this._hwState = state;
      this._processNfcStateChange();
    },

    /**
     * State entry function. Called after transitioning to new NFC HW state.
     * Depending on _hwState it can trigger a new HW change request,
     * change 'nfc.status' setting or update NFC icon.
     * @memberof NfcManager.prototype
     */
    _processNfcStateChange: function() {
      var nfc = window.navigator.mozNfc;
      var promise;

      switch (this._hwState) {
        case 'disabling':
          this.writeSetting({ 'nfc.status': this._hwState });
          promise = nfc.powerOff();
          break;
        case 'disabled':
          this.writeSetting({ 'nfc.status': this._hwState });
          this.icon && this.icon.update();
          break;
        case 'enabling':
          this.writeSetting({ 'nfc.status': this._hwState });
          promise = nfc.startPoll();
          break;
        case 'enabled':
          this.writeSetting({ 'nfc.status': this._hwState });
          this.icon && this.icon.update();
          break;
        case 'polling-on':
          promise = nfc.startPoll();
          break;
        case 'polling-off':
          promise = nfc.stopPoll();
          break;
      }

      if (promise) {
        promise.then(() => this._doNfcStateTransition('hw-change-success'))
        .catch(() => this._doNfcStateTransition('hw-change-failure'));
      }
    },

    /**
     * Step 1 of system app fallback P2P sharing.
     * Queries Gecko (via NFC dom) if currently visible app has registered
     * onpeerready handler. If the result is true, shrinking-start event is
     * dispatched to ShrinkingUI, which will trigger UI change asking the
     * user to confirm sharing.
     * @memberof NfcManager.prototype
     */
    _checkP2PRegistration: function nm_checkP2PRegistration() {
      var nfc = window.navigator.mozNfc;
      var activeApp = window.Service.currentApp;
      var manifestURL = activeApp.getTopMostWindow().manifestURL ||
        window.Service.manifestURL;

      // Do not allow shrinking if we are on the private browser landing page.
      if (activeApp.isPrivateBrowser() &&
        activeApp.config.url.startsWith('app://')) {
        return;
      }

      nfc.checkP2PRegistration(manifestURL).then(result => {
        if (result) {
          if (activeApp.isTransitioning() || activeApp.isSheetTransitioning()) {
            return;
          }

          this._initP2PUI();
        } else {
          this.debug('CheckP2PRegistration failed');
          this._cleanP2PUI();
        }
      });
    },

    /**
     * P2P UI clean up helper, notifies ShrinkingUI to stop shrinking animation
     * and removes 'shrinking-sent' listener.
     * @memberof NfcManager.prototype
     */
    _cleanP2PUI: function() {
      window.removeEventListener('shrinking-sent', this._handleShrinkingSent);
      this.publish('shrinking-stop', this, /* without prefix */ true);
    },

    /**
     * Notifies ShrinkingUI to start shrinking animation and starts listening
     * for 'shrinking-sent' event.
     * @memberof NfcManager.prototype
     */
    _initP2PUI: function() {
      this.publish('shrinking-start', this, /* without prefix */ true);

      this._handleShrinkingSent = () => {
        this._cleanP2PUI();
        this._dispatchP2PUserResponse();
      };

      window.addEventListener('shrinking-sent', this._handleShrinkingSent);
    },

    /**
     * Step 2 of system app fallback P2P sharing.
     * Notifies Gecko to fire onpeerready handler of the currently visible app.
     * @memberof NfcManager.prototype
     */
    _dispatchP2PUserResponse: function nm_dispatchP2PUserResponse() {
      var nfc = window.navigator.mozNfc;
      var activeApp = window.Service.currentApp;
      var manifestURL = activeApp.getTopMostWindow().manifestURL ||
        window.Service.manifestURL;

      nfc.notifyUserAcceptedP2P(manifestURL);
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
      this.debug('_fireNDEFDiscovered: ' + JSON.stringify(records));
      var smartPoster = this._getSmartPoster(records);
      var record = smartPoster || records[0] || { tnf: NDEF.TNF_EMPTY };

      var data = NDEF.payload.decode(record.tnf, record.type, record.payload);
      var options = this._createNDEFActivityOptions(data);

      if (data !== null) {
        options.data.records = records;
      }

      this.debug('_fireNDEFDiscovered activity: ', JSON.stringify(options));
      var activity = new MozActivity(options);
      activity.onerror = () => {
        this.debug('Firing nfc-ndef-discovered activity failed');
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
    }
  });
}());
