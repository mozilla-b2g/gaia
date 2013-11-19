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

var NfcUtil = {
  fromUTF8: function nu_fromUTF8(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },

  toUTF8: function nu_toUTF8(a) {
    var str = '';
    for (var i = 0; i < a.length; i++) {
      str += String.fromCharCode(a[i]);
    }
    return str;
  },

  equalArrays: function nu_equalArrays(a1, a2) {
    if (a1.length != a2.length) {
      return false;
    }
    for (var i = 0; i < a1.length; i++) {
      if (a1[i] != a2[i]) {
        return false;
      }
    }
    return true;
  }
};

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

  NFC_POWER_LEVEL_DISABLED: 0,
  NFC_POWER_LEVEL_LOW: 1,
  NFC_POWER_LEVEL_ENABLED: 2,

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
    var self = this;
    window.navigator.mozSetMessageHandler(
      'nfc-manager-tech-discovered',
      function callTechnologyDiscovered(message) {
         self.handleTechnologyDiscovered(message);
      });
    window.navigator.mozSetMessageHandler(
      'nfc-manager-tech-lost',
      function callHandleTechnologyLost(message) {
        self.handleTechLost(message);
      });
    window.addEventListener('screenchange', this);
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);
  },

  acceptNfcEvents: function nm_acceptNfcEvents() {
    // Policy:
    if (ScreenManager.screenEnabled && !LockScreen.locked) {
      return true;
    } else {
      return false;
    }
  },

  handlePowerLevel: function nm_handlePowerLevel() {
    var acceptEvents = this.acceptNfcEvents();
    var powerLevel = this.NFC_POWER_LEVEL_LOW;
    if (acceptEvents) {
      powerLevel = this.NFC_POWER_LEVEL_ENABLED;
    }
    var request = navigator.mozSettings.createLock().set({
      'nfc.powerlevel': powerLevel
    });
    var self = this;
    request.onsuccess = function() {
      self._debug('Power level set successfully.');
    };
    request.onerror = function() {
      self._debug('Power level set failure');
    };
  },

  handleEvent: function nm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange': // Fall thorough
      case 'lock':
      case 'unlock':
        this.handlePowerLevel();
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
        action = this.handleEmpty(record);
        break;
      case NDEF.tnf_well_known:
        action = this.handleWellKnownRecord(record);
        break;
      case NDEF.tnf_absolute_uri:
        action = this.handleURIRecord(record);
        break;
      case NDEF.tnf_mime_media:
        action = this.handleMimeMedia(record);
        break;
      case NDEF.tnf_external_type:
        action = this.handleExternalType(record);
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
    conn.onsuccess = function() {
      this._debug('NFC tech disconnected');
    };
    conn.onerror = function() {
      this._debug('Disconnect failed.');
    };
  },

  handleNdefDiscoveredNotification:
    function nm_handleNdefDiscoveredNotification(tech, session) {

    var connected = false;
    var handled = false;
    var nfcdom = window.navigator.mozNfc;

    var token = session;
    var nfctag = nfcdom.getNFCTag(token);

    var conn = nfctag.connect(tech);
    conn.onsuccess = function() {
      var req = nfctag.readNDEF();
      req.onsuccess = function() {
        this._debug('NDEF Read result: ' + JSON.stringify(req.result));
        handled = this.handleNdefDiscovered(tech, session, req.result.records);
        this.doClose(nfctag);
      };
      req.onerror = function() {
        this._debug('Error reading NDEF record');
        this.doClose(nfctag);
      };
    };

    return handled;
  },

  handleNdefDiscovered:
    function nm_handleNdefDiscovered(tech, session, ndefMsg) {

    if (ndefMsg == null) {
      return false;
    }

    this._debug('handleNdefDiscovered: ' + JSON.stringify(ndefMsg));
    var records = ndefMsg;

    var action = this.handleNdefMessage(records);
    if (action == null) {
      this._debug('Unimplemented. Handle Unknown type.');
    } else {
      this._debug('Action: ' + JSON.stringify(action));
      action.data.tech = tech;
      action.data.sessionToken = session;
      var a = new MozActivity(action);
      return true;
    }

    return false;
  },

  // TODO:
  handleNdefFormattableDiscovered:
    function nm_handleNdefFormattableDiscovered(tech, session) {

    return this.handleNdefDiscoveredNotification(tech, session);
  },

  handleTechnologyDiscovered: function nm_handleTechnologyDiscovered(command) {

    this._debug('Technology Discovered: ' + JSON.stringify(command));

    if (!this.acceptNfcEvents()) {
      this._debug(
        'Ignoring NFC technology tag message. Screen state is disabled.');
      return;
    }

    // Check for tech types:
    this._debug('command.tech: ' + command.tech);
    var handled = false;
    var techs = command.tech;
    if (command.ndef.length) {
      // Pick the first NDEF message for now.
      var ndefMsg = command.ndef[0];
    } else {
      this._debug('Empty NDEF Message sent to Technology Discovered');
      var ndefMsg = [];
    }

    if (ndefMsg != null) {
      var firstRecord = ndefMsg[0];
      if ((firstRecord.tnf == NDEF.tnf_well_known) &&
          NfcUtil.equalArrays(firstRecord.type, NDEF.rtd_handover_select)) {
        this._debug('Handle Handover Select');
        handoverManager.handleHandoverSelect(ndefMsg);
        return;
      }
      if ((firstRecord.tnf == NDEF.tnf_well_known) &&
          NfcUtil.equalArrays(firstRecord.type, NDEF.rtd_handover_request)) {
        this._debug('Handle Handover Request');
        handoverManager.handleHandoverRequest(ndefMsg, command.sessionToken);
        return;
      }
    }

    // Force Tech Priority:
    var pri = ['P2P', 'NDEF', 'NDEF_FORMATTABLE', 'NFC_A', 'MIFARE_ULTRALIGHT'];
    for (var ti = 0; ti < pri.length; ti++) {
      this._debug('Going through NFC Technologies: ' + ti);
      var i = techs.indexOf(pri[ti]);
      if (i == -1) {
        continue;
      }
      var tech = techs[i];
      if (tech == 'P2P') {
        if (ndefMsg != null) {
          // FIXME: Do P2P UI: Ask user if P2P event is acceptable in the
          // app' surrent user context to accept a message via registered app
          // callback/message. If so, fire P2P NDEF to app.
          // If not, drop message.

          // This is a P2P notification with no ndef.
          this._debug('P2P UI : Shrink UI');
          // TODO: Upon user akcnowledgement on the shrunk UI,
          //       system application notifies gecko of the top most window.

          // Notify gecko of User's acknowledgement.
          var nfcdom = window.navigator.mozNfc;
          nfcdom.setPeerWindow(window.top);
          return;
        }
        handled = this.handleNdefDiscovered(techs[i], command.sessionToken,
                                         ndefMsg);
      } else if (tech == 'NDEF') {
        handled = this.handleNdefDiscovered(techs[i], command.sessionToken,
                                         ndefMsg);
      } else if (tech == 'NDEF_FORMATTABLE') {
        handled = handleNdefFormattableDiscovered(techs[i],
                                                    command.sessionToken);
      } else if (tech == 'NFC_A') {
        this._debug('NFCA unsupported: ' + command);
      } else if (tech == 'MIFARE_ULTRALIGHT') {
        this._debug('MiFare unsupported: ' + command);
      } else {
        this._debug('Unknown or unsupported tag tech type');
      }

      if (handled == true) {
        break;
      }
    }

    if (handled == false) {
      // Fire off activity to whoever is registered to handle a generic binary
      // blob tag (TODO: tagRead).
      var technologyTags = command.tag;
      var a = new MozActivity({
        name: 'tag-discovered',
        data: {
          type: 'tag',
          sessionId: command.sessionToken,
          tag: technologyTags
        }
      });
    }
  },

  handleTechLost: function nm_handleTechLost(command) {
    this._debug('Technology Lost: ' + JSON.stringify(command));
    var a = new MozActivity({
      name: 'nfc-tech-lost',
      data: {
        type: 'info',
        sessionId: command.sessionToken,
        message: ''
      }
    });
  },

  // NDEF parsing functions
  handleEmpty: function nm_handleEmpty(record) {
    this._debug('Activity for empty tag.');
    return {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'empty'
      }
    };
  },

  handleWellKnownRecord: function nm_handleWellKnownRecord(record) {
    this._debug('HandleWellKnowRecord');
    if (NfcUtil.equalArrays(record.type, NDEF.rtd_text)) {
      return this.handleTextRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.rtd_uri)) {
      return this.handleURIRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.rtd_smart_poster)) {
      return this.handleSmartPosterRecord(record);
    } else if (NfcUtil.equalArrays(record.type, NDEF.smartposter_action)) {
      return this.handleSmartPosterAction(record);
    } else {
      console.log('Unknown record type: ' + JSON.stringify(record));
    }
    return null;
  },

  handleTextRecord: function nm_handleTextRecord(record) {
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
      //TODO needs to be fixed. payload is Uint8Array
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

  handleURIRecord: function nm_handleURIRecord(record) {
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

  handleMimeMedia: function nm_handleMimeMedia(record) {
    var type = 'mime-media';
    var activityText = null;

    this._debug('XXXX HandleMimeMedia');
    if (NfcUtil.equalArrays(record.type, 'text/vcard')) {
      activityText = this.handleVCardRecord(record);
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

  findKey: function nm_findKey(key, payload) {
    var p = payload.indexOf(key);
    var value = null;
    this._debug('Key: ' + key + ', At position: ' + p);
    if (p >= 0) {
      value = payload.substring(p + key.length);
      value = value.substring(0, value.indexOf('\n'));
    }
    this._debug('Value: ' + value);
    return value;
  },

  // FIXME, incomplete mapping/formatting. App (or full featured vcard parser
  // library should parse the full ndef vcard.
  // VCARD 2.1:
  handleVCardRecord: function nm_handleVCardRecord(record) {
    var vcard = {};
    var payload = NfcUtil.toUTF8(record.payload);
    /**
      https://tools.ietf.org/html/rfc6350:
      name  = "SOURCE" / "KIND" / "FN" / "N" / "NICKNAME"
         / "PHOTO" / "BDAY" / "ANNIVERSARY" / "GENDER" / "ADR" / "TEL"
         / "EMAIL" / "IMPP" / "LANG" / "TZ" / "GEO" / "TITLE" / "ROLE"
         / "LOGO" / "ORG" / "MEMBER" / "RELATED" / "CATEGORIES"
         / "NOTE" / "PRODID" / "REV" / "SOUND" / "UID" / "CLIENTPIDMAP"
         / "URL" / "KEY" / "FBURL" / "CALADRURI" / "CALURI" / "XML"
         / iana-token / x-name
     */
    var fn = this.findKey('FN:', payload);
    var n = this.findKey('N:', payload);
    var p = fn.indexOf(' ');
    var first = null;
    var last = null;
    if (p == 0) {
      var first = fn.substring(0, fn.indexOf(' '));
    } else {
      var first = fn.substring(0, fn.indexOf(' '));
      var last = fn.substring(fn.indexOf(' ') + 1);
    }

    var nickname = this.findKey('NICKNAME:', payload);
    var photo = this.findKey('PHOTO:', payload);
    var cell = this.findKey('TEL;TYPE:cell:', payload);
    var tel = this.findKey('TEL:', payload);
    var email = this.findKey('EMAIL:', payload);
    var note = this.findKey('NOTE:', payload);
    var address = this.findKey('ADR;HOME:', payload);
    var company = this.findKey('ADR;WORK:', payload);

    // Add fields:
    if (tel) {
      vcard.tel = tel;
    }
    if (cell) {
      vcard.cell = cell;
    }
    if (email) {
      vcard.email = email;
    }
    if (address) {
      vcard.address = address;
    }
    if (note) {
      vcard.note = note;
    }
    if (photo) {
      card.photo = photo;
    }
    if (first) {
      vcard.givenName = first;
    }
    if (last) {
      vcard.familyName = last;
    }
    if (n) {
      vcard.n = n;
    }
    if (nickname) {
      vcard.nickname = nickname;
    }
    if (company) {
      vcard.company = company;
    }

    var activityText = {
      name: 'new',
      data: {
        type: 'webcontacts/contact',
        params: vcard
      }
    };
    return activityText;
  },

  handleExternalType: function nm_handleExternalType(record) {
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
  handleSmartPosterRecord: function nm_handleSmartPosterRecord(record) {
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'smartposter'
      }
    };
    return activityText;
  },

  handleSmartPosterAction: function nm_nm_handleSmartPosterAction(record) {
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
