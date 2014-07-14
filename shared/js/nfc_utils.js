/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals dump, MozNDEFRecord, TextEncoder, TextDecoder */
/* exported NDEF, NfcBuffer, NfcUtils */
'use strict';

var NfcUtils; // Pre-declaration for jshint

/**
* NDEF (NFC Data Exchange Format) contants and common values.
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

  RTD_TEXT_IANA_LENGTH: 0x3F,
  RTD_TEXT_ENCODING: 0x80,
  RTD_TEXT_UTF8: 0,
  RTD_TEXT_UTF16: 1,

  CPS_INACTIVE: 0,
  CPS_ACTIVE: 1,
  CPS_ACTIVATING: 2,
  CPS_UNKNOWN: 3,

  MIME_BLUETOOTH_OOB: 0,

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

    this.MIME_BLUETOOTH_OOB =
      NfcUtils.fromUTF8('application/vnd.bluetooth.ep.oob');

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
  }
};

/**
 * NfcBuffer wraps Uint8Array providing helper methods for accessing
 * its elements.
 *
 * @param {Array} array Either a plain Array or an Uint8Array instance.
 * @constructor
 */
function NfcBuffer(array) {
    this.uint8array = new Uint8Array(array);
    this.offset = 0;
}

/**
 * Returns a single octet from the buffer advancing position
 * by one.
 *
 * @returns {Number} Single element from the buffer.
 * @memberof NfcBuffer
 */
NfcBuffer.prototype.getOctet = function getOctet() {
  if (this.offset == this.uint8array.length) {
    throw Error('NfcBuffer too small');
  }

  return this.uint8array[this.offset++];
};

/**
 * Returns an Uint8Array containing first len elements from the
 * buffer.
 *
 * @param {Number} len Number of elements to return.
 * @returns {Uint8Array} Array of len first elements from the buffer.
 * @memberof NfcBuffer
 */
NfcBuffer.prototype.getOctetArray = function getOctetArray(len) {
  if (typeof len !== 'number' || len < 0 ||
    this.offset + len > this.uint8array.length) {

    throw Error('NfcBuffer too small');
  }

  return this.uint8array.subarray(this.offset, this.offset += len);
};

/**
 * Discards len elements from the buffer.
 *
 * @param {Number} len Number of elements to skip over.
 * @memberof NfcBuffer
 */
NfcBuffer.prototype.skip = function skip(len) {
  if (typeof len !== 'number' || len < 0 ||
    this.offset + len > this.uint8array.length) {

    throw Error('NfcBuffer too small');
  }

  this.offset += len;
};

/**
 * Returns a single octet from the buffer, but will not
 * advance a position.
 *
 * @returns {Number} Single element from the buffer.
 * @memberof NfcBuffer
 */
NfcBuffer.prototype.peek = function peek() {
  if (this.offset === this.uint8array.length) {
    throw Error('NfcBuffer too small');
  }

  return this.uint8array[this.offset];
};


/**
 * NfcUtils offers a set of utility function to handle NDEF messages according
 * to NFCForum-TS-NDEF_1.0.
 *
 * @class NfcUtils
 */
