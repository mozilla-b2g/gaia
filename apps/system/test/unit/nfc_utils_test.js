'use strict';

/* globals MocksHelper, MozNDEFRecord, NDEF,
           NfcUtils, NDEFUtils, NfcBuffer */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/js/nfc_utils.js');
requireApp('system/js/ndef_utils.js');


var mocksForNfcUtils = new MocksHelper([
  'MozNDEFRecord'
]).init();

suite('NFC Utils', function() {

  mocksForNfcUtils.attachTestHelpers();

  var string1;
  var uint8array1;
  var urlU8a; // Uint8Array

  setup(function() {
    string1 = 'StringTestString ABCDEFGHIJKLMNOPQRSTUVWXYZ ą嗨è©';
    uint8array1 = new Uint8Array([0x53, 0x74, 0x72, 0x69, 0x6e, 0x67,
                                  0x54, 0x65, 0x73, 0x74,
                                  0x53, 0x74, 0x72, 0x69, 0x6e, 0x67,
                                  0x20,
                                  0x41, 0x42, 0x43, 0x44, 0x45, 0x46,
                                  0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c,
                                  0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52,
                                  0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
                                  0x59, 0x5a,
                                  0x20,
                                  0xC4, 0x85, 0xE5, 0x97, 0xA8, 0xC3,
                                  0xA8, 0xC2, 0xA9]);

    // SR = 1, TNF = 0x01 (NFC Forum Well Known Type),
    // One record only: ME=1, MB=1
    urlU8a = new Uint8Array([0xd1, // TNF and header
                             0x01, // Record type length
                             0x0c, // payload length
                             0x55, // 'U',  NDEF.RTD_URI type
                             0x03, // NDEF.URIS[0x03] = 'http://';
                             0x6d, 0x6f, 0x7a, 0x69, 0x6c, 0x6c, 0x61,
                             0x2e,
                             0x6f, 0x72, 0x67]); // mozilla.org
  });

  test('transitive', function() {
    var u8a = NfcUtils.fromUTF8(string1);
    var str = NfcUtils.toUTF8(uint8array1);
    var backStr = NfcUtils.toUTF8(u8a);
    var backU8a = NfcUtils.fromUTF8(str);
    var nullObj = NfcUtils.toUTF8(null);
    var nullStr = NfcUtils.fromUTF8(null);

    var u1 = NfcUtils.equalArrays(u8a, uint8array1);
    var s1 = NfcUtils.equalArrays(str, string1);
    var bs1 = NfcUtils.equalArrays(string1, backStr);
    var bs2 = NfcUtils.equalArrays(str, backStr);
    var bu1 = NfcUtils.equalArrays(u8a, backU8a);
    var bu2 = NfcUtils.equalArrays(uint8array1, backU8a);

    assert.equal(u1, true);
    assert.equal(s1, true);
    assert.equal(bs1, true);
    assert.equal(bs2, true);
    assert.equal(bu1, true);
    assert.equal(bu2, true);
    assert.equal(nullObj, null);
    assert.equal(nullStr, null);
  });

  suite('equalArrays', function() {
    test('Accepts null arguments', function() {
      assert.isFalse(NfcUtils.equalArrays());
      assert.isFalse(NfcUtils.equalArrays(null));
      assert.isFalse(NfcUtils.equalArrays(null, null));
      assert.isFalse(NfcUtils.equalArrays(undefined, null));
    });

    test('Accepts non-array objects', function() {
      assert.isFalse(NfcUtils.equalArrays({}, [1]));
    });

    test('Compares arrays', function() {
      assert.isFalse(NfcUtils.equalArrays([1, 2, 3], [1, 3, 2]));
      assert.isFalse(NfcUtils.equalArrays([1, 2, 3], [1]));

      assert.isTrue(NfcUtils.equalArrays([1, 2, 3], [1, 2, 3]));
      assert.isTrue(NfcUtils.equalArrays([1, 2, 3], new Uint8Array([1, 2, 3])));
    });
  });

  suite('String <> byte conversions', function() {
    var cprght = '©';
    var cprghtUTF16BE = new Uint8Array([0x00, 0xA9]);
    var cprghtUTF16BEBOM = new Uint8Array([0xFE, 0xFF, 0x00, 0xA9]);
    var cprghtUTF16LEBOM = new Uint8Array([0xFF, 0xFE, 0xA9, 0x00]);

    var plchr = 'ą';
    var plchrUTF16BE = new Uint8Array([0x01, 0x05]);

    var hai = '嗨';
    var haiUTF16BE = new Uint8Array([0x55, 0xE8]);

    var foxTxt = 'Big brown fox! 大棕狐狸?';
    var foxTxtUTF16BE = new Uint8Array(
      [0x00, 0x42, 0x00, 0x69, 0x00, 0x67, 0x00, 0x20, 0x00, 0x62, 0x00, 0x72,
       0x00, 0x6F, 0x00, 0x77, 0x00, 0x6E, 0x00, 0x20, 0x00, 0x66, 0x00, 0x6F,
       0x00, 0x78, 0x00, 0x21, 0x00, 0x20, 0x59, 0x27, 0x68, 0xD5, 0x72, 0xD0,
       0x72, 0xF8, 0x00, 0x3F]
    );

    test('UTF16BytesToStr', function() {
      assert.equal(cprght, NfcUtils.UTF16BytesToStr(cprghtUTF16BE));
      assert.equal(cprght, NfcUtils.UTF16BytesToStr(cprghtUTF16BEBOM));
      assert.equal(cprght, NfcUtils.UTF16BytesToStr(cprghtUTF16LEBOM));

      assert.equal(plchr, NfcUtils.UTF16BytesToStr(plchrUTF16BE));
      assert.equal(hai, NfcUtils.UTF16BytesToStr(haiUTF16BE));
      assert.equal(foxTxt, NfcUtils.UTF16BytesToStr(foxTxtUTF16BE));
    });

    test('strToUTF16Bytes', function() {
      assert.deepEqual(cprghtUTF16BE, NfcUtils.strToUTF16Bytes(cprght));
      assert.deepEqual(plchrUTF16BE, NfcUtils.strToUTF16Bytes(plchr));
      assert.deepEqual(haiUTF16BE, NfcUtils.strToUTF16Bytes(hai));
      assert.deepEqual(foxTxtUTF16BE, NfcUtils.strToUTF16Bytes(foxTxt));
    });
  });

  suite('encodeNDEF', function() {
    var urlNDEF; // MozNDEFRecord

    setup(function() {
      var tnf     = NDEF.TNF_WELL_KNOWN;
      var type    = NDEF.RTD_URI;
      var id      = new Uint8Array(); // no id.
      // Short Record, 0x3 or "http://"
      var payload = new Uint8Array(NfcUtils.fromUTF8(
                                   '\u0003mozilla.org'));

      urlNDEF = new MozNDEFRecord(tnf, type, id, payload);
    });

    test('Subrecord', function() {
      var encodedNdefU8a = NfcUtils.encodeNDEF([urlNDEF]);
      // MozNDEFRecord is abstract, and does not contain some extra bits in the
      // header for NDEF payload subrecords:
      var cpUrlU8a = new Uint8Array(encodedNdefU8a);
      cpUrlU8a[0] = cpUrlU8a[0] & NDEF.TNF;

      var equals1 = NfcUtils.equalArrays(encodedNdefU8a, urlU8a);
      assert.equal(equals1, true);
    });

    test('Short record', function() {
      var ndefMsg = new Uint8Array([0xd1, 0x01, 0x11, 0x55, 0x04, 0x77, 0x69,
                                   0x6b, 0x69, 0x2e, 0x6d, 0x6f, 0x7a, 0x69,
                                    0x6c, 0x6c, 0x61, 0x2e, 0x6f, 0x72, 0x67]);

      // "wiki.mozilla.org" with abbreviation "https://" (0x04)
      var payload = new Uint8Array([0x04, 0x77, 0x69, 0x6b, 0x69, 0x2e, 0x6d,
                                    0x6f, 0x7a, 0x69, 0x6c, 0x6c, 0x61, 0x2e,
                                    0x6f, 0x72, 0x67]);
      var ndefRecord = new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                         NDEF.RTD_URI,
                                         new Uint8Array(),
                                         payload);

      var result = NfcUtils.encodeNDEF([ndefRecord]);
      assert.deepEqual(result, ndefMsg);
    });

    test('Long record', function() {
      // Excerpt from Wikipedia about Mozilla Foundation, UTF-16 encoded.
      var payloadArray =
        [0x85, 0x70, 0x6c, 0x5f, 0x70, 0x6c, 0xff, 0xfe, 0x46, 0x00, 0x75,
        0x00, 0x6e, 0x00, 0x64, 0x00, 0x61, 0x00, 0x63, 0x00, 0x6a, 0x00,
        0x61, 0x00, 0x20, 0x00, 0x4d, 0x00, 0x6f, 0x00, 0x7a, 0x00, 0x69,
        0x00, 0x6c, 0x00, 0x6c, 0x00, 0x61, 0x00, 0x20, 0x00, 0x28, 0x00,
        0x61, 0x00, 0x6e, 0x00, 0x67, 0x00, 0x2e, 0x00, 0x20, 0x00, 0x54,
        0x00, 0x68, 0x00, 0x65, 0x00, 0x20, 0x00, 0x4d, 0x00, 0x6f, 0x00,
        0x7a, 0x00, 0x69, 0x00, 0x6c, 0x00, 0x6c, 0x00, 0x61, 0x00, 0x20,
        0x00, 0x46, 0x00, 0x6f, 0x00, 0x75, 0x00, 0x6e, 0x00, 0x64, 0x00,
        0x61, 0x00, 0x74, 0x00, 0x69, 0x00, 0x6f, 0x00, 0x6e, 0x00, 0x29,
        0x00, 0x20, 0x00, 0x13, 0x20, 0x20, 0x00, 0x6f, 0x00, 0x72, 0x00,
        0x67, 0x00, 0x61, 0x00, 0x6e, 0x00, 0x69, 0x00, 0x7a, 0x00, 0x61,
        0x00, 0x63, 0x00, 0x6a, 0x00, 0x61, 0x00, 0x20, 0x00, 0x6e, 0x00,
        0x6f, 0x00, 0x6e, 0x00, 0x2d, 0x00, 0x70, 0x00, 0x72, 0x00, 0x6f,
        0x00, 0x66, 0x00, 0x69, 0x00, 0x74, 0x00, 0x20, 0x00, 0x70, 0x00,
        0x6f, 0x00, 0x77, 0x00, 0x6f, 0x00, 0x42, 0x01, 0x61, 0x00, 0x6e,
        0x00, 0x61, 0x00, 0x20, 0x00, 0x31, 0x00, 0x35, 0x00, 0x20, 0x00,
        0x6c, 0x00, 0x69, 0x00, 0x70, 0x00, 0x63, 0x00, 0x61, 0x00, 0x20,
        0x00, 0x32, 0x00, 0x30, 0x00, 0x30, 0x00, 0x33, 0x00, 0x2c, 0x00,
        0x20, 0x00, 0x6b, 0x00, 0x74, 0x00, 0xf3, 0x00, 0x72, 0x00, 0x65,
        0x00, 0x6a, 0x00, 0x20, 0x00, 0x63, 0x00, 0x65, 0x00, 0x6c, 0x00,
        0x65, 0x00, 0x6d, 0x00, 0x20, 0x00, 0x6a, 0x00, 0x65, 0x00, 0x73,
        0x00, 0x74, 0x00, 0x20, 0x00, 0x7a, 0x00, 0x61, 0x00, 0x70, 0x00,
        0x65, 0x00, 0x77, 0x00, 0x6e, 0x00, 0x69, 0x00, 0x65, 0x00, 0x6e,
        0x00, 0x69, 0x00, 0x65, 0x00, 0x20, 0x00, 0x6f, 0x00, 0x72, 0x00,
        0x67, 0x00, 0x61, 0x00, 0x6e, 0x00, 0x69, 0x00, 0x7a, 0x00, 0x61,
        0x00, 0x63, 0x00, 0x79, 0x00, 0x6a, 0x00, 0x6e, 0x00, 0x65, 0x00,
        0x67, 0x00, 0x6f, 0x00, 0x2c, 0x00, 0x20, 0x00, 0x70, 0x00, 0x72,
        0x00, 0x61, 0x00, 0x77, 0x00, 0x6e, 0x00, 0x65, 0x00, 0x67, 0x00,
        0x6f, 0x00, 0x20, 0x00, 0x69, 0x00, 0x20, 0x00, 0x66, 0x00, 0x69,
        0x00, 0x6e, 0x00, 0x61, 0x00, 0x6e, 0x00, 0x73, 0x00, 0x6f, 0x00,
        0x77, 0x00, 0x65, 0x00, 0x67, 0x00, 0x6f, 0x00, 0x20, 0x00, 0x77,
        0x00, 0x73, 0x00, 0x70, 0x00, 0x61, 0x00, 0x72, 0x00, 0x63, 0x00,
        0x69, 0x00, 0x61, 0x00, 0x20, 0x00, 0x64, 0x00, 0x6c, 0x00, 0x61,
        0x00, 0x20, 0x00, 0x70, 0x00, 0x72, 0x00, 0x6f, 0x00, 0x6a, 0x00,
        0x65, 0x00, 0x6b, 0x00, 0x74, 0x00, 0x75, 0x00, 0x20, 0x00, 0x4d,
        0x00, 0x6f, 0x00, 0x7a, 0x00, 0x69, 0x00, 0x6c, 0x00, 0x6c, 0x00,
        0x61, 0x00, 0x20, 0x00, 0x69, 0x00, 0x20, 0x00, 0x6a, 0x00, 0x65,
        0x00, 0x67, 0x00, 0x6f, 0x00, 0x20, 0x00, 0x70, 0x00, 0x6f, 0x00,
        0x63, 0x00, 0x68, 0x00, 0x6f, 0x00, 0x64, 0x00, 0x6e, 0x00, 0x79,
        0x00, 0x63, 0x00, 0x68, 0x00, 0x2e, 0x00];

      var ndefMsg = new Uint8Array([0xc1, 0x01, 0x00, 0x00, 0x01, 0xb4, 0x54]
        .concat(payloadArray));
      var payload = new Uint8Array(payloadArray);

      var ndefRecord = new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                         NDEF.RTD_TEXT,
                                         new Uint8Array(),
                                         payload);

      var result = NfcUtils.encodeNDEF([ndefRecord]);
      assert.deepEqual(result, ndefMsg);
    });

    test('No type, no paylod, no id', function() {
      var ndefMsg = new Uint8Array([0xd0, 0x00, 0x00]);

      var result = NfcUtils.encodeNDEF([new MozNDEFRecord(NDEF.TNF_EMPTY)]);
      assert.deepEqual(result, ndefMsg);
    });

    test('Multiple records', function() {
      var ndefMsg = new Uint8Array([0x91, 0x01, 0x11, 0x55, 0x04, 0x77, 0x69,
                                    0x6b, 0x69, 0x2e, 0x6d, 0x6f, 0x7a, 0x69,
                                    0x6c, 0x6c, 0x61, 0x2e, 0x6f, 0x72, 0x67,
                                    0x51, 0x01, 0x0c, 0x55, 0x03, 0x6d, 0x6f,
                                    0x7a, 0x69, 0x6c, 0x6c, 0x61, 0x2e, 0x6f,
                                    0x72, 0x67]);

      var payload1 = new Uint8Array([0x04, 0x77, 0x69, 0x6b, 0x69, 0x2e, 0x6d,
                                     0x6f, 0x7a, 0x69, 0x6c, 0x6c, 0x61, 0x2e,
                                     0x6f, 0x72, 0x67]);
      var rec1 = new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                   NDEF.RTD_URI,
                                   new Uint8Array(),
                                   payload1);

      var payload2 = new Uint8Array([0x03, 0x6d, 0x6f, 0x7a, 0x69, 0x6c, 0x6c,
                                     0x61, 0x2e, 0x6f, 0x72, 0x67]);
      var rec2 = new MozNDEFRecord(NDEF.TNF_WELL_KNOWN,
                                   NDEF.RTD_URI,
                                   new Uint8Array(),
                                   payload2);

      var result = NfcUtils.encodeNDEF([rec1, rec2]);
      assert.deepEqual(result, ndefMsg);
    });
  });

  suite('parseNDEF', function() {
    var msg1;

    setup(function() {
      // These record payloads aren't valid, but that's fine because
      // NDEF doesn't care about the payload.
      msg1 = [
        // TNF = 1; MB | SR bits; type=[0x55]; payload length = 3
        0x91, 0x01, 0x03, 0x55, 0x03, 0x6D, 0x6F,
        // TNF = 3; SR bit; type=[0xAA, 0xBB]; payload length = 5
        0x13, 0x02, 0x05, 0xAA, 0xBB, 0x02, 0xAD, 0x8F, 0x71, 0x96,
        // TNF = 4; ME | SR bits; type=[0x55]; payload length = 7
        0x54, 0x01, 0x07, 0x55, 0xFF, 0x12, 0x9A, 0xA7, 0x11, 0xDC, 0xA8];
    });

    test('Subrecord', function() {
      var buf = new NfcBuffer(urlU8a);
      var ndefrecords = NfcUtils.parseNDEF(buf);
      var equal;

      // There is only one record here:
      assert.equal(ndefrecords[0].tnf, NDEF.TNF_WELL_KNOWN);
      equal = NfcUtils.equalArrays(ndefrecords[0].type, NDEF.RTD_URI);
      assert.equal(equal, true, 'type');

      equal = NfcUtils.equalArrays(ndefrecords[0].id, new Uint8Array());
      assert.equal(equal, true, 'id');

      equal = NfcUtils.equalArrays(ndefrecords[0].payload,
                                 NfcUtils.fromUTF8('\u0003mozilla.org'));
      assert.equal(equal, true, 'payload');
    });

    test('Returns null when first record has no MB bit set',
      function() {
        msg1[0] ^= 128;
        var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when last record has no ME bit set',
      function() {
        msg1[17] ^= 64;
        var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when not only last record has ME bit set',
      function() {

        msg1[7] ^= 64;
        var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when no record has ME bit set', function() {
      msg1[17] ^= 64;
      var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
      assert.isNull(parsed);
    });

    test('Returns null if MB is set for record other than first',
      function() {

        msg1[7] ^= 128;
        var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null if CF is set (not supported)',
      function() {

        msg1[0] ^= 32;
        var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Decodes multi record messages', function() {
      var parsed = NfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
      assert.isNotNull(parsed);
      assert.equal(parsed.length, 3);

      assert.equal(parsed[0].tnf, 1);
      assert.equal(parsed[1].tnf, 3);
      assert.equal(parsed[2].tnf, 4);

      assert.deepEqual(parsed[0].type, [0x55], 'type 0');
      assert.deepEqual(parsed[1].type, [0xAA, 0xBB], 'type 1');
      assert.deepEqual(parsed[2].type, [0x55], 'type 2');

      assert.deepEqual(parsed[0].payload,
        [0x03, 0x6D, 0x6F], 'payload 0');
      assert.deepEqual(parsed[1].payload,
        [0x02, 0xAD, 0x8F, 0x71, 0x96], 'payload 1');
      assert.deepEqual(parsed[2].payload,
        [0xFF, 0x12, 0x9A, 0xA7, 0x11, 0xDC, 0xA8], 'payload 2');
    });
  });

  suite('parseNDEFRecord', function() {
    var record;

    setup(function() {
      // URI record, "http://mozilla.com"
      record = [0xD1, 0x01, 0x0C, 0x55,
                0x03, 0x6D, 0x6F, 0x7A,
                0x69, 0x6C, 0x6C, 0x61,
                0x2E, 0x6F, 0x72, 0x67];
    });

    test('Supports records with ID', function() {
      // URI record, "http://mozilla.com"
      // id = [0x01, 0x02, 0x03, 0x04]
      var record = [0xD9, 0x01, 0x0C, 0x04,
                    0x55, 0x01, 0x02, 0x03,
                    0x04, 0x03, 0x6D, 0x6F,
                    0x7A, 0x69, 0x6C, 0x6C,
                    0x61, 0x2E, 0x6F, 0x72,
                    0x67];
      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.deepEqual(parsed.id, [0x01, 0x02, 0x03, 0x04]);
    });

    test('Supports records without ID', function() {
      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.deepEqual(parsed.id, []);
    });

    test('Supports long records (no SR bit set)', function() {
      var record = [0xC1, 0x01, 0x00, 0x00, 0x01, 0x1C, 0x55];
      var payload = new Array(284);
      for (var i = 0; i < payload.length; i += 1) {
        payload[i] = 7;
      }
      record = record.concat(payload);

      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.deepEqual(parsed.payload, payload);
    });

    test('Decodes TNF', function() {
      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.equal(parsed.tnf, 1);

      record[0] ^= 1;
      record[0] |= 5;
      parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.equal(parsed.tnf, 5);
    });

    test('Decodes type', function() {
      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.deepEqual(parsed.type, [0x55]);
    });

    test('Decodes payload', function() {
      var parsed = NfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.deepEqual(parsed.payload, [0x03, 0x6D, 0x6F, 0x7A, 0x69,
                                        0x6C, 0x6C, 0x61, 0x2E, 0x6F,
                                        0x72, 0x67]);
    });
  });

  suite('NDEFUtils', function() {
     test('Encode and Parse Handover Request', function() {
      var mac = '01:02:03:04:05:06';
      var cps = 0x2;
      var hrNDEFs1 = NDEFUtils.encodeHandoverRequest(mac, cps);
      assert.equal(!!hrNDEFs1, true);
      var hrNDEFU8a1 = NfcUtils.encodeNDEF(hrNDEFs1);
      assert.equal(!!hrNDEFU8a1, true);

      var buf = new NfcBuffer(hrNDEFU8a1);
      var hrNDEFs2 = NfcUtils.parseNDEF(buf);
      assert.equal(!!hrNDEFs2, true);

      var hrNDEFU8a2 = NfcUtils.encodeNDEF(hrNDEFs2);
      assert.equal(!!hrNDEFU8a2, true);

      var equal1 = NfcUtils.equalArrays(hrNDEFU8a2, hrNDEFU8a1);
      assert.equal(equal1, true);
    });

    test('Encode and Parse Handover Select', function() {
      var mac = '01:02:03:04:05:06';
      var cps = 0x2;
      var hsNDEFs1 = NDEFUtils.encodeHandoverSelect(mac, cps);
      assert.equal(!!hsNDEFs1, true);

      var hsNDEFU8a1 = NfcUtils.encodeNDEF(hsNDEFs1);
      assert.equal(!!hsNDEFU8a1, true);

      var buf = new NfcBuffer(hsNDEFU8a1);
      var hsNDEFs2 = NfcUtils.parseNDEF(buf);
      assert.equal(!!hsNDEFs2, true);

      var hsNDEFU8a2 = NfcUtils.encodeNDEF(hsNDEFs2);
      assert.equal(!!hsNDEFU8a2, true);

      var equal1 = NfcUtils.equalArrays(hsNDEFU8a2, hsNDEFU8a1);
      assert.equal(equal1, true);
    });
  });
});

suite('NfcBuffer', function() {
  var arr;
  var buf;

  setup(function() {
    arr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    buf = new NfcBuffer(arr);
  });

  test('getOctet()', function() {
    assert.equal(0, buf.getOctet());
    assert.equal(1, buf.getOctet());
    assert.equal(2, buf.getOctet());
    assert.equal(3, buf.getOctet());
  });

  test('getOctetArray()', function() {
    assert.deepEqual([0, 1, 2], buf.getOctetArray(3));
    assert.deepEqual([3], buf.getOctetArray(1));
    assert.deepEqual([4, 5, 6, 7], buf.getOctetArray(4));
    assert.deepEqual([], buf.getOctetArray(0));
  });

  test('skip()', function() {
    buf.skip(2);
    assert.equal(2, buf.getOctet());
    buf.skip(3);
    assert.equal(6, buf.getOctet());
    buf.skip(0);
    assert.equal(7, buf.getOctet());
  });

  test('peek()', function() {
    assert.equal(buf.peek(), 0);
    assert.equal(buf.peek(), 0);
    assert.equal(buf.peek(), 0);
    buf.getOctet();
    assert.equal(buf.peek(), 1);
    assert.equal(buf.peek(), 1);
  });

  test('len is required', function() {
    assert.throws(function() {
      buf.getOctetArray();
    });

    assert.throws(function() {
      buf.skip();
    });
  });

  test('getOctetArray() throws when len is negative', function() {
    assert.throws(function() {
      buf.getOctetArray(-1);
    }, Error);
  });

  test('skip() throws when len is negative', function() {
    assert.throws(function() {
      buf.skip(-1);
    });
  });

  test('getOctetArray() throws on attempt to read too many octets',
    function() {

    assert.throws(function() {
      buf.getOctetArray(arr.length + 1);
    }, Error);
  });

  test('getOctet() throws on attempt to read after last octet', function() {
    buf.skip(arr.length);

    assert.throws(function() {
      buf.getOctet();
    }, Error);
  });

  test('skip() throws when after last octet', function() {
    buf.skip(arr.length);

    assert.throws(function() {
      buf.skip(1);
    }, Error);
  });
});
