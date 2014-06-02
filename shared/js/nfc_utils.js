/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals dump, MozNDEFRecord */
/* exported NDEF, NfcBuffer, NfcUtils */
'use strict';

var NfcUtils; // Pre-declaration for jshint

/*******************************************************************************
 * NDEF (NFC Data Exchange Format)
 */
const NDEF = {
  MB: 1 << 7,
  ME: 1 << 6,
  CF: 1 << 5,
  SR: 1 << 4,
  IL: 1 << 3,

  TNF: 0x07,

  TNF_EMPTY: 0x00,
  TNF_WELL_KNOWN: 0x01,
  TNF_MIME_MEDIA: 0x02,
  TNF_ABSOLUTE_URI: 0x03,
  TNF_EXTERNAL_TYPE: 0x04,
  TNF_UNKNOWN: 0x05,
  TNF_UNCHANGED: 0x06,
  TNF_RESERVED: 0x07,

  RTD_TEXT: 0,
  RTD_URI: 0,
  RTD_SMART_POSTER: 0,
  RTD_ALTERNATIVE_CARRIER: 0,
  RTD_COLLISION_RESOLUTION: 0,
  RTD_HANDOVER_CARRIER: 0,
  RTD_HANDOVER_REQUEST: 0,
  RTD_HANDOVER_SELECT: 0,

  CPS_INACTIVE: 0,
  CPS_ACTIVE: 1,
  CPS_ACTIVATING: 2,
  CPS_UNKNOWN: 3,

  SMARTPOSTER_ACTION: 0,

  // Action Record Values:
  DO_ACTION: 0x00,
  SAVE_FOR_LATER_ACTION: 0x01,
  OPEN_FOR_EDITING_ACTION: 0x02,
  RFU_ACTION: 0x03,  // Reserved from 0x03 to 0xFF

  URIS: [],

  init: function ndef_init() {
    this.RTD_TEXT = NfcUtils.fromUTF8('T');
    this.RTD_URI = NfcUtils.fromUTF8('U');
    this.RTD_SMART_POSTER = NfcUtils.fromUTF8('Sp');
    this.RTD_ALTERNATIVE_CARRIER = NfcUtils.fromUTF8('ac');
    this.RTD_COLLISION_RESOLUTION = NfcUtils.fromUTF8('cr');
    this.RTD_HANDOVER_CARRIER = NfcUtils.fromUTF8('Hc');
    this.RTD_HANDOVER_REQUEST = NfcUtils.fromUTF8('Hr');
    this.RTD_HANDOVER_SELECT = NfcUtils.fromUTF8('Hs');

    this.SMARTPOSTER_ACTION = NfcUtils.fromUTF8('act');

    this.URIS[0x00] = '';
    this.URIS[0x01] = 'http://www.';
    this.URIS[0x02] = 'https://www.';
    this.URIS[0x03] = 'http://';
    this.URIS[0x04] = 'https://';
    this.URIS[0x05] = 'tel:';
    this.URIS[0x06] = 'mailto:';
    this.URIS[0x07] = 'ftp://anonymous:anonymous@';
    this.URIS[0x08] = 'ftp://ftp.';
    this.URIS[0x09] = 'ftps://';
    this.URIS[0x0A] = 'sftp://';
    this.URIS[0x0B] = 'smb://';
    this.URIS[0x0C] = 'nfs://';
    this.URIS[0x0D] = 'ftp://';
    this.URIS[0x0E] = 'dav://';
    this.URIS[0x0F] = 'news:';
    this.URIS[0x10] = 'telnet://';
    this.URIS[0x11] = 'imap:';
    this.URIS[0x12] = 'rtsp://';
    this.URIS[0x13] = 'urn:';
    this.URIS[0x14] = 'pop:';
    this.URIS[0x15] = 'sip:';
    this.URIS[0x16] = 'sips:';
    this.URIS[0x17] = 'tftp:';
    this.URIS[0x18] = 'btspp://';
    this.URIS[0x19] = 'btl2cap://';
    this.URIS[0x1A] = 'btgoep://';
    this.URIS[0x1B] = 'tcpobex://';
    this.URIS[0x1C] = 'irdaobex://';
    this.URIS[0x1D] = 'file://';
    this.URIS[0x1E] = 'urn:epc:id:';
    this.URIS[0x1F] = 'urn:epc:tag:';
    this.URIS[0x20] = 'urn:epc:pat:';
    this.URIS[0x21] = 'urn:epc:raw:';
    this.URIS[0x22] = 'urn:epc:';
    this.URIS[0x23] = 'urn:nfc:';
  },

  RTD_TEXT_IANA_LENGTH: 0x3F,
  RTD_TEXT_ENCODING: 0x80,
  RTD_TEXT_UTF8: 0,
  RTD_TEXT_UTF16: 1
};

