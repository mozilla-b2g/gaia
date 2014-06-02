/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals dump, MozNDEFRecord, NDEF, NfcUtils */
/* exported NDEFUtils */
'use strict';


/*******************************************************************************
 * NDEFUtils offers a set of utility functions to handle NDEF messages
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
var NDEFUtils = {

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
   * Parses Bluetooth MAC-48 address.
   *
   * @param   {String}  MAC address.
   * @returns {Array}   Array of six numbers representing MAC or null
   *                    if it was not valid.
   */
  parseMAC: function parseMAC(mac) {
    if (!mac || !/^([0-9A-F]{2}:){6}$/i.test(mac + ':')) {
      return null;
    }

    var macVals = mac.split(':');

    var m = [];
    for (var i = 5; i >= 0; i -= 1) {
      m.push(parseInt(macVals[i], 16));
    }

    return m;
  },

  /**
   * According to [CH] (Connection Handover Technical Specification),
   * CPS can be one of the following:
   *  - 0 - Inactive
   *  - 1 - Active
   *  - 2 - Activating
   *  - 3 - Unknown
   *
   * @params {Integer} cps Carrier Power State
   * @returns {Boolean} True when cps valid. False otherwise.
   */
  validateCPS: function validateCPS(cps) {
    var allowedValues = [NDEF.CPS_INACTIVE, NDEF.CPS_ACTIVE,
                         NDEF.CPS_ACTIVATING, NDEF.CPS_UNKNOWN];
    return (allowedValues.indexOf(cps) >= 0);
  },

  /**
   * Returns a Bluetooth Handover Request message. This method DOES
   * NOT implement a full set of arguments as defined in
   * NFCForum-AD-BTSSP_1.0.1.
   *
   * First record is a Handover Request Record (type="Hr"). It
   * contains CPS and 2-byte random value used for collision detection
   * (autogenerated).
   *
   * Second record contains Bluetooth OOB data. For explanation,
   * @see encodeHandoverSelect() and specification.
   *
   * @param {String}      mac           MAC address, ie.: "01:23:45:67:89:AB".
   * @param {Integer}     cps           Carrier Power State.
   * @returns {Array} NDEF records for handover select message.
   *
   */
  encodeHandoverRequest: function encodeHandoverRequest(mac, cps) {
    var m = this.parseMAC(mac);
    if (!m) {
      this.debug('Invalid BT MAC address: ' + mac);
      return null;
    }

    if (!this.validateCPS(cps)) {
      this.debug('Invalid CPS: ' + cps);
      return null;
    }

    var rndMSB = Math.floor(Math.random() * 0xff) & 0xff;
    var rndLSB = Math.floor(Math.random() * 0xff) & 0xff;

    var OOBLength = 2 + m.length;
    var OOB = [OOBLength, 0].concat(m);

    // Payload ID
    var pid = NfcUtils.fromUTF8('0');

    var hr = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                NDEF.RTD_HANDOVER_REQUEST,
                                new Uint8Array([]),
                                new Uint8Array([0x12, 0x91, 0x02, 0x02, 0x63,
                                                0x72, rndMSB, rndLSB, 0x51,
                                                0x02, 0x04, 0x61, 0x63, cps,
                                                0x01, pid[0], 0x00])),
              new MozNDEFRecord(NDEF.TNF_MIME_MEDIA,
                                NfcUtils.fromUTF8(
                                  'application/vnd.bluetooth.ep.oob'),
                                pid,
                                new Uint8Array(OOB))];
    return hr;
  },

  /**
   * Returns a Bluetooth Handover Select message. This method
   * DOES NOT implement the full spec as defined in
   * NFCForum-AD-BTSSP_1.0.1. In particular, this method supports
   * only Bluetooth device MAC address and Local Name in the Bluetooth
   * Carrier Configuration Record.
   *
   * First record is Handover Select Record (type="Hs"). It contains,
   * among other things, the CPS (Carrier Power State).
   *
   * Second record of this message contains Bluetooth Out of Band (OOB) data.
   * It contains following fields:
   *  - [2 octets] OOB Data Length - Mandatory. Total length of OOB data,
   *                                 including this field itself.
   *  - [6 octets] BT Device Address - Mandatory. BT device address (MAC).
   *  - [N octets] OOB Optional Data - The remaining data in EIR format.
   *                                   This method supports only device name
   *                                   here.
   *
   * EIR data, as of this implementation, is optional. It will be ommited
   * if you do not pass btDeviceName parameter. If you do, OOB Optional
   * Data will be in a form:
   *   - [1  octet] EIR Data Length   - Does not include this field.
   *   - [1  octet] EIR Data Type     - only 0x09 (BT Local Name) supported.
   *   - [N octets] Contents          - BT Local Name
   *
   * @param {String}      mac           MAC address, ie.: "01:23:45:67:89:AB".
   * @param {Integer}     cps           Carrier Power State.
   * @param {UInt8Array}  btDeviceName  Optional, user-friendly name
   *                                    of Bluetooth device.
   * @returns {Array} NDEF records for handover select message.
   *
   */
  encodeHandoverSelect: function encodeHandoverSelect(mac, cps, btDeviceName) {
    var m = this.parseMAC(mac);
    if (!m) {
      this.debug('Invalid BT MAC address: ' + mac);
      return null;
    }

    if (!this.validateCPS(cps)) {
      this.debug('Invalid CPS: ' + cps);
      return null;
    }

    // OOB Data Length
    var OOBLength = 2 + m.length;

    // OOB = [Data Length | BT Device Address]
    var OOB = [OOBLength, 0].concat(m);

    // If btDeviceName supplied, attach EIR with it as OOB Optional Data
    // and update OOB Data Length accordingly.
    if (btDeviceName) {
      var EIRLength = 1 + btDeviceName.length;
      OOB[0] += EIRLength + 1;
      OOB = OOB.concat(EIRLength, 0x09, Array.apply([], btDeviceName));
    }

    // Payload ID
    var pid = NfcUtils.fromUTF8('0');

    var hs = [new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                NDEF.RTD_HANDOVER_SELECT,
                                new Uint8Array([]),
                                new Uint8Array([0x12, 0xD1, 0x02, 0x04,
                                                0x61, 0x63, cps, 0x01,
                                                pid[0], 0x00])),
              new MozNDEFRecord(NDEF.TNF_MIME_MEDIA,
                                NfcUtils.fromUTF8(
                                  'application/vnd.bluetooth.ep.oob'),
                                pid,
                                new Uint8Array(OOB))];

    return hs;
  }
};
