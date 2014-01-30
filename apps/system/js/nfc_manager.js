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

'use strict';

var NDEF = {
  flags_tnf: 0x07,
  flags_ss: 0x10,
  flags_il: 0x08,

  tnf_empty: 0x00,
  tnf_well_known: 0x01,
  tnf_mime_media: 0x02,
  tnf_absolute_uri: 0x03,
  tnf_external_type: 0x04,
  tnf_unknown: 0x05,
  tnf_unchanged: 0x06,
  tnf_reserved: 0x07,

  rtd_text: 0,
  rtd_uri: 0,
  rtd_smart_poster: 0,
  rtd_alternative_carrier: 0,
  rtd_handover_carrier: 0,
  rtd_handover_request: 0,
  rtd_handover_select: 0,

  smartposter_action: 0,

  // Action Record Values:
  doAction: 0x00,
  saveForLaterAction: 0x01,
  openForEditingAction: 0x02,
  RFUAction: 0x03,  // Reserved from 0x03 to 0xFF

  uris: new Array(),

  init: function ndef_init() {
    this.rtd_text = NfcUtil.fromUTF8('T');
    this.rtd_uri = NfcUtil.fromUTF8('U');
    this.rtd_smart_poster = NfcUtil.fromUTF8('Sp');
    this.rtd_alternative_carrier = NfcUtil.fromUTF8('ac');
    this.rtd_handover_carrier = NfcUtil.fromUTF8('Hc');
    this.rtd_handover_request = NfcUtil.fromUTF8('Hr');
    this.rtd_handover_select = NfcUtil.fromUTF8('Hs');

    this.smartposter_action = NfcUtil.fromUTF8('act');

    this.uris[0x00] = '';
    this.uris[0x01] = 'http://www.';
    this.uris[0x02] = 'https://www.';
    this.uris[0x03] = 'http://';
    this.uris[0x04] = 'https://';
    this.uris[0x05] = 'tel:';
    this.uris[0x06] = 'mailto:';
    this.uris[0x07] = 'ftp://anonymous:anonymous@';
    this.uris[0x08] = 'ftp://ftp.';
    this.uris[0x09] = 'ftps://';
    this.uris[0x0A] = 'sftp://';
    this.uris[0x0B] = 'smb://';
    this.uris[0x0C] = 'nfs://';
    this.uris[0x0D] = 'ftp://';
    this.uris[0x0E] = 'dav://';
    this.uris[0x0F] = 'news:';
    this.uris[0x10] = 'telnet://';
    this.uris[0x11] = 'imap:';
    this.uris[0x12] = 'rtsp://';
    this.uris[0x13] = 'urn:';
    this.uris[0x14] = 'pop:';
    this.uris[0x15] = 'sip:';
    this.uris[0x16] = 'sips:';
    this.uris[0x17] = 'tftp:';
    this.uris[0x18] = 'btspp://';
    this.uris[0x19] = 'btl2cap://';
    this.uris[0x1A] = 'btgoep://';
    this.uris[0x1B] = 'tcpobex://';
    this.uris[0x1C] = 'irdaobex://';
    this.uris[0x1D] = 'file://';
    this.uris[0x1E] = 'urn:epc:id:';
    this.uris[0x1F] = 'urn:epc:tag:';
    this.uris[0x20] = 'urn:epc:pat:';
    this.uris[0x21] = 'urn:epc:raw:';
    this.uris[0x22] = 'urn:epc:';
    this.uris[0x23] = 'urn:nfc:';
  },

  rtd_text_iana_length: 0x3F,
  rtd_text_encoding: 0x40,
  rtd_text_utf8: 0,
  rtd_text_utf16: 1
};
NDEF.init();

