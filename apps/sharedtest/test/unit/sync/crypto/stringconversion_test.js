/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global StringConversion */

require('/shared/js/sync/crypto/stringconversion.js');
require('/shared/js/sync/crypto/keyderivation.js');
require('/shared/js/sync/crypto/main.js');
requireApp('sharedtest/test/unit/sync/fixtures/fxsyncwebcrypto.js');

suite('utils', () => {
  suite('rawStringToUint8Array', () => {
    test('converts a ASCII string to a ByteArray', () => {
     const ba = StringConversion.rawStringToUint8Array('\x00\xEA\x80\xFF');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(4);
     expect(ba[0]).to.equal(0x00);
     expect(ba[1]).to.equal(0xEA);
     expect(ba[2]).to.equal(0x80);
     expect(ba[3]).to.equal(0xFF);
    });
    test('throws an error when input is not a string', () => {
      expect(StringConversion.rawStringToUint8Array.bind(undefined, 5)).to.
          throw(Error);
    });
  });
  suite('stringToUtf8Uint8Array', () => {
    test('converts a string to a UTF-8 ByteArray', () => {
     var ba = StringConversion.stringToUtf8Uint8Array('€');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(3);
     expect(ba[0]).to.equal(0xe2);
     expect(ba[1]).to.equal(0x82);
     expect(ba[2]).to.equal(0xac);
    });
    test('throws an error when input is not a string', () => {
      expect(StringConversion.stringToUtf8Uint8Array.bind(undefined, 5)).to.
          throw(Error);
    });
  });
  suite('base64StringToUint8Array', () => {
    test('converts a Base64 string to a ByteArray', () => {
     const ba = StringConversion.base64StringToUint8Array('Af9=');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(2);
     expect(ba[0]).to.equal(1);
     expect(ba[1]).to.equal(255);
    });
    test('throws an error when input is not a Base64 string', () => {
      expect(StringConversion.base64StringToUint8Array.
        bind(undefined, 'hello')).to.throw(Error);
    });
  });
  suite('hexStringToUint8Array', () => {
    test('converts a hex string to a ByteArray', () => {
     const ba = StringConversion.hexStringToUint8Array('af93');
     expect(ba).to.be.instanceOf(Uint8Array);
     expect(ba.length).to.equal(2);
     expect(ba[0]).to.equal(175);
     expect(ba[1]).to.equal(147);
    });
    test('throws an error when input is not a hex string', () => {
      expect(StringConversion.hexStringToUint8Array.bind(undefined, 'hello')).
          to.throw(Error);
    });
  });
  suite('uint8ArrayToBase64String', () => {
    test('converts a Uint8Array to a Base64', () => {
     const ba = StringConversion.hexStringToUint8Array('01ff');
     const str = StringConversion.uint8ArrayToBase64String(ba);
     expect(str).to.be.a('string');
     expect(str).to.equal('Af8=');
    });
    test('throws an error when input is not a Uint8Array', () => {
      expect(StringConversion.uint8ArrayToBase64String.bind(undefined,
                                                           new ArrayBuffer(2))).
           to.throw(Error);
    });
  });
  suite('uint8ArrayToHexString', () => {
    test('converts a Uint8Array to a Base64', () => {
     const ba = StringConversion.base64StringToUint8Array('Af8=');
     const str = StringConversion.uint8ArrayToHexString(ba);
     expect(str).to.be.a('string');
     expect(str).to.equal('01ff');
    });
    test('throws an error when input is not an Uint8Array', () => {
      expect(StringConversion.uint8ArrayToHexString.bind(undefined,
                                                        new ArrayBuffer(2))).to.
          throw(Error);
    });
  });
  suite('utf8Uint8ArrayToString', () => {
    test('converts an UTF-8 Uint8Array to a string', () => {
      var array = new Uint8Array(3);
      array[0] = 0xe2;
      array[1] = 0x82;
      array[2] = 0xac;
      var str = StringConversion.utf8Uint8ArrayToString(array);
      expect(str).to.be.a('string');
      expect(str).to.equal('€');
    });
    test('throws an error when input is not an Uint8Array', () => {
      expect(StringConversion.utf8Uint8ArrayToString.bind(
          undefined,
          new ArrayBuffer(2))).to.throw(Error);
    });
  });
  suite('arrayBufferToBase64String', () => {
    test('converts an ArrayBuffer to a Base64', () => {
     const ba = StringConversion.hexStringToUint8Array('01ff');
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
     const ba = StringConversion.base64StringToUint8Array('Af8=');
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
