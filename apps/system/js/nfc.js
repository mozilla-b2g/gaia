/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  var DEBUG = true;
  var screenEnabled = false;
  var screenLocked = false;

  /**
   * Constants
   */

  /**
   * NDEF format
   */
  var nfc = {
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

    rtd_text: 'T',
    rtd_uri: 'U',
    rtd_smart_poster: 'Sp',
    rtd_alternative_carrier: 'ac',
    rtd_handover_carrier: 'Hc',
    rtd_handover_request: 'Hr',
    rtd_handover_select: 'Hs',

    smartposter_action: 'act',

    // Action Record Values:
    doAction: 0x00,
    saveForLaterAction: 0x01,
    openForEditingAction: 0x02,
    RFUAction: 0x03,  // Reserved from 0x03 to 0xFF

    uris: new Array(),

    init: function() {
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


  /**
   * Debug method
   */
  function debug(msg, optObject) {
    if (DEBUG) {
      var output = '[DEBUG] SYSTEM NFC: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      dump(output);
    }
  }

  debug(' Initializing NFC Message %%%%%%%%%%%%%%%%%%%%%%');
  /**
   * NFC certified apps can register to receive Nfc commands. Apps without
   * NFC certified app permissions can still receive activity messages.
   */
  window.navigator.mozSetMessageHandler(
    'nfc-tech-discovered', handleTechnologyDiscovered);
  window.navigator.mozSetMessageHandler(
    'nfc-tech-lost', handleTechLost);

  // Dom Request Responses. Non-System Apps should just use the DOMRequest
  // onsuccess/onerror callbacks.
  /*
  window.navigator.mozSetMessageHandler(
    'nfc-ndef-details', handleNdefDetailsResponse);
  window.navigator.mozSetMessageHandler(
    'nfc-ndef-read', handleNdefReadResponse);
  window.navigator.mozSetMessageHandler(
    'nfc-ndef-write', handleNdefWriteResponse);
  */

  /**
   * Events:
   */
  function handleEvent(evt) {
    debug('XXXXXXXXX Handle Event evt.type' + evt.type);
    switch (evt.type) {
      case 'screenchange':
        screenEnabled = evt.detail.screenEnabled;
        break;
      case 'lock':
        screenLocked = true;
        break;
      case 'unlock':
        screenLocked = false;
        break;
    }
  };
  window.addEventListener('screenchange', handleEvent);
  window.addEventListener('lock', handleEvent);
  window.addEventListener('unlock', handleEvent);

  nfc.init();

  /**
   * Local functions
   */

  function launchBrowser(url) {
    var a = new MozActivity({
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    });
  }

  function launchAddContact(vcard) {
    var a = new MozActivity({
      name: 'new',
      data: {
        type: 'webcontacts/contact',
        params: {
          'tel': vcard.tel,
          'email': vcard.email,
          'address': vcard.address,
          'note': vcard.note,
          'giveName': vcard.givenName,
          'familyName': vcard.familyName,
          'company': vcard.company
        }
      }
    });
  }

  function launchDialer(record) {
    var number = record.payload.substring(1);
    var a = new MozActivity({
      name: 'nfc-ndef-discovered',
      data: {
        type: 'webtelephony/number',
        number: number,
        record: [record]
      }
    });
  }

  // An Ndef Message is an array of one or more Ndef tags.
  function handleNdefMessages(ndefmessages) {
    var action = new Array();

    for (var i = 0; i < ndefmessages.length; i++) {
      var record = ndefmessages[i];
      var handle = null;
      debug('RECORD: ' + JSON.stringify(record));

      switch (+record.tnf) {
        case nfc.tnf_empty:
          handle = handleEmpty(record);
          break;
        case nfc.tnf_well_known:
          handle = handleWellKnownRecord(record);
          break;
        case nfc.tnf_absolute_uri:
          handle = handleURIRecord(record);
          break;
        case nfc.tnf_mime_media:
          handle = handleMimeMedia(record);
          break;
        case nfc.tnf_external_type:
          handle = handleExternalType(record);
          break;
        case nfc.tnf_unknown:
        case nfc.tnf_unchanged:
        case nfc.tnf_reserved:
        default:
          debug('Unknown or unimplemented tnf or rtd subtype.');
          break;
      }
      if (handle) {
        action.push(handle);
      }
    }
    if (action.length <= 0) {
      debug('XX Found no ndefmessage actions. XX');
      return null;
    }
    return action;
  }

  /**
   * Tags, and fallback tag handling.
   */
  function acceptNfcEvents() {
    // Policy:
    if (screenEnabled && !screenLocked) {
      return true;
    } else {
      return false;
    }
  }

  function handleNdefDiscovered() {
    var handled = false;

    var req = window.navigator.mozNfc.ndefRead();
    debug('System read 1:');
    req.onsuccess = function() {
      debug('System read 2: ' + JSON.stringify(req.result));
      var action = handleNdefMessages(req.result.records);

      if (action.length <= 0) {
        debug('Unimplemented. Handle Unknown type.');
      } else {
        debug('Action: ' + JSON.stringify(action[0]));
        var a = new MozActivity(action[0]);
      }
      handled = true;
    };
    req.onerror = function() {
      debug('Error reading NDEF record');
    };
    return handled;
  }

  // TODO:
  function handleNdefFormattableDiscovered(command) {
    return handleNdefDiscovered(command);
  }

  function handleTechnologyDiscovered(command) {
    debug('TechnologyDiscovered: ' + JSON.stringify(command));

    if (!acceptNfcEvents()) {
      debug('Ignoring NFC technology tag message. Screen state is disabled.');
    }

    // Check for tech types:
    debug('NFC Events accepted');
    debug('command.content.tech: ' + command.content.tech);
    var handled = false;
    var tech = command.content.tech;

    // Tech handling priority:
    for (var i in tech) {
      debug('NFC.js: Here!: ' + i);
      if (tech[i] == 'NDEF') {
          handled = handleNdefDiscovered();
      } else if (tech[i] == 'NFC_A') {
        debug('NFCA unsupported: ' + command.content);
      } else if (tech[i] == 'MIFARE_ULTRALIGHT') {
        debug('MiFare unsupported: ' + command.content);
      } else {
        debug('Unknown or unsupported tag tech type');
      }

      if (handled == true) {
        break;
      }
    }

    if (handled == false) {
      // Fire off activity to whoever is registered to handle a generic binary
      // blob tag (TODO: tagRead).
      var technologyTag = command.content.tag;
      var a = new MozActivity({
        name: 'tag-discovered',
        data: {
          type: 'tag',
          tag: technologyTag
        }
      });
    }
  }

  function handleTechLost(command) {
    debug('Technology Lost: ' + JSON.stringify(command));
    var a = new MozActivity({
      name: 'nfc-tech-lost',
      data: {
        type: 'info',
        message: ''
      }
    });
  }


  /**
   * NDEF parsing functions
   */
  function handleEmpty(record) {
    return {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'empty'
      }
    };
  }

  function handleWellKnownRecord(record) {
    debug('XXXXXXXXXXXXXXXXXXXX HandleWellKnowRecord XXXXXXXXXXXXXXXXXXXX');
    if (record.type == nfc.rtd_text) {
      return handleTextRecord(record);
    } else if (record.type == nfc.rtd_uri) {
      return handleURIRecord(record);
    } else if (record.type == nfc.rtd_smart_poster) {
      return handleSmartPosterRecord(record);
    } else if (record.type == nfc.smartposter_action) {
      return handleSmartPosterAction(record);
    } else {
      console.log('Unknown record type: ' + record.type);
    }
    return null;
  }

  function handleTextRecord(record) {
    var status = record.payload.charCodeAt(0);
    var languageLength = status & nfc.rtd_text_iana_length;
    var language = record.payload.substring(1, languageLength + 1);
    var encoding = status & nfc.rtd_text_encoding;
    var text;
    var encodingString;
    if (encoding == nfc.rtd_text_utf8) {
      text = decodeURIComponent(
        escape(record.payload.substring(languageLength + 1)));
      encodingString = 'UTF-8';
    } else if (encoding == nfc.rtd_text_utf16) {
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
        encoding: encodingString,
        record: [record]
      }
    };
    return activityText;
  }

  function handleURIRecord(record) {
    debug('XXXXXXXXXXXXXXX Handle Ndef URI type XXXXXXXXXXXXXXXX');
    var activityText = null;
    var prefix = nfc.uris[record.payload.charCodeAt(0)];
    if (!prefix) {
      return null;
    }

    if (prefix == 'tel:') {
      // handle special case
      // (FIXME: dialer doesn't currently handle parsing a full ndef message):
      var number = record.payload.substring(1);
      debug('XXXXXXXXXXXXXXX Handle Ndef URI type, TEL XXXXXXXXXXXXXXXX');
      activityText = {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'webtelephony/number',
          number: number,
          uri: prefix + record.payload.substring(1),
          record: [record]
        }
      };
    } else {
      activityText = {
        name: 'nfc-ndef-discovered',
        data: {
          type: 'uri',
          rtd: record.type,
          uri: prefix + record.payload.substring(1),
          record: [record]
        }
      };
    }
    return activityText;
  }

  function handleMimeMedia(record) {
    var type = 'mime-media';
    var activityText = null;

    debug('XXXXXXXXXXXXXXXXXXXX HandleMimeMedia XXXXXXXXXXXXXXXXXXXX');
    if (record.type == 'text/vcard') {
      activityText = handleVCardRecord(record);
    } else {
      activityText = {
        name: 'nfc-ndef-discovered',
        data: {
          type: record.type,
          record: [record]
        }
      };
    }
    return activityText;
  }



  function findKey(key, payload) {
    var p = payload.indexOf(key);
    var value = null;
    debug('Key: ' + key + ', At position: ' + p);
    if (p >= 0) {
      value = payload.substring(p + key.length);
      value = value.substring(0, value.indexOf('\n'));
    }
    debug('Value: ' + value);
    return value;
  }

  // FIXME, incomplete mapping/formatting. App (or full featured vcard parser
  // library should parse the full ndef vcard.
  // VCARD 2.1:
  function handleVCardRecord(record) {
    var vcard = {};
    var payload = record.payload;
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
    var fn = findKey('FN:', payload);
    var n = findKey('N:', payload);
    var p = fn.indexOf(' ');
    var first = null;
    var last = null;
    if (p == 0) {
      var first = fn.substring(0, fn.indexOf(' '));
    } else {
      var first = fn.substring(0, fn.indexOf(' '));
      var last = fn.substring(fn.indexOf(' ') + 1);
    }

    var nickname = findKey('NICKNAME:', payload);
    var photo = findKey('PHOTO:', payload);
    var cell = findKey('TEL;TYPE:cell:', payload);
    var tel = findKey('TEL:', payload);
    var email = findKey('EMAIL:', payload);
    var note = findKey('NOTE:', payload);
    var address = findKey('ADR;HOME:', payload);
    var company = findKey('ADR;WORK:', payload);

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
        params: vcard,
        record: [record]
      }
    };
    return activityText;
  }

  function handleExternalType(record) {
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'external-type',
        rtd: record.type,
        record: [record]
      }
    };
    return activityText;
  }

  // Smartposters can be multipart NDEF messages.
  // The meaning and actions are application dependent.
  function handleSmartPosterRecord(record) {
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'smart-poster',
        record: [record]
      }
    };
    return activityText;
  }

  function handleSmartPosterAction(record) {
    // The recommended action has an application specific meaning:
    var smartaction = record.payload.charCodeAt(0);
    var activityText = {
      name: 'nfc-ndef-discovered',
      data: {
        type: 'smartposter-action',
        action: smartaction,
        record: [record]
      }
    };
    return activityText;
  }

})();
