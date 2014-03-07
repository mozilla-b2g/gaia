/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals dump, MozNDEFRecord, NDEF, NfcUtils */
/* exported NfcManagerUtils */
'use strict';


/*******************************************************************************
 * NfcManagerUtils offers a set of utility functions to handle NDEF messages
 * according to NFCForum-TS-NDEF_1.0. It exports the following functions:
 *
 * - parseHandoverNDEF: parse a NDEF message that represents a handover request
 *         or a handover select message
 * - searchForBluetoothAC: search for a Bluetooth Alternate Carrier in a
 *         handover NDEF message
 * - parseBluetoothSSP: Parses a Carrier Data Record that contains a
 *         Bluetooth Secure Simple Pairing record
 * - encodeHandoverRequest: returns a NDEF message that contains a handover
 *         request message
 * - encodeHandoverSelect: returns a NDEF message that contains a handover
 *         select message
 */
var NfcManagerUtils = {

  DEBUG: false,

  /*****************************************************************************
   *****************************************************************************
   * Utility functions/classes
   *****************************************************************************
   ****************************************************************************/

  /**
   * Debug method
   */
  debug: function debug(msg, optObject) {
    if (this.DEBUG) {
      var output = '[DEBUG] SYSTEM NFC-MANAGER-UTIL: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      if (typeof dump !== 'undefined') {
        dump(output);
      } else {
        console.log(output);
      }
    }
  },

  /**
   * parseHandoverNDEF(): parse a NDEF message containing a handover message.
   * 'ndefMsg' is an Array of MozNDEFRecord. Only 'Hr' and 'Hs' records are
   * parsed (NFCForum-TS-ConnectionHandover_1_2.doc)
   * The result is an object with the following attributes:
   *   - type: either 'Hr' (Handover Request) or 'Hs' (Handover Select)
   *   - majorVersion
   *   - minorVersion
   *   - cr: Collision resolution value. This value is only present
   *         for a 'Hr' record
   *   - ac: Array of Alternate Carriers. Each object of this array has
   *         the following attributes:
   *           - cps: Carrier Power State
   *           - cdr: Carrier Data Record: MozNDEFRecord containing further
   *                  info
   */
  parseHandoverNDEF: function parseHandoverNDEF(ndefMsg) {
    try {
      return this.doParseHandoverNDEF(ndefMsg);
    } catch (err) {
      this.debug(err);
      return null;
    }
  },

  doParseHandoverNDEF: function doParseHandoverNDEF(ndefMsg) {
    var record = ndefMsg[0];
    var buffer = NfcUtils.createBuffer(record.payload);
    var h = {};
    var version = buffer.getOctet();
    h.majorVersion = version >>> 4;
    h.minorVersion = version & 0x0f;
    h.ac = [];

    var embeddedNdef = NfcUtils.parseNDEF(buffer);
    if (embeddedNdef == null) {
      throw 'Could not parse embedded NDEF in Hr/Hs record';
    }

    if (record.tnf != NDEF.TNF_WELL_KNOWN) {
      throw 'Expected Well Known TNF in Hr/Hs record';
    }

    if (NfcUtils.equalArrays(record.type,
        NDEF.RTD_HANDOVER_SELECT)) {
      h.type = 'Hs';
      this.parseAcRecords(h, ndefMsg, embeddedNdef, 0);
    } else if (NfcUtils.equalArrays(record.type,
               NDEF.RTD_HANDOVER_REQUEST)) {
      h.type = 'Hr';
      var crr = embeddedNdef[0];
      if (!NfcUtils.equalArrays(crr.type,
          NDEF.RTD_COLLISION_RESOLUTION)) {
        throw 'Expected Collision Resolution Record';
      }
      if (crr.payload.length != 2) {
        throw 'Expected random number in Collision Resolution Record';
      }
      h.cr = (crr.payload[0] << 8) | crr.payload[1];
      this.parseAcRecords(h, ndefMsg, embeddedNdef, 1);
    } else {
      throw 'Can only handle Hr and Hs records for now';
    }
    return h;
  },

  parseAcRecords: function parseAcRecords(h, ndef, acNdef, offset) {
    for (var i = offset; i < acNdef.length; i++) {
      var record = acNdef[i];
      if (NfcUtils.equalArrays(record.type,
          NDEF.RTD_ALTERNATIVE_CARRIER)) {
        h.ac.push(this.parseAC(record.payload, ndef));
      } else {
        throw 'Can only parse AC record within Hs';
      }
    }
  },

  parseAC: function parseAC(ac, ndef) {
    var b = NfcUtils.createBuffer(ac);
    var ac2 = {};
    ac2.cps = b.getOctet() & 0x03;
    var cdrLen = b.getOctet();
    var cdr = b.getOctetArray(cdrLen);
    ac2.cdr = this.findNdefRecordWithId(cdr, ndef);
    return ac2;
  },

  findNdefRecordWithId: function findNdefRecordWithId(id, ndef) {
    for (var i = 0; i < ndef.length; i++) {
      var record = ndef[i];
      if (NfcUtils.equalArrays(id, record.id)) {
        return record;
      }
    }
    throw 'Could not find record with id';
  },

  /**
   * searchForBluetoothAC(): searches a Handover message for an
   * Alternative Carrier that contains a Bluetooth profile.
   * Parameter 'h' is the result of the parse() function.
   * Returns null if no Bluetooth AC could be found, otherwise
   * returns a MozNDEFRecord.
   */
  searchForBluetoothAC: function searchForBluetoothAC(h) {
    for (var i = 0; i < h.ac.length; i++) {
      var cdr = h.ac[i].cdr;
      if (cdr.tnf == NDEF.TNF_MIME_MEDIA) {
        var mimeType = NfcUtils.toUTF8(cdr.type);
        if (mimeType == 'application/vnd.bluetooth.ep.oob') {
          return cdr;
        }
      }
    }
    return null;
  },

  /**
   * parseBluetoothSSP(): Parses a Carrier Data Record that contains a
   * Bluetooth Secure Simple Pairing record (NFCForum-AD-BTSSP_1.0).
   * 'cdr': Carrier Data Record. Returns an object with the following
   * attributes:
   *   - mac: MAC address (string representation)
   *   - localName: Local name (optional)
   */
  parseBluetoothSSP: function parseBluetoothSSP(cdr) {
    var btssp = {};
    var buf = NfcUtils.createBuffer(cdr.payload);
    var mac = '';
    var btsspLen = 0;

    btsspLen = buf.getOctet() | (buf.getOctet() << 8);
    for (var i = 0; i < 6; i++) {
      if (mac.length > 0) {
        mac = ':' + mac;
      }
      var o = buf.getOctet();
      mac = o.toString(16).toUpperCase() + mac;
      if (o < 16) {
        mac = '0' + mac;
      }
    }
    btssp.mac = mac;
    while (buf.offset != cdr.payload.length) {
      // Read OOB value
      var len = buf.getOctet() - 1 /* 'len' */;
      var type = buf.getOctet();
      switch (type) {
      case 0x08:
      case 0x09:
        // Local name
        var n = buf.getOctetArray(len);
        btssp.localName = NfcUtils.toUTF8(n);
        break;
      default:
        // Ignore OOB value
        buf.skip(len);
        break;
      }
    }
    return btssp;
  },

  /**
   * encodeHandoverRequest(): returns a NDEF message containing a Handover
   * Request. Only a Bluetooth AC will be added to the Handover Request.
   * 'mac': MAC address (string). 'cps': Carrier Power State.
   * 'rnd': Random value for collision resolution
   */
  encodeHandoverRequest: function encodeHandoverRequest(mac, cps, rnd) {
    var macVals = mac.split(':');
    if (macVals.length != 6) {
      return null;
    }
    var m = [];
    for (var i = 5; i >= 0; i--) {
      m.push(parseInt(macVals[i], 16));
    }
    var rndLSB = rnd & 0xff;
    var rndMSB = rnd >>> 8;
    var hr = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                NDEF.RTD_HANDOVER_REQUEST,
                                new Uint8Array([]),
                                new Uint8Array([18, 145, 2, 2, 99, 114,
                                                rndMSB, rndLSB, 81, 2, 4, 97,
                                                99, cps, 1, 98, 0])),
              new MozNDEFRecord(2,
                                new Uint8Array([97, 112, 112, 108, 105, 99,
                                                97, 116, 105, 111, 110, 47,
                                                118, 110, 100, 46, 98, 108,
                                                117, 101, 116, 111, 111, 116,
                                                104, 46, 101, 112, 46, 111,
                                                111, 98]),
                                new Uint8Array([98]),
                                new Uint8Array([8, 0, m[0], m[1], m[2], m[3],
                                                m[4], m[5]]))];
    return hr;
  },

  /**
   * encodeHandoverSelect(): returns a NDEF message containing a Handover
   * Select. Only a Bluetooth AC will be added to the Handover Select.
   * 'mac': MAC address (string). 'cps': Carrier Power State.
   * 'cps': Carrier Power State
   */
  encodeHandoverSelect: function encodeHandoverSelect(mac, cps) {
    var macVals = mac.split(':');
    if (macVals.length != 6) {
      return null;
    }
    var m = [];
    for (var i = 5; i >= 0; i--) {
      m.push(parseInt(macVals[i], 16));
    }
    var hs = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                NDEF.RTD_HANDOVER_SELECT,
                                new Uint8Array([]),
                                new Uint8Array([0x12, 0xD1, 0x02, 0x04, 0x61,
                                              0x63, cps, 0x01, 0x30, 0x00])),
              new MozNDEFRecord(NDEF.TNF_MIME_MEDIA,
                                new Uint8Array([97, 112, 112, 108, 105, 99,
                                                97, 116, 105, 111, 110, 47,
                                                118, 110, 100, 46, 98, 108,
                                                117, 101, 116, 111, 111, 116,
                                                104, 46, 101, 112, 46, 111,
                                                111, 98]),
                                new Uint8Array([0x30]),
                                new Uint8Array([8, 0, m[0], m[1], m[2], m[3],
                                                m[4], m[5]]))];
    return hs;
  }
};
