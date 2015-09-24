/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  expect,
  requireApp,
  StringConversion,
  suite,
  test
*/

requireApp('sync/js/crypto/stringconversion.js');
requireApp('sync/js/crypto/keyderivation.js');
requireApp('sync/js/crypto/main.js');
requireApp('sync/test/unit/fixtures/fxsyncwebcrypto.js');

suite('utils', () => {
  suite('rawStringToByteArray', () => {
    test('converts a raw string to a ByteArray', () => {
     const ba = StringConversion.rawStringToByteArray('hi ✓');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(4);
     expect(ba[0]).to.equal(104);
     expect(ba[1]).to.equal(105);
     expect(ba[2]).to.equal(32);
     expect(ba[3]).to.equal(19);
    });
    test('throws an error when input is not a string', () => {
      expect(StringConversion.rawStringToByteArray.bind(undefined, 5)).to.
          throw(Error);
    });
  });
  suite('utf16StringToByteArray', () => {
    test('converts a UTF16 string to a ByteArray', () => {
     var ba = StringConversion.utf16StringToByteArray('€');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(3);
     expect(ba[0]).to.equal(0xe2);
     expect(ba[1]).to.equal(0x82);
     expect(ba[2]).to.equal(0xac);
    });
    test('throws an error when input is not a string', () => {
      expect(StringConversion.utf16StringToByteArray.bind(undefined, 5)).to.
          throw(Error);
    });
  });
  suite('base64StringToByteArray', () => {
    test('converts a Base64 string to a ByteArray', () => {
     const ba = StringConversion.base64StringToByteArray('Af9=');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(2);
     expect(ba[0]).to.equal(1);
     expect(ba[1]).to.equal(255);
    });
    test('throws an error when input is not a Base64 string', () => {
      expect(StringConversion.base64StringToByteArray.bind(undefined, 'hello')).
          to.throw(Error);
    });
  });
  suite('hexStringToByteArray', () => {
    test('converts a hex string to a ByteArray', () => {
     const ba = StringConversion.hexStringToByteArray('af93');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(2);
     expect(ba[0]).to.equal(175);
     expect(ba[1]).to.equal(147);
    });
    test('throws an error when input is not a hex string', () => {
      expect(StringConversion.hexStringToByteArray.bind(undefined, 'hello')).
          to.throw(Error);
    });
  });
  suite('byteArrayToBase64String', () => {
    test('converts a Uint8Array to a Base64', () => {
     const ba = StringConversion.hexStringToByteArray('01ff');
     const str = StringConversion.byteArrayToBase64String(ba);
     expect(str).to.be.a('string');
     expect(str).to.equal('Af8=');
    });
    test('throws an error when input is not a Uint8Array', () => {
      expect(StringConversion.byteArrayToBase64String.bind(undefined,
                                                           new ArrayBuffer(2))).
           to.throw(Error);
    });
  });
  suite('byteArrayToHexString', () => {
    test('converts a Uint8Array to a Base64', () => {
     const ba = StringConversion.base64StringToByteArray('Af8=');
     const str = StringConversion.byteArrayToHexString(ba);
     expect(str).to.be.a('string');
     expect(str).to.equal('01ff');
    });
    test('throws an error when input is not an Uint8Array', () => {
      expect(StringConversion.byteArrayToHexString.bind(undefined,
                                                        new ArrayBuffer(2))).to.
          throw(Error);
    });
  });
  suite('byteArrayToUtf16String', () => {
    test('converts an Uint8Array to a UTF-16 string', () => {
      var array = new Uint8Array(3);
      array[0] = 0xe2;
      array[1] = 0x82;
      array[2] = 0xac;
      var str = StringConversion.byteArrayToUtf16String(array);
      expect(str).to.be.a('string');
      expect(str).to.equal('€');
    });
    test('throws an error when input is not an Uint8Array', () => {
      expect(StringConversion.byteArrayToUtf16String.bind(
          undefined,
          new ArrayBuffer(2))).to.throw(Error);
    });
  });
  suite('arrayBufferToBase64String', () => {
    test('converts an ArrayBuffer to a Base64', () => {
     const ba = StringConversion.hexStringToByteArray('01ff');
     const str = StringConversion.arrayBufferToBase64String(ba.buffer);
     expect(str).to.be.a('string');
     expect(str).to.equal('Af8=');
    });
    test('throws an error when input is not an ArrayBuffer', () => {
      expect(StringConversion.arrayBufferToBase64String.bind(
          undefined,
          new Uint8Array(2))).to.throw(Error);
    });
  });
  suite('arrayBufferToHexString', () => {
    test('converts an ArrayBuffer to a Base64', () => {
     const ba = StringConversion.base64StringToByteArray('Af8=');
     const str = StringConversion.arrayBufferToHexString(ba.buffer);
     expect(str).to.be.a('string');
     expect(str).to.equal('01ff');
    });
    test('throws an error when input is not an ArrayBuffer', () => {
      expect(StringConversion.arrayBufferToHexString.bind(undefined,
                                                          new Uint8Array(2))).
          to.throw(Error);
    });
  });
});
