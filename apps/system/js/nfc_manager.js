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

/* globals dump, CustomEvent, MozActivity, System,
   NfcHandoverManager, NfcUtils, NDEF, ScreenManager */
'use strict';

var NfcManager = {
  DEBUG: false,

  NFC_HW_STATE_OFF: 0,
  NFC_HW_STATE_ON: 1,
  NFC_HW_STATE_ENABLE_DISCOVERY: 2,
  NFC_HW_STATE_DISABLE_DISCOVERY: 3,

  hwState: 0,

  // Assign priority of tech handling. Smaller number means higher priority.
  // This list will expand with supported technologies.
  TechPriority: {
    'P2P': 1,
    'NDEF': 2,
    'NDEF_WRITEABLE': 3,
    'NDEF_FORMATABLE': 4,
    'Unsupported': 20
  },

  _debug: function nm_debug(msg, optObject) {
    if (this.DEBUG) {
      var output = '[DEBUG] SYSTEM NFC: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      dump(output);
    }
  },

  init: function nm_init() {
    this._debug('Initializing NFC Message');

    window.navigator.mozSetMessageHandler(
      'nfc-manager-tech-discovered',
      this.handleTechnologyDiscovered.bind(this));
    window.navigator.mozSetMessageHandler(
      'nfc-manager-tech-lost',
      this.handleTechLost.bind(this));
    window.addEventListener('screenchange', this);
    window.addEventListener('lockscreen-appopened', this);
    window.addEventListener('lockscreen-appclosed', this);
    var self = this;
    window.SettingsListener.observe('nfc.enabled', false, function(enabled) {
      var state = enabled ?
                    (System.locked ?
                       self.NFC_HW_STATE_DISABLE_DISCOVERY :
                       self.NFC_HW_STATE_ON) :
                    self.NFC_HW_STATE_OFF;
      self.changeHardwareState(state);
    });
  },

  isScreenUnlockAndEnabled: function nm_isScreenUnlockAndEnabled() {
    // Policy:
    if (ScreenManager.screenEnabled && !System.locked) {
      return true;
    } else {
      return false;
    }
  },

  changeHardwareState: function nm_changeHardwareState(state) {
    this._debug('changeHardwareState - state : ' + state);
    this.hwState = state;
    var nfcdom = window.navigator.mozNfc;
    if (!nfcdom) {
      return;
    }

    var req;
    switch (state) {
      case this.NFC_HW_STATE_OFF:
        req = nfcdom.powerOff();
        break;
      case this.NFC_HW_STATE_DISABLE_DISCOVERY:
        req = nfcdom.stopPoll();
        break;
      case this.NFC_HW_STATE_ON:
      case this.NFC_HW_STATE_ENABLE_DISCOVERY:
        req = nfcdom.startPoll();
        break;
    }

    // update statusbar status via custom event
    var event = new CustomEvent('nfc-state-changed', {
      detail: {
        active: (state > 0) ? true : false
      }
    });
    window.dispatchEvent(event);

    var self = this;
    req.onsuccess = function() {
      self._debug('changeHardwareState ' + state + ' success');
    };
    req.onerror = function() {
      self._debug('changeHardwareState ' + state + ' error ' + req.error.name);
    };
  },

  handleEvent: function nm_handleEvent(evt) {
    var state;
    switch (evt.type) {
      case 'lockscreen-appopened': // Fall through
      case 'lockscreen-appclosed':
      case 'screenchange':
        if (this.hwState == this.NFC_HW_STATE_OFF) {
          return;
        }
        state = this.isScreenUnlockAndEnabled() ?
                this.NFC_HW_STATE_ENABLE_DISCOVERY :
                this.NFC_HW_STATE_DISABLE_DISCOVERY;
        if (state == this.hwState) {
          return;
        }
        this.changeHardwareState(state);
        break;
      case 'shrinking-sent':
        window.removeEventListener('shrinking-sent', this);
        // Notify lower layers that User has acknowledged to send nfc (NDEF) msg
        window.dispatchEvent(new CustomEvent(
          'dispatch-p2p-user-response-on-active-app', {detail: this}));
        // Stop the P2P UI
        window.dispatchEvent(new CustomEvent('shrinking-stop'));
        break;
    }
  },

  /**
   * Parses NDEF message and returns options object which is used to create
   * MozActivity. It checks the first NDEF record and basing on tnf value
   * passes the record for further parsing of paylod and type to helper methods.
   * If first record is valid, options object will contain the whole NDEF 
   * message, so the app can access other records and handle them appropriately.
   * TODO: together with helper methods should be moved to different file
   * TODO: more appropriate name needed
   * @param {Array} NDEF message - an array of NDEF records
   * @returns {Object} options - object used to construct MozActivity
   * @returns {Array} options.data.records - NDEF message 
   */
  handleNdefMessage: function nm_handleNdefMessage(ndefMsg) {
    var options = null;

    var record = (ndefMsg.length !== 0) ? ndefMsg[0] : { tnf: NDEF.TNF_EMPTY };
    this._debug('RECORD: ' + JSON.stringify(record));

    switch (+record.tnf) {
      case NDEF.TNF_EMPTY:
        options = this.createActivityOptionsWithType('empty');
        break;
      case NDEF.TNF_WELL_KNOWN:
        options = this.formatWellKnownRecord(record);
        break;
      case NDEF.TNF_MIME_MEDIA:
        options = this.formatMimeMedia(record);
        break;
      case NDEF.TNF_ABSOLUTE_URI:
      case NDEF.TNF_EXTERNAL_TYPE:
        // Absolute URI and External payload handling is application specific,
        // in terms of creating activity they should be handled alike
        var type = NfcUtils.toUTF8(record.type);
        options = this.createActivityOptionsWithType(type);
        break;
      case NDEF.TNF_UNKNOWN:
      case NDEF.TNF_RESERVED:
        options = this.createDefaultActivityOptions();
        break;
      case NDEF.TNF_UNCHANGED:
        break;
    }

    if (options === null) {
      this._debug('XX Found no NDEF message actions. XX');
      // we're handling here also tnf unchanged, not adding record payload
      // as ndef record is malformed/unxpected, this is a workaround
      // until Bug 1007724 will land
      options = this.createDefaultActivityOptions();
    } else {
      options.data.records = ndefMsg;
    }

    return options;
  },

  /**
   * Fires NDEF related activities to launch other apps to perform
   * further actions with NDEF Message contents. If the first NDEF record
   * contains a well know type additional parsing will be done in helper
   * methods. In general the name of activity will be 'nfc-ndef-discovered',
   * in some case other names may be used (e.g. 'dial' in case of tel uri)
   * @param {Object} msg
   * @param {Array} msg.records - NDEF Message
   * @param {Array} msg.techList - tech list
   * @param {string} msg.sessionToken - session token
   * @param {string} tech - tech from tech list with highest priority
   */
  fireNDEFDiscovered: function nm_fireNDEFDiscovered(msg, tech) {
    this._debug('fireNDEFDiscovered: ' + JSON.stringify(msg));

    var options = this.handleNdefMessage(msg.records);
    if (options === null) {
      this._debug('Unimplemented. Handle Unknown type.');
      options = this.createActivityOptionsWithType('unknown');
    }
    options.data.tech = tech;
    options.data.techList = msg.techList;
    options.data.sessionToken = msg.sessionToken;
    this._debug('options: ' + JSON.stringify(options));

    var activity = new MozActivity(options);
    activity.onerror = () => {
      this._debug('Firing nfc-ndef-discovered failed');
    };
  },

  /**
   * Triggers P2P UI flow which is asking the user to confirm if he wants 
   * to share data. Handled by ShrinkingUI, which listens for 
   * check-p2p-registration-for-active-app event.
   */
  triggerP2PUI: function triggerP2PUI() {
    var evt = new CustomEvent('check-p2p-registration-for-active-app', {
      bubbles: true, cancelable: false,
      detail: this
    });
    window.dispatchEvent(evt);
  },

  checkP2PRegistration:
    function nm_checkP2PRegistration(manifestURL) {
      var nfcdom = window.navigator.mozNfc;
      if (!nfcdom) {
        return;
      }

      var status = nfcdom.checkP2PRegistration(manifestURL);
      var self = this;
      status.onsuccess = function() {
        if (status.result) {
          // Top visible application's manifest Url is registered;
          // Start Shrink / P2P UI and wait for user to accept P2P event
          window.dispatchEvent(new CustomEvent('shrinking-start'));

          // Setup listener for user response on P2P UI now
          window.addEventListener('shrinking-sent', self);
        } else {
          // Clean up P2P UI events
          self._debug('Error checking P2P Registration: ' +
                      JSON.stringify(status.result));
          window.removeEventListener('shrinking-sent', self);
          window.dispatchEvent(new CustomEvent('shrinking-stop'));
        }
      };
  },

  dispatchP2PUserResponse: function nm_dispatchP2PUserResponse(manifestURL) {
    var nfcdom = window.navigator.mozNfc;
    if (!nfcdom) {
      return;
    }

    nfcdom.notifyUserAcceptedP2P(manifestURL);
  },

  /**
   * Fires nfc-tag-discovered activity to pass unsupported
   * or NDEF_FORMATABLE tags to an app which can do some
   * further processing.
   * @param {Object} msg
   * @param {string} type - tech with highest priority; for filtering 
   */
  fireTagDiscovered: function nm_fireTagDiscovered(msg, type) {
    var self = this;

    var a = new MozActivity({
      name: 'nfc-tag-discovered',
      data: {
        type: type,
        sessionToken: msg.sessionToken,
        techList: msg.techList,
        // it might be possible we will have some content
        // so app might handle it, real world testing needed
        records: msg.records
      }
    });
    a.onerror = function() {
      self._debug('Firing nfc-tag-discovered failed');
    };
  },

  getPrioritizedTech: function nm_getPrioritizedTech(techList) {
    if (techList.length === 0) {
      return 'Unknown';
    }

    var self = this;
    techList.sort(function sorter(techA, techB) {
      var priorityA = self.TechPriority[techA] || self.TechPriority.Unsupported;
      var priorityB = self.TechPriority[techB] || self.TechPriority.Unsupported;
      return priorityA - priorityB;
    });

    return techList[0];
  },

  /**
   * Handler for nfc-manager-tech-discovered messages which originate from
   * gecko. Basing on the first NDEF record tnf and type this method can use
   * NfcHandoverManager to handle handover scenarios. Basing on the techList
   * array it can either trigger P2P sharing scenario or create MozActivities
   * for other apps to act upon.
   * @param {Object} msg gecko originated message
   * @param {Array} msg.records NDEF records
   * @param {Array} msg.techList
   * @param {string} msg.sessionToken
   * @param {string} msg.type set to 'techDiscovered'
   */
  handleTechnologyDiscovered: function nm_handleTechnologyDiscovered(msg) {
    this._debug('Technology Discovered: ' + JSON.stringify(msg));
    msg = msg || {};
    msg.records = Array.isArray(msg.records) ? msg.records : [];
    msg.techList = Array.isArray(msg.techList) ? msg.techList : [];

    window.dispatchEvent(new CustomEvent('nfc-tech-discovered'));
    window.navigator.vibrate([25, 50, 125]);

    if (msg.records.length !== 0) {
      /* First check for handover messages that
       * are handled by the handover manager.
       */
      var firstRecord = msg.records[0];
      if ((firstRecord.tnf == NDEF.TNF_MIME_MEDIA) &&
          NfcUtils.equalArrays(firstRecord.type, NDEF.MIME_BLUETOOTH_OOB)) {
        this._debug('Handle simplified pairing record');
        NfcHandoverManager.handleSimplifiedPairingRecord(msg.records);
        return;
      }
      if ((firstRecord.tnf == NDEF.TNF_WELL_KNOWN) &&
          NfcUtils.equalArrays(firstRecord.type, NDEF.RTD_HANDOVER_SELECT)) {
        this._debug('Handle Handover Select');
        NfcHandoverManager.handleHandoverSelect(msg.records);
        return;
      }
      if ((firstRecord.tnf == NDEF.TNF_WELL_KNOWN) &&
          NfcUtils.equalArrays(firstRecord.type, NDEF.RTD_HANDOVER_REQUEST)) {
        this._debug('Handle Handover Request');
        NfcHandoverManager.handleHandoverRequest(msg.records, msg.sessionToken);
        return;
      }
    }

    this._debug('msg.techList: ' + msg.techList);
    var tech = this.getPrioritizedTech(msg.techList);
    // One shot try. Fallback directly to tag.
    switch (tech) {
      case 'P2P':
        if (!msg.records.length) {
          this.triggerP2PUI();
        } else {
          // if there are records in the message we've got NDEF messages shared
          // by other device via P2P, this should be handled as regular NDEF
          this.fireNDEFDiscovered(msg, tech);
        }
        break;
      case 'NDEF':
      case 'NDEF_WRITEABLE':
        this.fireNDEFDiscovered(msg, tech);
        break;
      case 'NDEF_FORMATABLE':
        // not moving to default for readability 
        this.fireTagDiscovered(msg, tech);
        break;
      default:
        this._debug('Tag tech: ' + tech + ', fire Tag-Discovered.');
        this.fireTagDiscovered(msg, tech);
        break;
    }
  },

  handleTechLost: function nm_handleTechLost(command) {
    this._debug('Technology Lost: ' + JSON.stringify(command));

    window.navigator.vibrate([125, 50, 25]);
    window.dispatchEvent(new CustomEvent('nfc-tech-lost'));

    // Clean up P2P UI events
    window.removeEventListener('shrinking-sent', this);
    window.dispatchEvent(new CustomEvent('shrinking-stop'));
  },

  // Miscellaneous utility functions to handle formating the JSON for activities

  isTypeMatch: function nm_isTypeMatch(type, stringTypeArray) {
    var strType = NfcUtils.toUTF8(type);
    if (stringTypeArray && stringTypeArray.length) {
      for (var i = 0; i < stringTypeArray.length; i++) {
        if (strType === stringTypeArray[i]) {
          this._debug('Found a type match.');
          return true;
        }
      }
    }
    this._debug('Did not find a match.');
    return false;
  },

  formatWellKnownRecord: function nm_formatWellKnownRecord(record) {
    this._debug('HandleWellKnowRecord');
    if (NfcUtils.equalArrays(record.type, NDEF.RTD_TEXT)) {
      return this.formatTextRecord(record);
    } else if (NfcUtils.equalArrays(record.type, NDEF.RTD_URI)) {
      return this.formatURIRecord(record);
    } else if (NfcUtils.equalArrays(record.type, NDEF.RTD_SMART_POSTER)) {
      // Smartposters can be multipart NDEF messages.
      // The meaning and actions are application dependent.
      return this.createActivityOptionsWithType('smartposter');
    } else {
      this._debug('Unknown record type: ' + JSON.stringify(record));
    }
    return null;
  },

  formatTextRecord: function nm_formatTextRecord(record) {
    var status = record.payload[0];
    var langLen = status & NDEF.RTD_TEXT_IANA_LENGTH;
    var language = NfcUtils.toUTF8(
                     record.payload.subarray(1, langLen + 1));
    var encoding = (status & NDEF.RTD_TEXT_ENCODING) !== 0 ? 1 : 0;
    var text;
    var encodingString;
    if (encoding === NDEF.RTD_TEXT_UTF8) {
      text = NfcUtils.toUTF8(record.payload.subarray(langLen + 1));
      encodingString = 'UTF-8';
    } else if (encoding === NDEF.RTD_TEXT_UTF16) {
      text = NfcUtils.UTF16BytesToStr(record.payload.subarray(langLen + 1));
      encodingString = 'UTF-16';
    }

    var options = this.createActivityOptionsWithType('text');
    options.data.rtd = record.type;
    options.data.text = text;
    options.data.language = language;
    options.data.encoding = encodingString;
    return options;
  },

  formatURIRecord: function nm_formatURIRecord(record) {
    var prefix = NDEF.URIS[record.payload[0]];
    if (prefix === undefined) {
      this._debug('Handle NDEF URI: identifier not known.');
      return null;
    }

    var options,
        suffix = NfcUtils.toUTF8(record.payload.subarray(1)),
        uri = prefix + suffix;

    this._debug('Handle NDEF URI: ' + uri);

    if (uri.indexOf('tel:') === 0) {
      options = {
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: suffix,
          uri: uri
        }
      };
    } else if (uri.indexOf('mailto:') === 0) {
      options = {
        name: 'new',
        data: {
          type: 'mail',
          url: uri
        }
      };
    } else if (uri.indexOf('http://') === 0 ||
               uri.indexOf('https://') === 0) {
      options = this.createActivityOptionsWithType('url');
      options.data.rtd = record.type;
      options.data.url = uri;
    } else {
      options = this.createActivityOptionsWithType('uri');
      options.data.rtd = record.type;
      options.data.uri = uri;
    }

    return options;
  },

  formatMimeMedia: function nm_formatMimeMedia(record) {
    this._debug('HandleMimeMedia');
    if (this.isTypeMatch(record.type,
                         ['text/vcard', 'text/x-vCard', 'text/x-vcard'])) {
      return this.formatVCardRecord(record);
    } else {
      return this.createActivityOptionsWithType(NfcUtils.toUTF8(record.type));
    }
  },

  formatVCardRecord: function nm_formatVCardRecord(record) {
    var vcardBlob = new Blob([NfcUtils.toUTF8(record.payload)],
                             {'type': 'text/vcard'});
    return { name: 'import', data: { type: 'text/vcard', blob: vcardBlob }};
  },

  createActivityOptionsWithType:
  function nm_createActivityOptionsWithType(type) {
    var options = this.createDefaultActivityOptions();
    options.data.type = type;
    return options;
  },

  createDefaultActivityOptions: function nm_createDefaultActivityOptions() {
    return { name: 'nfc-ndef-discovered', data: {}};
  }
};
NfcManager.init();