var NfcManager = {
  DEBUG: false,

  NFC_HW_STATE_OFF: 0,
  NFC_HW_STATE_ON: 1,
  NFC_HW_STATE_ENABLE_DISCOVERY: 2,
  NFC_HW_STATE_DISABLE_DISCOVERY: 3,

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
    // Initialize nfc-dom so that it is ready to receive H/W state changes
    var nfcdom = window.navigator.mozNfc;

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
    SettingsListener.observe('nfc.enabled', false, function(e) {
      var state = (e.settingValue === true) ? self.NFC_HW_STATE_ON :
                                              self.NFC_HW_STATE_OFF;
      self.dispatchHardwareChangeEvt(state);
    });
  },

  acceptNfcEvents: function nm_acceptNfcEvents() {
    // Policy:
    if (ScreenManager.screenEnabled && !LockScreen.locked) {
      return true;
    } else {
      return false;
    }
  },

  dispatchHardwareChangeEvt: function nm_dispatchHardwareChangeEvt(state) {
    var acceptEvents = this.acceptNfcEvents();
    this._debug('dispatchHardwareChangeEvt : acceptEvents : ' + acceptEvents +
                                 'state : ' + JSON.stringify(state));
    var detail = {
      type: 'nfc-hardware-state-change',
      nfcHardwareState: state
    };
    // Create the state-change event and dispatch
    var event = document.createEvent('customEvent');
    event.initCustomEvent('mozContentEvent', true, true, detail);
    window.dispatchEvent(event);
  },

  handleEvent: function nm_handleEvent(evt) {
    var state = this.NFC_HW_STATE_ENABLE_DISCOVERY;
    switch (evt.type) {
      case 'lock': // Fall thorough
      case 'unlock':
      case 'screenchange':
        if ((evt.detail && evt.detail.screenEnabled) && !LockScreen.locked) {
          state = this.NFC_HW_STATE_ENABLE_DISCOVERY;
        } else {
          state = this.NFC_HW_STATE_DISABLE_DISCOVERY;
        }
        this.dispatchHardwareChangeEvt(state);
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
    var action = null;

    var record = ndefmessage[0];
    this._debug('RECORD: ' + JSON.stringify(record));

    switch (+record.tnf) {
      case NDEF.tnf_empty:
        action = this.formatEmpty(record);
        break;
      case NDEF.tnf_well_known:
        action = this.formatWellKnownRecord(record);
        break;
      case NDEF.tnf_absolute_uri:
        action = this.formatURIRecord(record);
        break;
      case NDEF.tnf_mime_media:
        action = this.formatMimeMedia(record);
        break;
      case NDEF.tnf_external_type:
        action = this.formatExternalType(record);
        break;
      case NDEF.tnf_unknown:
      case NDEF.tnf_unchanged:
      case NDEF.tnf_reserved:
      default:
        this._debug('Unknown or unimplemented tnf or rtd subtype.');
        break;
    }
    if (action == null) {
      this._debug('XX Found no ndefmessage actions. XX');
    } else {
      action.data.records = ndefmessage;
    }
    return action;
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

      var connected = false;
      var nfcdom = window.navigator.mozNfc;

      var token = session;
      var nfctag = nfcdom.getNFCTag(token);

      var conn = nfctag.connect(tech);
      conn.onsuccess = function() {
        var req = nfctag.readNDEF();
        req.onsuccess = function() {
          self._debug('NDEF Read result: ' + JSON.stringify(req.result));
          self.handleNdefDiscovered(tech, session,
                                              req.result.records);
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
      var action = this.handleNdefMessage(records);
      if (action == null) {
        this._debug('Unimplemented. Handle Unknown type.');
      } else {
        this._debug('Action: ' + JSON.stringify(action));
        action.data.tech = tech;
        action.data.sessionToken = session;
        var a = new MozActivity(action);
      }
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
      var status = window.navigator.mozNfc.checkP2PRegistration(manifestURL);
      var self = this;
      status.onsuccess = function() {
        // Top visible application's manifest Url is registered;
        // Start Shrink / P2P UI and wait for user to accept P2P event
        window.dispatchEvent(new CustomEvent('shrinking-start'));

        // Setup listener for user response on P2P UI now
        window.addEventListener('shrinking-sent', self);
      };
      status.onerror = function() {
        // Do nothing!
      };
  },

  dispatchP2PUserResponse: function nm_dispatchP2PUserResponse(manifestURL) {
    window.navigator.mozNfc.notifyUserAcceptedP2P(manifestURL);
  },

  fireTagDiscovered: function nm_fireTagDiscovered(command) {
    var self = this;
    // Fire off activity to whoever is registered to handle a generic
    // binary blob.
    var technologyTags = command.tag;
    var a = new MozActivity({
      name: 'tag-discovered',
      data: {
        type: 'tag',
        sessionId: command.sessionToken,
        tag: technologyTags
      }
    });
    a.onerror = function() {
      self._debug('Firing tag-discovered failed');
    };
  },

  handleTechnologyDiscovered: function nm_handleTechnologyDiscovered(command) {
    this._debug('Technology Discovered: ' + JSON.stringify(command));

    if (!this.acceptNfcEvents()) {
      this._debug(
        'Ignoring NFC technology tag message. NFC is in disabled state.');
      return;
    }
    // UX: TODO
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
      if ((firstRecord.tnf == NDEF.tnf_well_known) &&
          NfcUtil.equalArrays(firstRecord.type, NDEF.rtd_handover_select)) {
        this._debug('Handle Handover Select');
        NfcHandoverManager.handleHandoverSelect(records);
        return;
      }
      if ((firstRecord.tnf == NDEF.tnf_well_known) &&
          NfcUtil.equalArrays(firstRecord.type, NDEF.rtd_handover_request)) {
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
      'NDEF_FORMATTABLE': 2,
      'NFC_A': 3,
      'MIFARE_ULTRALIGHT': 4
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
        this.handleNdefDiscovered(techList[0], command.sessionToken, records);
        break;
      case 'NDEF_FORMATTABLE':
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
    // TODO: Do something with the UI/UX to indicate the tag is gone.
    // TODO: Dismiss activity chooser?

    // Clean up P2P UI events
    window.removeEventListener('shrinking-sent', this);
    window.dispatchEvent(new CustomEvent('shrinking-stop'));

    window.navigator.vibrate([125, 50, 25]);
  },

  // Miscellaneous utility functions to handle formating the JSON for activities

  formatEmpty: function nm_formatEmpty(record) {
    this._debug('Activity for empty tag.');
    return {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'empty'
      }
    };
  },

  formatWellKnownRecord: function nm_formatWellKnownRecord(record) {
    this._debug('HandleWellKnowRecord');
    if (NfcUtil.equalArrays(record.type, NDEF.rtd_text)) {
      return this.formatTextRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.rtd_uri)) {
      return this.formatURIRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.rtd_smart_poster)) {
      return this.formatSmartPosterRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.smartposter_action)) {
      return this.formatSmartPosterAction(record);
    } else {
      console.log('Unknown record type: ' + JSON.stringify(record));
    }
    return null;
  },

  formatTextRecord: function nm_formatTextRecord(record) {
    var status = record.payload[0];
    var languageLength = status & NDEF.rtd_text_iana_length;
    var language = NfcUtil.toUTF8(
                     record.payload.subarray(1, languageLength + 1));
    var encoding = status & NDEF.rtd_text_encoding;
    var text;
    var encodingString;
    if (encoding == NDEF.rtd_text_utf8) {
      text = NfcUtil.toUTF8(record.payload.subarray(languageLength + 1));
      encodingString = 'UTF-8';
    } else if (encoding == NDEF.rtd_text_utf16) {
      record.payload.substring(languageLength + 1);
      encodingString = 'UTF-16';
    }
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'text',
        rtd: record.type,
        text: text,
        language: language,
        encoding: encodingString
      }
    };
    return activityText;
  },

  formatURIRecord: function nm_formatURIRecord(record) {
    this._debug('XXXX Handle Ndef URI type');
    var activityText = null;
    var prefix = NDEF.uris[record.payload[0]];
    if (!prefix) {
      return null;
    }

    if (prefix == 'tel:') {
      // handle special case
      var number = NfcUtil.toUTF8(record.payload.subarray(1));
      this._debug('Handle Ndef URI type, TEL');
      activityText = {
        name: 'dial',
        data: {
          type: 'webtelephony/number',
          number: number,
          uri: prefix + number
        }
      };
    } else {
      activityText = {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'uri',
          rtd: record.type,
          uri: prefix + NfcUtil.toUTF8(record.payload.subarray(1))
        }
      };
    }
    return activityText;
  },

  formatMimeMedia: function nm_formatMimeMedia(record) {
    var type = 'mime-media';
    var activityText = null;

    this._debug('HandleMimeMedia');
    if (NfcUtil.equalArrays(record.type, NfcUtil.fromUTF8('text/vcard'))) {
      activityText = this.formatVCardRecord(record);
    } else {
      activityText = {
        name: 'nfc-ndef-discovered',
        data: {
          type: NfcUtil.toUTF8(record.type)
        }
      };
    }
    return activityText;
  },

  formatVCardRecord: function nm_formatVCardRecord(record) {
    var vcardBlob = new Blob([NfcUtil.toUTF8(record.payload)],
                             {'type': 'text/vcard'});
    var activityText = {
      name: 'import',
      data: {
        type: 'text/vcard',
        blob: vcardBlob
      }
    };
    return activityText;
  },

  formatExternalType: function nm_formatExternalType(record) {
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'external-type',
        rtd: record.type
      }
    };
    return activityText;
  },

  // Smartposters can be multipart NDEF messages.
  // The meaning and actions are application dependent.
  formatSmartPosterRecord: function nm_formatSmartPosterRecord(record) {
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'smartposter'
      }
    };
    return activityText;
  },

  formatSmartPosterAction: function nm_formatSmartPosterAction(record) {
    // The recommended action has an application specific meaning:
    var smartaction = record.payload[0];
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'smartposter-action',
        action: smartaction
      }
    };
    return activityText;
  }
};
NfcManager.init();
