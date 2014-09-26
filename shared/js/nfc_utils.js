/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Copyright © 2013, Deutsche Telekom, Inc. */

/* globals MozNDEFRecord, TextEncoder, TextDecoder, StringHelper */
/* exported NDEF, NfcBuffer, NfcUtils */
'use strict';

(function(exports) {

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

    TNF_EMPTY: 'empty',
    TNF_WELL_KNOWN: 'well-known',
    TNF_MIME_MEDIA: 'media-type',
    TNF_ABSOLUTE_URI: 'absolute-uri',
    TNF_EXTERNAL_TYPE: 'external',
    TNF_UNKNOWN: 'unknown',
    TNF_UNCHANGED: 'unchanged',

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
      var nfcUtils = new NfcUtils();
      this.RTD_TEXT = nfcUtils.fromUTF8('T');
      this.RTD_URI = nfcUtils.fromUTF8('U');
      this.RTD_SMART_POSTER = nfcUtils.fromUTF8('Sp');
      this.RTD_ALTERNATIVE_CARRIER = nfcUtils.fromUTF8('ac');
      this.RTD_COLLISION_RESOLUTION = nfcUtils.fromUTF8('cr');
      this.RTD_HANDOVER_CARRIER = nfcUtils.fromUTF8('Hc');
      this.RTD_HANDOVER_REQUEST = nfcUtils.fromUTF8('Hr');
      this.RTD_HANDOVER_SELECT = nfcUtils.fromUTF8('Hs');

      this.MIME_BLUETOOTH_OOB =
        nfcUtils.fromUTF8('application/vnd.bluetooth.ep.oob');

      this.MIME_VCARD_STR_ARR =
        ['text/vcard', 'text/x-vCard', 'text/x-vcard'];

      this.SMARTPOSTER_ACTION = nfcUtils.fromUTF8('act');

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

    payload: {
      /**
       * Decodes NDEF record payload
       * @see NFCForum-TS-NDEF_1.0
       * @param String tnf - record TNF
       * @param {Uint8Array} type - record type
       * @param {Uint8Array} payload - record payload
       * @returns {Object} data - decoded payload or null if invalid
       */
      decode: function decode(tnf, type, payload) {
        var nfcUtils = new NfcUtils();
        var decodedPayload = { type: 'empty' };

        switch (tnf) {
          case NDEF.TNF_WELL_KNOWN:
            decodedPayload = this.decodeWellKnown(type, payload);
            break;
          case NDEF.TNF_MIME_MEDIA:
            decodedPayload = this.decodeMIME(type, payload);
            break;
          case NDEF.TNF_ABSOLUTE_URI:
          case NDEF.TNF_EXTERNAL_TYPE:
            decodedPayload = { type: nfcUtils.toUTF8(type) };
            break;
          case NDEF.TNF_UNKNOWN:
            decodedPayload = {};
            break;
          case NDEF.TNF_UNCHANGED:
            decodedPayload = null;
            break;
        }
        return decodedPayload;
      },

      /**
       * Decodes TNF Well Know NDEF record payload
       * @see NFCForum-TS-NDEF_1.0
       * @param {Uint8Array} type - record type
       * @param {Uint8Array} payload - record payload
       * @returns {Object} data - decoded payload or null if invalid
       */
      decodeWellKnown: function decodeWellKnown(type, payload) {
        var nfcUtils = new NfcUtils();
        if (nfcUtils.equalArrays(type, NDEF.RTD_TEXT)) {
          return this.decodeText(payload);
        } else if (nfcUtils.equalArrays(type, NDEF.RTD_URI)) {
          return this.decodeURI(payload);
        } else if (nfcUtils.equalArrays(type, NDEF.RTD_SMART_POSTER)) {
          return this.decodeSmartPoster(payload);
        }

        return null;
      },

      /**
       * Decodes TNF Well Known RTD Text NDEF record payload
       * @see NFCForum-TS-RTD_Text_1.0
       * @param {Uint8Array} payload - record payload
       * @returns {Object} data - decoded payload
       */
      decodeText: function decodeText(payload) {
        var nfcUtils = new NfcUtils();
        var decoded = { type: 'text' };

        var langLen = payload[0] & NDEF.RTD_TEXT_IANA_LENGTH;
        decoded.language = nfcUtils.toUTF8(payload.subarray(1, langLen + 1));

        var encoding = (payload[0] & NDEF.RTD_TEXT_ENCODING) !== 0 ? 1 : 0;
        if (encoding === NDEF.RTD_TEXT_UTF8) {
          decoded.text = nfcUtils.toUTF8(payload.subarray(langLen + 1));
          decoded.encoding = 'UTF-8';
        } else if (encoding === NDEF.RTD_TEXT_UTF16) {
          decoded.text = nfcUtils.UTF16BytesToStr(payload.subarray(langLen +
                                                                   1));
          decoded.encoding = 'UTF-16';
        }

        return decoded;
      },

      /**
       * Decodes TNF Well Known RTD URI NDEF record payload
       * @see NFCForum-TS-RTD_URI_1.0
       * @param {Uint8Array} payload - record payload
       * @returns {Object} data - decoded payload or null if invalid
       */
      decodeURI: function decodeURI(payload) {
        var nfcUtils = new NfcUtils();
        var prefix = NDEF.URIS[payload[0]];
        if (prefix === undefined) {
          return null;
        }

        var suffix = nfcUtils.toUTF8(payload.subarray(1));
        return { type: 'uri', uri: prefix + suffix };
      },

      /**
       * Decodes TNF Well Known RTD Smart Poster NDEF record payload
       * @see NFCForum-SmartPoster_RTD_1.0
       * @param {Uint8Array} payload - record payload
       * @returns {Object} data - decoded payload
       */
      decodeSmartPoster: function decodeSmartPoster(payload) {
        var nfcUtils = new NfcUtils();
        var buffer = new NfcBuffer(payload);
        var records = nfcUtils.parseNDEF(buffer);

        // First, decode URI. It's treated specially, because it's the only
        // mandatory record in a smart poster.
        var URIRecords = records.filter(function(record) {
          return nfcUtils.equalArrays(record.type, NDEF.RTD_URI);
        });

        if (URIRecords.length !== 1) {
          return null;
        }

        var uriPoster = {
          type: 'smartposter',
          uri: NDEF.payload.decodeURI(URIRecords[0].payload).uri
        };

        // Now decode all other records and attach their data to poster.
        return records.reduce((poster, record) => {
          var typeStr = nfcUtils.toUTF8(record.type);

          if (nfcUtils.equalArrays(record.type, NDEF.RTD_TEXT)) {
            poster.text = poster.text || {};

            var textData = NDEF.payload.decodeText(record.payload);

            if (poster.text[textData.language]) {
              // According to NFCForum-SmartPoster_RTD_1.0 3.3.2,
              // there MUST NOT be two or more records with
              // the same language identifier.
              return null;
            }

            poster.text[textData.language] = textData.text;
          } else if ('act' === typeStr) {
            poster.action = record.payload[0];
          } else if (NDEF.TNF_MIME_MEDIA === record.tnf) {
            poster.icons = poster.icons || [];
            poster.icons.push({
              type: nfcUtils.toUTF8(record.type),
              bytes: record.payload
            });
          }
          return poster;
        }, uriPoster);
      },

      /**
       * Decodes TNF MIME Media NDEF Record payload
       * @see NFCForum-TS-NDEF_1.0
       * @param {Uint8Array} type - record mime-type
       * @returns {Object} data - decoded payload
       */
      decodeMIME: function docodeMIME(type, payload) {
        var nfcUtils = new NfcUtils();
        var typeStr = (typeof type === 'string') ? type : nfcUtils.toUTF8(type);
        if (NDEF.MIME_VCARD_STR_ARR.indexOf(typeStr) !== -1) {
          return {
            type: 'text/vcard',
            blob: new Blob([nfcUtils.toUTF8(payload)], {type: 'text/vcard'})
          };
        }

        return { type: typeStr };
      }
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

  NfcBuffer.prototype = {
    uint8array: null,

    offset: 0,

    /**
     * Returns a single octet from the buffer advancing position
     * by one.
     *
     * @returns {Number} Single element from the buffer.
     * @memberof NfcBuffer
     */
    getOctet: function getOctet() {
      if (this.offset == this.uint8array.length) {
        throw Error('NfcBuffer too small');
      }

      return this.uint8array[this.offset++];
    },

    /**
     * Returns an Uint8Array containing first len elements from the
     * buffer.
     *
     * @param {Number} len Number of elements to return.
     * @returns {Uint8Array} Array of len first elements from the buffer.
     * @memberof NfcBuffer
     */
    getOctetArray: function getOctetArray(len) {
      if (typeof len !== 'number' || len < 0 ||
        this.offset + len > this.uint8array.length) {

        throw Error('NfcBuffer too small');
      }

      return this.uint8array.subarray(this.offset, this.offset += len);
    },

    /**
     * Discards len elements from the buffer.
     *
     * @param {Number} len Number of elements to skip over.
     * @memberof NfcBuffer
     */
    skip: function skip(len) {
      if (typeof len !== 'number' || len < 0 ||
        this.offset + len > this.uint8array.length) {

        throw Error('NfcBuffer too small');
      }

      this.offset += len;
    },

    /**
     * Returns a single octet from the buffer, but will not
     * advance a position.
     *
     * @returns {Number} Single element from the buffer.
     * @memberof NfcBuffer
     */
    peek: function peek() {
      if (this.offset === this.uint8array.length) {
        throw Error('NfcBuffer too small');
      }

      return this.uint8array[this.offset];
    }
  };


  /**
   * NfcUtils offers a set of utility function to handle NDEF messages according
   * to NFCForum-TS-NDEF_1.0.
   *
   * @class NfcUtils
   */
  function NfcUtils() { }

  NfcUtils.prototype = {
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

      function getTnfNum(tnfString) {
        var tnf = [
          NDEF.TNF_EMPTY, NDEF.TNF_WELL_KNOWN, NDEF.TNF_MIME_MEDIA,
          NDEF.TNF_ABSOLUTE_URI, NDEF.TNF_EXTERNAL_TYPE, NDEF.TNF_UNKNOWN,
          NDEF.TNF_UNCHANGED, NDEF.TNF_RESERVED];

        return tnf.indexOf(tnfString);
      }

      records.forEach((record, recordIndex) => {
        record.payload = record.payload || [];
        record.id = record.id || [];
        record.type = record.type || [];

        var payloadLen = record.payload.length;
        var idLen = record.id.length;
        var typeLen = record.type.length;

        var firstOctet = getTnfNum(record.tnf) & 0x07;
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
     *   var buf = new NfcBuffer(<Uint8Array that contains the raw NDEF
     *                           message>);
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
        console.error('[NfcUtils]: ' + err);
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
      var tnfArray = [
        NDEF.TNF_EMPTY, NDEF.TNF_WELL_KNOWN, NDEF.TNF_MIME_MEDIA,
        NDEF.TNF_ABSOLUTE_URI, NDEF.TNF_EXTERNAL_TYPE, NDEF.TNF_UNKNOWN,
        NDEF.TNF_UNCHANGED, NDEF.TNF_RESERVED];

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
      return new MozNDEFRecord({tnf: tnfArray[tnf],
                                type: type || undefined,
                                id: id || undefined,
                                payload: payload || undefined});
    },

    /**
     * Parses a URL string to MozNDEFRecord format.
     *
     * @param {String} url url string.
     * @return {Array} Array of MozNDEFRecord instances.
     * @memberof NfcUtils
     */
    parseURIString: function parseURIString(url) {
      if (!url) {
        return;
      }
      var content = url;
      for (var i = 1; i < NDEF.URIS.length; i++) {
        var len = NDEF.URIS[i].length;
        if (url.substring(0, len) == NDEF.URIS[i]) {
            var uriPayload = url.substring(len);
            content = String.fromCharCode(i) + uriPayload;
            break;
        }
      }
      var payload = StringHelper.fromUTF8(content);
      var record = new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                      type: NDEF.RTD_URI,
                                      payload: payload});
      if (!record) {
        return null;
      }
      return [record];
    }
  };

  NDEF.init();

  exports.NfcBuffer = NfcBuffer;
  exports.NfcUtils = NfcUtils;
  exports.NDEF = NDEF;

})(window);