NfcUtils = {

  DEBUG: false,

  _debug: function debug(msg, optObject) {
    if (this.DEBUG) {
      var output = '[DEBUG] NFC-UTIL: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      if (typeof dump !== 'undefined') {
        dump(output + '\n');
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
   * @memberof NfcUtils
   */
  fromUTF8: function fromUTF8(str) {
    if (!str) {
      return null;
    }

    var enc = new TextEncoder('utf-8');
    return enc.encode(str);
  },

  /**
   * Returns a string representation of an Uint8Array.
   *
   * @param {Uint8Array} a Uint8Array instance.
   * @return {String}
   * @memberof NfcUtils
   */
  toUTF8: function toUTF8(a) {
    if (!a) {
      return null;
    }

    // BOM removal
    if (this.equalArrays(a.subarray(0, 3), [0xEF, 0xBB, 0xBF])) {
      a = a.subarray(3);
    }
    var dec = new TextDecoder('utf-8');
    return dec.decode(a);
  },

  /**
   * Decodes UTF-16 bytes array into a String
   *
   * @param {Uint8Array} array containing UTF-16 encoded bytes
   * @return {string}
   * @memberof NfcUtils
   */
  UTF16BytesToStr: function UTF16BytesToStr(array) {
      if (!array) {
        return null;
      }

      // if BOM not present Big-endian should be used
      // NFCForum-TS-RTD_Text_1.0
      var le = false;

      var possibleBom = array.subarray(0, 2);
      if (this.equalArrays(possibleBom, [0xFF, 0xFE])) {
        array = array.subarray(2);
        le = true;
      } else if (this.equalArrays(possibleBom, [0xFE, 0xFF])) {
        array = array.subarray(2);
      }

      var encoding = (le) ? 'utf-16le' : 'utf-16be';
      var dec = new TextDecoder(encoding);
      return dec.decode(array);
  },

  /**
   * Ecodes string into Uint8Array conating UTF-16 BE bytes without BOM.
   * @param {string}
   * @return {Uint8Array}
   * @memberof NfcUtils
   */
  strToUTF16Bytes: function strToUTF16Bytes(str) {
    if (!str) {
      return null;
    }

    var enc = new TextEncoder('utf-16be');
    return enc.encode(str);
  },

  /**
   * Compares arrays, array-like objects and typed arrays for equality.
   *
   * @param {Array} a1 First array
   * @param {Array} a2 Second array
   * @return {Boolean} True if arrays are equal, false otherwise.
   * @memberof NfcUtils
   */
  equalArrays: function equalArrays(a1, a2) {
    if (!a1 || !a2) {
      return false;
    }

    if (a1.length !== a2.length) {
      return false;
    }

    for (var i = 0; i < a1.length; i++) {
      if (a1[i] !== a2[i]) {
        return false;
      }
    }

    return true;
  },

  /**
   * Takes an array of NDEFRecords and returns an Array of octets
   * representing the binary encoding of the NDEF message according
   * to the NFC Forum.
   * Note: support for message chunking is not implemented.
   *
   * @param {Array} ndefRecords Array of NDEF records to encode.
   * @return {Array} Byte array containing encoded NDEF message.
   * @memberof NfcUtils
   */
  encodeNDEF: function encodeNDEF(records) {
    var result = [];

    records.forEach((record, recordIndex) => {
      record.payload = record.payload || [];
      record.id = record.id || [];
      record.type = record.type || [];

      var payloadLen = record.payload.length;
      var idLen = record.id.length;
      var typeLen = record.type.length;

      var firstOctet = record.tnf & 0x07;
      firstOctet |= (recordIndex === 0) ? NDEF.MB : 0;
      firstOctet |= (recordIndex === records.length - 1) ? NDEF.ME : 0;
      firstOctet |= (idLen > 0) ? NDEF.IL : 0;
      firstOctet |= (payloadLen <= 0xFF) ? NDEF.SR : 0;

      result.push(firstOctet);
      result.push(typeLen);

      for (var p = (payloadLen > 0xFF ? 3 : 0); p >= 0; p -= 1) {
        result.push((payloadLen >>> (8 * p)) & 0xFF);
      }

      if (idLen > 0) {
        result.push(idLen);
      }

      result.push.apply(result, record.type);
      result.push.apply(result, record.id);
      result.push.apply(result, record.payload);
    });

    return result;
  },

  /**
   * Parses a NDEF message contained in a NfcBuffer instance according to
   * NFCForum-TS-NDEF_1.0.
   *
   * Usage:
   *   var buf = new NfcBuffer(<Uint8Array that contains the raw NDEF message>);
   *   var ndefMessage = NdefCodec.parse(buf);
   *
   * @param {NfcBuffer} Buffer containing the NDEF message.
   * @return {Array} Array of MozNDEFRecord instances or null if message
   *                 couldn't be parsed.
   * @memberof NfcUtils
   */
  parseNDEF: function parseNDEF(buffer) {
    try {
      return this._doParseNDEF(buffer);
    } catch (err) {
      this._debug(err);
      return null;
    }
  },

  _doParseNDEF: function doParseNDEF(buffer) {
    var records = [];
    var isFirstRecord = true;
    var firstOctet;

    do {
      firstOctet = buffer.peek();

      if (isFirstRecord && !(firstOctet & NDEF.MB)) {
        throw Error('MB bit not set in first NDEF record');
      }

      if (!isFirstRecord && (firstOctet & NDEF.MB)) {
        throw Error('MB can only be set for the first record');
      }

      if (firstOctet & NDEF.CF) {
        throw Error('Chunked payloads are not supported');
      }

      records.push(this._parseNDEFRecord(buffer));
      isFirstRecord = false;
    } while (!(firstOctet & NDEF.ME));

    if (buffer.offset < buffer.uint8array.length) {
      throw Error('ME bit set on non-last record');
    }

    return records;
  },

  _parseNDEFRecord: function parseNDEFRecord(buffer) {
    var firstOctet = buffer.getOctet();
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

    var tnf = firstOctet & NDEF.TNF;
    var type = buffer.getOctetArray(typeLen);
    var id = buffer.getOctetArray(idLen);
    var payload = buffer.getOctetArray(payloadLen);
    return new MozNDEFRecord(tnf, type, id, payload);
  }
};

NDEF.init();
