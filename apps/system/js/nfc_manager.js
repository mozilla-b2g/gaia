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

/* globals dump, lockScreen, CustomEvent, MozActivity, MozNDEFRecord,
   NfcHandoverManager, NfcUtils, NDEF, ScreenManager */
'use strict';

var NfcManager = {
  DEBUG: false,

  NFC_HW_STATE_OFF: 0,
  NFC_HW_STATE_ON: 1,
  NFC_HW_STATE_ENABLE_DISCOVERY: 2,
  NFC_HW_STATE_DISABLE_DISCOVERY: 3,

  hwState: 0,

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
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);
    var self = this;
    window.SettingsListener.observe('nfc.enabled', false, function(enabled) {
      var state = enabled ?
                    (lockScreen.locked ?
                       self.NFC_HW_STATE_DISABLE_DISCOVERY :
                       self.NFC_HW_STATE_ON) :
                    self.NFC_HW_STATE_OFF;
      self.changeHardwareState(state);
    });
  },

  isScreenUnlockAndEnabled: function nm_isScreenUnlockAndEnabled() {
    // Policy:
    if (ScreenManager.screenEnabled && lockScreen && !lockScreen.locked) {
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
      case 'lock': // Fall through
      case 'unlock':
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

  // An NDEF Message is an array of one or more NDEF records.
  handleNdefMessage: function nm_handleNdefMessage(ndefmessage) {
    var options = null;

    var record = ndefmessage[0];
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
      this._debug('XX Found no ndefmessage actions. XX');
      // we're handling here also tnf unchanged, not adding record payload
      // as ndef record is malformed/unxpected, this is a workaround
      // until Bug 1007724 will land 
      options = this.createDefaultActivityOptions();
    } else {
      options.data.records = ndefmessage;
    }

    return options;
  },

  doClose: function nm_doClose(nfctag) {
    var conn = nfctag.close();
    var self = this;
    conn.onsuccess = function() {
      self._debug('NFC tech disconnected');
    };
    conn.onerror = function() {
      self._debug('Disconnect failed.');
    };
  },

  handleNdefDiscoveredUseConnect:
    function nm_handleNdefDiscoveredUseConnect(tech, session) {
      var self = this;

      var nfcdom = window.navigator.mozNfc;
      if (!nfcdom) {
        return;
      }

      var token = session;
      var nfctag = nfcdom.getNFCTag(token);

      var conn = nfctag.connect(tech);
      conn.onsuccess = function() {
        var req = nfctag.readNDEF();
        req.onsuccess = function() {
          self._debug('NDEF Read result: ' + JSON.stringify(req.result));
          self.handleNdefDiscovered(tech, session, req.result);
          self.doClose(nfctag);
        };
        req.onerror = function() {
          self._debug('Error reading NDEF record');
          self.doClose(nfctag);
        };
      };
  },

  handleNdefDiscovered:
    function nm_handleNdefDiscovered(tech, session, records) {

      this._debug('handleNdefDiscovered: ' + JSON.stringify(records));
      var options = this.handleNdefMessage(records);
      if (options === null) {
        this._debug('Unimplemented. Handle Unknown type.');
      } else {
        this._debug('options: ' + JSON.stringify(options));
        options.data.tech = tech;
        options.data.sessionToken = session;
        var a = new MozActivity(options);
        a.onerror = function() {
          self._debug('Firing nfc-ndef-discovered failed');
        };
      }
  },

  handleNdefDiscoveredEmpty:
    function nm_handleNdefDiscoveredEmpty(tech, sessionToken) {
      var emptyRec = [new MozNDEFRecord(NDEF.tnf_empty, NDEF.rtd_text)];
      this.handleNdefDiscovered(tech, sessionToken, emptyRec);
  },

  // NDEF only currently
  handleP2P: function handleP2P(tech, sessionToken, records) {
    if (records != null) {
       // Incoming P2P message carries a NDEF message. Dispatch
       // the NDEF message (this might bring another app to the
       // foreground).
      this.handleNdefDiscovered(tech, sessionToken, records);
      return;
    }

    // Incoming P2P message does not carry an NDEF message.

    // Do P2P UI.
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

  fireTagDiscovered: function nm_fireTagDiscovered(command) {
    var self = this;
    // Fire off activity to whoever is registered to handle a generic
    // binary blob.
    var techList = command.techList;
    var a = new MozActivity({
      name: 'nfc-tag-discovered',
      data: {
        type: 'tag',
        sessionToken: command.sessionToken,
        techList: techList
      }
    });
    a.onerror = function() {
      self._debug('Firing nfc-tag-discovered failed');
    };
  },

  handleTechnologyDiscovered: function nm_handleTechnologyDiscovered(command) {
    this._debug('Technology Discovered: ' + JSON.stringify(command));

    window.dispatchEvent(new CustomEvent('nfc-tech-discovered'));
    window.navigator.vibrate([25, 50, 125]);

    // Check for tech types:
    this._debug('command.techList: ' + command.techList);
    var techList = command.techList;
    var records = null;
    if (command.records && (command.records.length > 0)) {
      records = command.records;
    } else {
      this._debug('No NDEF Message sent to Technology Discovered');
    }

    if (records != null) {
      /* First check for handover messages that
       * are handled by the handover manager.
       */
      var firstRecord = records[0];
      if ((firstRecord.tnf == NDEF.TNF_MIME_MEDIA) &&
            NfcUtils.equalArrays(firstRecord.type,
            NfcUtils.fromUTF8('application/vnd.bluetooth.ep.oob'))) {
        this._debug('Handle simplified pairing record');
        NfcHandoverManager.handleSimplifiedPairingRecord(records);
        return;
      }
      if ((firstRecord.tnf == NDEF.TNF_WELL_KNOWN) &&
          NfcUtils.equalArrays(firstRecord.type, NDEF.RTD_HANDOVER_SELECT)) {
        this._debug('Handle Handover Select');
        NfcHandoverManager.handleHandoverSelect(records);
        return;
      }
      if ((firstRecord.tnf == NDEF.TNF_WELL_KNOWN) &&
          NfcUtils.equalArrays(firstRecord.type, NDEF.RTD_HANDOVER_REQUEST)) {
        this._debug('Handle Handover Request');
        NfcHandoverManager.handleHandoverRequest(records, command.sessionToken);
        return;
      }
    }

    // Assign priority of tech handling. This list will expand with supported
    // Technologies.
    var priority = {
      'P2P': 0,
      'NDEF': 1,
      'NDEF_WRITEABLE': 2,
      'NDEF_FORMATABLE': 3,
      'NFC_A': 4,
      'MIFARE_ULTRALIGHT': 5
    };
    techList.sort(function sorter(techA, techB) {
      return priority[techA] - priority[techB];
    });

    // One shot try. Fallback directly to tag.
    switch (techList[0]) {
      case 'P2P':
        this.handleP2P(techList[0], command.sessionToken, records);
        break;
      case 'NDEF':
        if (records) {
          this.handleNdefDiscovered(techList[0], command.sessionToken, records);
        } else {
          this.handleNdefDiscoveredEmpty(techList[0], command.sessionToken);
        }
        break;
      case 'NDEF_WRITEABLE':
        this.handleNdefDiscoveredEmpty(techList[0], command.sessionToken);
        break;
      case 'NDEF_FORMATABLE':
        this.handleNdefDiscoveredUseConnect(techList[0], command.sessionToken);
        break;
      case 'NFC_A':
        this._debug('NFCA unsupported: ' + command);
        break;
      case 'MIFARE_ULTRALIGHT':
        this._debug('MiFare unsupported: ' + command);
        break;
      default:
        this._debug('Unknown or unsupported tag type. Fire Tag-Discovered.');
        this.fireTagDiscovered(command);
    }
  },

  handleTechLost: function nm_handleTechLost(command) {
    this._debug('Technology Lost: ' + JSON.stringify(command));

    window.navigator.vibrate([125, 50, 25]);
    window.dispatchEvent(new CustomEvent('nfc-tech-lost'));

    // Clean up P2P UI events
    window.removeEventListener('shrinking-sent', this);
    window.dispatchEvent(new CustomEvent('shrinking-rejected'));
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
    var languageLength = status & NDEF.RTD_TEXT_IANA_LENGTH;
    var language = NfcUtils.toUTF8(
                     record.payload.subarray(1, languageLength + 1));
    var encoding = status & NDEF.RTD_TEXT_ENCODING;
    var text;
    var encodingString;
    if (encoding == NDEF.RTD_TEXT_UTF8) {
      text = NfcUtils.toUTF8(record.payload.subarray(languageLength + 1));
      encodingString = 'UTF-8';
    } else if (encoding == NDEF.RTD_TEXT_UTF16) {
      text = NfcUtils.toUTF16(record.payload.subarray(languageLength + 2));
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
    this._debug('XXXX Handle Ndef URI type');
    var options = null;
    var prefix = NDEF.URIS[record.payload[0]];
    if (!prefix) {
      return null;
    }

    switch (prefix) {
      case 'tel:':
        var number = NfcUtils.toUTF8(record.payload.subarray(1));
        this._debug('Handle Ndef URI type, TEL');
        options = {
          name: 'dial',
          data: {
            type: 'webtelephony/number',
            number: number,
            uri: prefix + number
          }
        };
        break;
      case 'http://www.':
      case 'https://www.': // Fall through.
      case 'http://':
      case 'https://':
        this._debug('Handle Ndef URI type, Http(s)');
        options = this.createActivityOptionsWithType('url');
        options.data.rtd = record.type;
        options.data.url = prefix +
                           NfcUtils.toUTF8(record.payload.subarray(1));
        break;
      default:
        options = this.createActivityOptionsWithType('uri');
        options.data.rtd = record.type;
        options.data.uri = prefix +
                           NfcUtils.toUTF8(record.payload.subarray(1));
        break;
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
