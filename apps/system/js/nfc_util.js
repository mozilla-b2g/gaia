/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

'use strict';


/*******************************************************************************
 * NfcUtil offers a set of utility functions to handle NDEF messages according
 * to NFCForum-TS-NDEF_1.0. It exports the following functions:
 *
 * - parseNDEF: parse an NDEF message
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
var NfcUtil = {

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
      var output = '[DEBUG] SYSTEM NFC-UTIL: ' + msg;
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

  fromUTF8: function fromUTF8(str) {
    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },

  equalArrays: function equalArrays(a1, a2) {
    if (a1.length != a2.length) {
      return false;
    }
    for (var i = 0; i < a1.length; i++) {
      if (a1[i] != a2[i]) {
        return false;
      }
    }
    return true;
  },

  toUTF8: function toUTF8(a) {
    var str = '';
    for (var i = 0; i < a.length; i++) {
      str += String.fromCharCode(a[i]);
    }
    return str;
  },

  /*****************************************************************************
   * NdefConsts: some NDEF-related constants as defined by the NFC Forum.
   */
  NdefConsts: {
    MB: 1 << 7,
    ME: 1 << 6,
    CF: 1 << 5,
    SR: 1 << 4,
    IL: 1 << 3,
    TNF: 0x07,

    tnf_well_known: 0x01,
    tnf_mime_media: 0x02,

    rtd_alternative_carrier: 0,
    rts_collision_resolution: 0,
    rtd_handover_carrier: 0,
    rtd_handover_request: 0,
    rtd_handover_select: 0
  },

  init: function init() {
    this.NdefConsts.rtd_alternative_carrier = this.fromUTF8('ac');
    this.NdefConsts.rtd_collision_resolution = this.fromUTF8('cr');
    this.NdefConsts.rtd_handover_carrier = this.fromUTF8('Hc');
    this.NdefConsts.rtd_handover_request = this.fromUTF8('Hr');
    this.NdefConsts.rtd_handover_select = this.fromUTF8('Hs');
  },

  /*****************************************************************************
   * createBuffer: returns a helper object that makes it easier to read from a
   * Uint8Array.
   * @param {Uint8Array} uint8array The Uint8Array instance to wrap.
   */
  createBuffer: function createBuffer(uint8array) {
    function Buffer(uint8array) {
      /*
       * It is weird that the uint8array parameter (which is of type Uint8Array)
       * needs to be wrapped in another Uint8Array instance. Running the code
       * with node.js does not require this, but when running it is Gaia it will
       * later complain that subarray is not a function when the parameter is
       * not wrapped.
       */
      this.uint8array = new Uint8Array(uint8array);
      this.offset = 0;
    }

    Buffer.prototype.getOctet = function getOctet() {
      if (this.offset == this.uint8array.length) {
        throw 'Buffer too small';
      }
      return this.uint8array[this.offset++];
    };

    Buffer.prototype.getOctetArray = function getOctetArray(len) {
      if (this.offset + len > this.uint8array.length) {
        throw 'Buffer too small';
      }
      var a = this.uint8array.subarray(this.offset, this.offset + len);
      this.offset += len;
      return a;
    };

    Buffer.prototype.skip = function skip(len) {
      if (this.offset + len > this.uint8array.length) {
        throw 'Buffer too small';
      }
      this.offset += len;
    };

    return new Buffer(uint8array);
  },

  /**
   * parseNDEF(): parses a NDEF message contained in a Buffer instance.
   * (NFCForum-TS-NDEF_1.0)
   * Usage:
   *   var buf = new Buffer(<Uint8Array that contains the raw NDEF message>);
   *   var ndef = NdefCodec.parse(buf);
   *
   * 'null' is returned if the message could not be parsed. Otherwise the
   * result is an array of MozNDEFRecord instances.
   */
  parseNDEF: function parseNDEF(buffer) {
    try {
      return this.doParseNDEF(buffer);
    } catch (err) {
      this.debug(err);
      return null;
    }
  },

  doParseNDEF: function doParseNDEF(buffer) {
    var records = new Array();
    var isFirstRecord = true;
    do {
      var firstOctet = buffer.getOctet();
      if (isFirstRecord && !(firstOctet & this.NdefConsts.MB)) {
        throw 'MB bit not set in first NDEF record';
      }
      if (!isFirstRecord && (firstOctet & this.NdefConsts.MB)) {
        throw 'MB can only be set for the first record';
      }
      if (firstOctet & this.NdefConsts.CF) {
        throw 'Cannot deal with chunked records';
      }
      records.push(this.parseNdefRecord(buffer, firstOctet));
      isFirstRecord = false;
    } while (!(firstOctet & this.NdefConsts.ME));
    return records;
  },

  parseNdefRecord: function parseNdefRecord(buffer, firstOctet) {
    var tnf = firstOctet & this.NdefConsts.TNF;
    var typeLen = buffer.getOctet();
    var payloadLen = buffer.getOctet();
    if (!(firstOctet & this.NdefConsts.SR)) {
      for (var i = 0; i < 3; i++) {
        payloadLen <<= 8;
        payloadLen |= buffer.getOctet();
      }
    }
    var idLen = 0;
    if (firstOctet & this.NdefConsts.IL) {
      idLen = buffer.getOctet();
    }
    var type = buffer.getOctetArray(typeLen);
    var id = buffer.getOctetArray(idLen);
    var payload = buffer.getOctetArray(payloadLen);
    return new MozNDEFRecord(tnf, type, id, payload);
  },

  /**
   * parseHandoverNDEF(): parse a NDEF message containing a handover message.
   * 'ndefMsg' is an Array of MozNDEFRecord. Only 'Hr' and 'Hs' records are
   * parsed (NFCForum-TS-ConnectionHandover_1_2.doc)
   * The result is an object with the following attributes:
   *   - type: either 'Hr' (Handover Request) or 'Hs' (Handover Select)
   *   - majorVersion
   *   - minorVersion
   *   - cr: Collision resolution value. Tthis value is only present
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
    var buffer = this.createBuffer(record.payload);
    var h = {};
    var version = buffer.getOctet();
    h.majorVersion = version >>> 4;
    h.minorVersion = version & 0x0f;
    h.ac = [];

    var embeddedNdef = this.parseNDEF(buffer);
    if (embeddedNdef == null) {
      throw 'Could not parse embedded NDEF in Hr/Hs record';
    }

    if (record.tnf != this.NdefConsts.tnf_well_known) {
      throw 'Expected Well Known TNF in Hr/Hs record';
    }

    if (this.equalArrays(record.type,
        this.NdefConsts.rtd_handover_select)) {
      h.type = 'Hs';
      this.parseAcRecords(h, ndefMsg, embeddedNdef, 0);
    } else if (this.equalArrays(record.type,
               this.NdefConsts.rtd_handover_request)) {
      h.type = 'Hr';
      var crr = embeddedNdef[0];
      if (!this.equalArrays(crr.type,
          this.NdefConsts.rtd_collision_resolution)) {
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
      if (this.equalArrays(record.type,
          this.NdefConsts.rtd_alternative_carrier)) {
        h.ac.push(this.parseAC(record.payload, ndef));
      } else {
        throw 'Can only parse AC record within Hs';
      }
    }
  },

  parseAC: function parseAC(ac, ndef) {
    var b = this.createBuffer(ac);
    var ac = {};
    ac.cps = b.getOctet() & 0x03;
    var cdrLen = b.getOctet();
    var cdr = b.getOctetArray(cdrLen);
    ac.cdr = this.findNdefRecordWithId(cdr, ndef);
    return ac;
  },

  findNdefRecordWithId: function findNdefRecordWithId(id, ndef) {
    for (var i = 0; i < ndef.length; i++) {
      var record = ndef[i];
      if (this.equalArrays(id, record.id)) {
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
      if (cdr.tnf == this.NdefConsts.tnf_mime_media) {
        var mimeType = this.toUTF8(cdr.type);
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
    var buf = this.createBuffer(cdr.payload);
    var btsspLen = buf.getOctet() | (buf.getOctet() << 8);
    var mac = '';
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
        btssp.localName = this.toUTF8(n);
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
    var m = new Array();
    for (var i = 5; i >= 0; i--) {
      m.push(parseInt(macVals[i], 16));
    }
    var rndLSB = rnd & 0xff;
    var rndMSB = rnd >>> 8;
    var hr = [new MozNDEFRecord(this.NdefConsts.tnf_well_known,
                                this.NdefConsts.rtd_handover_request,
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
    var m = new Array();
    for (var i = 5; i >= 0; i--) {
      m.push(parseInt(macVals[i], 16));
    }
    var hs = [new MozNDEFRecord(this.NdefConsts.tnf_well_known,
                                this.NdefConsts.rtd_handover_select,
                                new Uint8Array([]),
                                new Uint8Array([0x12, 0xD1, 0x02, 0x04, 0x61,
                                              0x63, cps, 0x01, 0x30, 0x00])),
              new MozNDEFRecord(this.NdefConsts.tnf_mime_media,
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

NfcUtil.init();
