/*
Copyright 2015, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/* exported
  StringConversion
*/

const StringConversion = Object.freeze((() => {

  return {
    rawStringToUint8Array(str) {
      if (typeof str != 'string') {
        throw new Error('Not a string (2001)');
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
        throw new Error('Not a string (2002)');
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
vert to bytes (2003)`);
      }
      return StringConversion.rawStringToUint8Array(window.atob(base64));
    },

    hexStringToUint8Array(hexStr) {
      if (typeof hexStr != 'string' || hexStr.length % 2 !== 0) {
        throw new Error(`Must have an even number of hex digits to convert to b\
ytes (2004)`);
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
        throw new Error('Not a Uint8Array (2005)');
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
        throw new Error('Not an ArrayBuffer (2006)');
      }
      var bytes = new Uint8Array(buffer);
      return StringConversion.uint8ArrayToBase64String(bytes);
    },

    utf8Uint8ArrayToString(array) {
      if (!(array instanceof Uint8Array)) {
        throw new Error('Not an Uint8Array (2007)');
      }
      var utf8_string = String.fromCharCode.apply(null, array);
      return decodeURIComponent(escape(utf8_string));
    },

    uint8ArrayToHexString(bytes) {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('Not a Uint8Array (2008)');
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
        throw new Error('Not an ArrayBuffer (2009)');
      }
      var bytes = new Uint8Array(buffer);
      return StringConversion.uint8ArrayToHexString(bytes);
    }
  };
})());
