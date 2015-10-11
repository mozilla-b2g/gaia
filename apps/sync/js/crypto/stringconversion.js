/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported
  StringConversion
*/

const StringConversion = Object.freeze((() => {

  return {
    rawStringToUint8Array(str) {
      if (typeof str != 'string') {
        throw new Error('Not a string');
      }
      const strLen = str.length;
      var byteArray = new Uint8Array(strLen);
      for (var i = 0; i < strLen; i++) {
        byteArray[i] = str.charCodeAt(i);
      }
      return byteArray;
    },

    stringToUtf8Uint8Array(str) {
      if (typeof str != 'string') {
        throw new Error('Not a string');
      }
      var string = unescape(encodeURIComponent(str)),
          charList = string.split(''),
          uintArray = [];
      for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
      }
      return new Uint8Array(uintArray);
    },

    base64StringToUint8Array(base64) {
      if (typeof base64 != 'string' || base64.length % 4 !== 0) {
        throw new Error(`Number of base64 digits must be a multiple of 4 to con\
vert to bytes`);
      }
      return StringConversion.rawStringToUint8Array(window.atob(base64));
    },

    hexStringToUint8Array(hexStr) {
      if (typeof hexStr != 'string' || hexStr.length % 2 !== 0) {
        throw new Error(`Must have an even number of hex digits to convert to b\
ytes`);
      }
      const numBytes = hexStr.length / 2;
      var byteArray = new Uint8Array(numBytes);
      for (var i = 0; i < numBytes; i++) {
        byteArray[i] = parseInt(hexStr.substr(i * 2, 2), 16);
      }
      return byteArray;
    },

    uint8ArrayToBase64String(bytes) {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('Not a Uint8Array');
      }
      var binary = '';
      const len = bytes.byteLength;
      for (var i=0; i<len; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },

    arrayBufferToBase64String(buffer) {
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error('Not an ArrayBuffer');
      }
      var bytes = new Uint8Array(buffer);
      return StringConversion.uint8ArrayToBase64String(bytes);
    },

    utf8Uint8ArrayToString(array) {
      if (!(array instanceof Uint8Array)) {
        throw new Error('Not an Uint8Array');
      }
      var utf8_string = String.fromCharCode.apply(null, array);
      return decodeURIComponent(escape(utf8_string));
    },

    uint8ArrayToHexString(bytes) {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('Not a Uint8Array');
      }
      var hex = '';
      for (var i=0; i <bytes.length; ++i) {
        const zeropad = (bytes[i] < 0x10) ? '0' : '';
        hex += zeropad + bytes[i].toString(16);
      }
      return hex;
    },

    arrayBufferToHexString(buffer) {
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error('Not an ArrayBuffer');
      }
      var bytes = new Uint8Array(buffer);
      return StringConversion.uint8ArrayToHexString(bytes);
    }
  };
})());
