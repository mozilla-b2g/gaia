/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals MozNDEFRecord, NDEF, NfcUtils, NfcBuffer */
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
  _debug: function _debug(msg, optObject) {
    if (this.DEBUG) {
      this._logVisibly(msg, optObject);
    }
  },

  _logVisibly: function _logVisibly(msg, optObject) {
    var output = '[NDEFUtils]: ' + msg;
    if (optObject) {
      output += JSON.stringify(optObject);
    }
    console.log(output);
  },

   /**
   * Parse Handover Request NDEF message. Only 'Hr' and 'Hs' records
   * are supported (NFCForum-TS-ConnectionHandover_1_2.doc).
   *
   * Returns handover object similar to:
   * {
   *   majorVersion: 1,
   *   minorVersion: 2,
   *   type: 'Hr'         // or 'Hs'
   *   cr: 123            // 'Hr' only
   *   ac: [              // Array of BT OOB records
   *     {
   *       cps: 1,
   *       cdr: ...       // MozNDEFRecord with details, i.e.
   *     },               // Bluetooth MAC address.
   *     ...
   *   ]
   * }
   *
   * @param {Array} ndefMsg NDEF message (array of MozNDEFRecords)
   * @return {Object} Parsed handover request or null if ndefMsg
   *                  was not valid or well formatted.
   */
  parseHandoverNDEF: function parseHandoverNDEF(ndefMsg) {
    try {
      return this._doParseHandoverNDEF(ndefMsg);
    } catch (err) {
      this._logVisibly(err);
      return null;
    }
  },

  _doParseHandoverNDEF: function doParseHandoverNDEF(msg) {
    var nfcUtils = new NfcUtils();
    var hRecordBuffer = new NfcBuffer(msg[0].payload);
    var version = hRecordBuffer.getOctet();

    var h = {
      majorVersion: version >>> 4,
      minorVersion: version & 0x0f,
      type: nfcUtils.toUTF8(msg[0].type),
      ac: []
    };

    if (msg[0].tnf !== NDEF.TNF_WELL_KNOWN) {
      throw Error('Expected Well Known TNF in Hs/Hr record');
    }

    if (['Hs', 'Hr'].indexOf(h.type) < 0) {
      throw Error('Record "' + h.type + '" not supported.');
    }

    var hRecord = nfcUtils.parseNDEF(hRecordBuffer);
    if (!hRecord) {
      throw Error('Could not parse embedded NDEF in Hr/Hs record');
    }

    if (hRecordBuffer.offset < msg[0].payload.length) {
      throw Error('Embedded NDEF payload contains extraneous bytes');
    }

    for (var i = 0; i < hRecord.length; i += 1) {
      var type = nfcUtils.toUTF8(hRecord[i].type);
      if ('ac' === type) {
        h.ac.push(this._parseAlternativeCarrier(hRecord[i].payload, msg));
      } else if ('cr' === type) {
        h.cr = this._parseCollisionResolution(hRecord[i].payload);
      }
    }

    // Make sure collision resolution record is present
    // in Hr message.
    if ('Hr' === h.type && !h.cr) {
      throw Error('Collision resolution record missing');
    }

    return h;
  },

  _parseAlternativeCarrier: function _parseAlternativeCarrier(bytes, msg) {
    var nfcUtils = new NfcUtils();
    var b = new NfcBuffer(bytes);
    var ac = {
      cps: b.getOctet() & 0x03
    };

    var recordId = b.getOctetArray(b.getOctet());
    ac.cdr = msg.filter(function(record) {
      return nfcUtils.equalArrays(record.id, recordId);
    }.bind(this))[0];

    if (!ac.cdr) {
      throw Error('Could not find record with given id');
    }

    return ac;
  },

  _parseCollisionResolution: function _parseCollisionResolution(bytes) {
    if (bytes.length !== 2) {
      throw Error('Expected random number in Collision Resolution Record');
    }

    return (bytes[0] << 8) | bytes[1];
  },

   /**
    * Returns first record from handover message which
    * contains Bluetooth OOB (Out of Band) data.
    *
    * @param {Array} h Handover message (array of records).
    * @return {Object} MozNDEFRecord with Bluetooth OOB.
    */
  searchForBluetoothAC: function searchForBluetoothAC(h) {
    var nfcUtils = new NfcUtils();
    for (var i = 0; i < h.ac.length; i++) {
      var cdr = h.ac[i].cdr;
      if (cdr.tnf === NDEF.TNF_MIME_MEDIA) {
        if (nfcUtils.equalArrays(cdr.type, NDEF.MIME_BLUETOOTH_OOB)) {
          return cdr;
        }
      }
    }
    return null;
  },

  /**
   * Parses a Carrier Data Record according to NFCForum-AD-BTSSP_1.0.
   * This method will parse MAC address. In addition to that, it will
   * parse, if found in EIR data, Bluetooth Local Name. Other EIR fields
   * are currently unsupported.
   *
   * @param {Object} cdr Carrier Data Record. It's payload field should
   *                     contain Bluetooth OOB data.
   * @returns {Object} Parsed record. Will always contain 'mac' property.
   *                   If BT local name was present in cdr, will also have
   *                   'localName' property. Null if cdr was invalid.
   */
  parseBluetoothSSP: function parseBluetoothSSP(cdr) {
    var nfcUtils = new NfcUtils();
    if (!cdr || !cdr.payload || cdr.payload.length < 8) {
      return null;
    }

    var btssp = {};
    var buf = new NfcBuffer(cdr.payload);

    var btsspLen = buf.getOctet() | (buf.getOctet() << 8);
    if (cdr.payload.length !== btsspLen) {
      this._debug('Invalid BT SSP record. Length indicated:' +
        btsspLen + ', actual length: ' + cdr.payload.length);
      return null;
    }

    btssp.mac = this.formatMAC(buf.getOctetArray(6));

    while (buf.offset != cdr.payload.length) {
      // Read OOB value
      var len = buf.getOctet() - 1 /* 'len' */;
      var type = buf.getOctet();

      if (buf.offset + len > buf.uint8array.length) {
        this._debug('EIR field ' + type + ' indicated length=' +
          len + ', but only ' + (buf.uint8array.length - buf.offset) +
          ' characters left in buffer.');
        return null;
      }

      switch (type) {
      case 0x08:
      case 0x09:
        // Local name
        var n = buf.getOctetArray(len);
        btssp.localName = nfcUtils.toUTF8(n);
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
   * Formats MAC address as a MAC-48 string (colon-separated).
   *
   * @param   {Array}   Array of six numbers representing MAC.
   * @returns {String}  MAC address.
   */
  formatMAC: function formatMAC(mac) {
    if (!mac || mac.length !== 6) {
      return null;
    }

    var res = [];
    for (var i = 0; i < 6; i += 1) {
      var m = mac[i].toString(16);
      res.unshift(m.length === 1 ? '0' + m : m);
    }

    return res.join(':').toUpperCase();
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
    var nfcUtils = new NfcUtils();
    var m = this.parseMAC(mac);
    if (!m) {
      this._debug('Invalid BT MAC address: ' + mac);
      return null;
    }

    if (!this.validateCPS(cps)) {
      this._debug('Invalid CPS: ' + cps);
      return null;
    }

    var rndMSB = Math.floor(Math.random() * 0xff) & 0xff;
    var rndLSB = Math.floor(Math.random() * 0xff) & 0xff;

    var OOBLength = 2 + m.length;
    var OOB = [OOBLength, 0].concat(m);

    // Payload ID
    var pid = nfcUtils.fromUTF8('0');

    var hr = [
      new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                         type: NDEF.RTD_HANDOVER_REQUEST,
                         payload: new Uint8Array([0x12, 0x91, 0x02, 0x02, 0x63,
                           0x72, rndMSB, rndLSB, 0x51, 0x02, 0x04, 0x61, 0x63,
                           cps, 0x01, pid[0], 0x00])}),
      new MozNDEFRecord({tnf: NDEF.TNF_MIME_MEDIA,
                         type: NDEF.MIME_BLUETOOTH_OOB,
                         id: pid,
                         payload: new Uint8Array(OOB)})];
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
    var nfcUtils = new NfcUtils();
    var m = this.parseMAC(mac);
    if (!m) {
      this._debug('Invalid BT MAC address: ' + mac);
      return null;
    }

    if (!this.validateCPS(cps)) {
      this._debug('Invalid CPS: ' + cps);
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
    var pid = nfcUtils.fromUTF8('0');

    var hs = [new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                 type: NDEF.RTD_HANDOVER_SELECT,
                                 payload: new Uint8Array(
                                  [0x12, 0xD1, 0x02, 0x04, 0x61, 0x63, cps,
                                   0x01, pid[0], 0x00])}),
              new MozNDEFRecord({tnf: NDEF.TNF_MIME_MEDIA,
                                 type: NDEF.MIME_BLUETOOTH_OOB,
                                 id: pid,
                                 payload: new Uint8Array(OOB)})];

    return hs;
  },

  /**
   * Returns an empty Handover Select NDEF message (i.e., a Hs message with no
   * AC).
   * @returns {Array} NDEF records for an empty handover select message.
   */
  encodeEmptyHandoverSelect: function encodeEmptyHandoverSelect() {
    var hs = [new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                 type: NDEF.RTD_HANDOVER_SELECT,
                                 payload: new Uint8Array([0x12])})];
    return hs;
  }
};