/*******************************************************************************
 * NfcBuffer helper object for manipulating NFC Uint8Array data
 */
function NfcBuffer(uint8array) {
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

NfcBuffer.prototype.getOctet = function getOctet() {
  if (this.offset == this.uint8array.length) {
    throw Error('NfcBuffer too small');
  }
  return this.uint8array[this.offset++];
};

NfcBuffer.prototype.getOctetArray = function getOctetArray(len) {
  if (typeof len !== 'number' || len < 0 ||
    this.offset + len > this.uint8array.length) {

    throw Error('NfcBuffer too small');
  }

  return this.uint8array.subarray(this.offset, this.offset += len);
};

NfcBuffer.prototype.skip = function skip(len) {
  if (typeof len !== 'number' || len < 0 ||
    this.offset + len > this.uint8array.length) {

    throw Error('NfcBuffer too small');
  }
  this.offset += len;
};

/*******************************************************************************
 * NfcUtils offers a set of utility functions to handle NDEF messages according
 * to NFCForum-TS-NDEF_1.0. It exports the following functions:
 */
NfcUtils = {

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
      var output = '[DEBUG] NFC-UTIL: ' + msg;
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
   * Returns an Uint8Array representation of a string.
   * 
   * @param {String} str String to convert.
   * @return {Uint8Array}
   */
  fromUTF8: function fromUTF8(str) {
    if (!str) {
      return null;
    }

    var buf = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  },

  /**
   * equalArrays: returns true or false whether the arrays are equal
   */
  equalArrays: function equalArrays(a1, a2) {
    if (!a1 || !a2) {
      return false;
    }

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

  /**
   * Returns a string representation of an Uint8Array.
   * 
   * @param {Uint8Array} a Uint8Array instance.
   * @return {String}
   */
  toUTF8: function toUTF8(a) {
    if (!a) {
      return null;
    }

    var str = '';
    for (var i = 0; i < a.length; i++) {
      str += String.fromCharCode(a[i]);
    }
    return str;
  },

  /**
   * Decodes UTF-16 bytes array into a String
   *
   * @param {Array} array containing UTF-16 encoded bytes
   * @return {String}
   */
  UTF16BytesToString: function UTF16BytesToString(array) {
      // if BOM not present Big-endian should be used
      // NFCForum-TS-RTD_Text_1.0
      var offset1 = 0, offset2 = 1, i = 0;

      if (array[0] === 0xFE && array[1] === 0xFF) {
        i = 2;
      } else if (array[0] === 0xFF && array[1] === 0xFE) {
        i = 2;
        offset1 = 1;
        offset2 = 0;
      }

      var str = '';
      for (var len = array.length; i < len; i += 2) {
          var b1 = array[i + offset1];
          if (b1 < 0xD8 || b1 >= 0xE0) {
            var b2 = array[i + offset2];
            var word = (b1 << 8) + b2;
            str += String.fromCharCode(word);
          } else {
            i += 2;
            // as for now we handle only BMP characters
          }
      }

      return str;
  },

  /*****************************************************************************
   * createBuffer: returns a NfcBuffer helper object that makes it easier to
   * read from a Uint8Array.
   * @param {Uint8Array}	uint8array	The Uint8Array instance to wrap.
   */
  createBuffer: function createBuffer(uint8array) {
    return new NfcBuffer(uint8array);
  },

  /*****************************************************************************
   * encodeNDEF: takes an array of NDEFRecords and returns an Array of octets
   * representing the binary encoding of the NDEF message according to the NFC
   * Forum.
   * @param {MozNDEFRecord}	MozNDEFRecord	Array of NDEF records to encode.
   */
  encodeNDEF: function encodeNDEF(ndefMessage) {
    var b = [];
    var isFirstRecord = true;
    for (var j = 0; j < ndefMessage.length; j++) {
      var record = ndefMessage[j];
      var payloadLen = record.payload.length;
      var idLen = record.id.length;
      var typeLen = record.type.length;
      var firstOctet = 0;
      var i = 0;
      if (isFirstRecord) {
        firstOctet |= NDEF.MB;
      }
      isFirstRecord = false;
      if (j == ndefMessage.length - 1) {
        firstOctet |= NDEF.ME;
      }
      firstOctet |= record.tnf & 0x07;
      if (idLen > 0) {
        firstOctet |= NDEF.IL;
      }
      if (payloadLen <= 0xff) {
        firstOctet |= NDEF.SR;
      }
      b.push(firstOctet);
      b.push(typeLen);
      b.push(payloadLen & 0xff);
      if (payloadLen > 0xff) {
        for (i = 0; i < 3; i++) {
          payloadLen >>>= 8;
          b.push(payloadLen & 0xff);
        }
      }
      if (idLen > 0) {
        b.push(idLen);
      }
      for (i = 0; i < record.type.length; i++) {
        b.push(record.type[i]);
      }
      for (i = 0; i < record.id.length; i++) {
        b.push(record.id[i]);
      }
      for (i = 0; i < record.payload.length; i++) {
        b.push(record.payload[i]);
      }
    }
    return b;
  },

  /**
   * parseNDEF(): parses a NDEF message contained in a NfcBuffer instance.
   * (NFCForum-TS-NDEF_1.0)
   * Usage:
   *   var buf = new NfcBuffer(<Uint8Array that contains the raw NDEF message>);
   *   var ndefMessage = NdefCodec.parse(buf);
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
    var records = [];
    var isFirstRecord = true;
    var firstOctet;
    do {
      firstOctet = buffer.getOctet();
      if (isFirstRecord && !(firstOctet & NDEF.MB)) {
        throw Error('MB bit not set in first NDEF record');
      }
      if (!isFirstRecord && (firstOctet & NDEF.MB)) {
        throw Error('MB can only be set for the first record');
      }
      if (firstOctet & NDEF.CF) {
        throw Error('Cannot deal with chunked records');
      }
      records.push(this.parseNDEFRecord(buffer, firstOctet));
      isFirstRecord = false;
    } while (!(firstOctet & NDEF.ME));
    return records;
  },

  parseNDEFRecord: function parseNDEFRecord(buffer, firstOctet) {
    var tnf = firstOctet & NDEF.TNF;
    var typeLen = buffer.getOctet();
    var payloadLen = buffer.getOctet();
    if (!(firstOctet & NDEF.SR)) {
      for (var i = 0; i < 3; i++) {
        payloadLen <<= 8;
        payloadLen |= buffer.getOctet();
      }
    }
    var idLen = 0;
    if (firstOctet & NDEF.IL) {
      idLen = buffer.getOctet();
    }
    var type = buffer.getOctetArray(typeLen);
    var id = buffer.getOctetArray(idLen);
    var payload = buffer.getOctetArray(payloadLen);
    return new MozNDEFRecord(tnf, type, id, payload);
  },

  /**
   * findNDEFRecordWithId: given a NDEF record array, returns the first record
   * with a ID field that matches the given ID argument.
   *
   * @param {Uint8Array}	id		NDEF record ID
   * @param {MozNDEFRecord}	ndefMessage	non-null Array of NDEF records
   */
  findNDEFRecordWithId: function findNDEFRecordWithId(id, ndefMessage) {
    for (var i = 0; i < ndefMessage.length; i++) {
      var record = ndefMessage[i];
      if (this.equalArrays(id, record.id)) {
        return record;
      }
    }
    throw Error('Could not find record with id');
  }
};

NDEF.init();
