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

  function assertArraysEqual(test, expected, msg) {
    for (var i = 0; i < test.length; i++ ) {
      assert.equal(test[i], expected[i], 
        (msg || 'Arrays not equal') + ' at position: ' + i);
    }
  }

  mocksForNfcUtils.attachTestHelpers();

  var nfcUtils;
  var string1;
  var uint8array1;
  var urlU8a; // Uint8Array

  setup(function() {
    nfcUtils = new NfcUtils();
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
    var u8a = nfcUtils.fromUTF8(string1);
    var str = nfcUtils.toUTF8(uint8array1);
    var backStr = nfcUtils.toUTF8(u8a);
    var backU8a = nfcUtils.fromUTF8(str);
    var nullObj = nfcUtils.toUTF8(null);
    var nullStr = nfcUtils.fromUTF8(null);

    var u1 = nfcUtils.equalArrays(u8a, uint8array1);
    var s1 = nfcUtils.equalArrays(str, string1);
    var bs1 = nfcUtils.equalArrays(string1, backStr);
    var bs2 = nfcUtils.equalArrays(str, backStr);
    var bu1 = nfcUtils.equalArrays(u8a, backU8a);
    var bu2 = nfcUtils.equalArrays(uint8array1, backU8a);

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
      assert.isFalse(nfcUtils.equalArrays());
      assert.isFalse(nfcUtils.equalArrays(null));
      assert.isFalse(nfcUtils.equalArrays(null, null));
      assert.isFalse(nfcUtils.equalArrays(undefined, null));
    });

    test('Accepts non-array objects', function() {
      assert.isFalse(nfcUtils.equalArrays({}, [1]));
    });

    test('Compares arrays', function() {
      assert.isFalse(nfcUtils.equalArrays([1, 2, 3], [1, 3, 2]));
      assert.isFalse(nfcUtils.equalArrays([1, 2, 3], [1]));

      assert.isTrue(nfcUtils.equalArrays([1, 2, 3], [1, 2, 3]));
      assert.isTrue(nfcUtils.equalArrays([1, 2, 3], new Uint8Array([1, 2, 3])));
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
      assert.equal(cprght, nfcUtils.UTF16BytesToStr(cprghtUTF16BE));
      assert.equal(cprght, nfcUtils.UTF16BytesToStr(cprghtUTF16BEBOM));
      assert.equal(cprght, nfcUtils.UTF16BytesToStr(cprghtUTF16LEBOM));

      assert.equal(plchr, nfcUtils.UTF16BytesToStr(plchrUTF16BE));
      assert.equal(hai, nfcUtils.UTF16BytesToStr(haiUTF16BE));
      assert.equal(foxTxt, nfcUtils.UTF16BytesToStr(foxTxtUTF16BE));
    });

    test('strToUTF16Bytes', function() {
      assert.deepEqual(cprghtUTF16BE, nfcUtils.strToUTF16Bytes(cprght));
      assert.deepEqual(plchrUTF16BE, nfcUtils.strToUTF16Bytes(plchr));
      assert.deepEqual(haiUTF16BE, nfcUtils.strToUTF16Bytes(hai));
      assert.deepEqual(foxTxtUTF16BE, nfcUtils.strToUTF16Bytes(foxTxt));
    });
  });

  suite('encodeNDEF', function() {
    var urlNDEF; // MozNDEFRecord

    setup(function() {
      var tnf     = NDEF.TNF_WELL_KNOWN;
      var type    = NDEF.RTD_URI;
      // Short Record, 0x3 or "http://"
      var payload = new Uint8Array(nfcUtils.fromUTF8(
                                   '\u0003mozilla.org'));

      urlNDEF = new MozNDEFRecord({tnf: tnf, type: type, payload: payload});
    });

    test('Subrecord', function() {
      var encodedNdefU8a = nfcUtils.encodeNDEF([urlNDEF]);
      // MozNDEFRecord is abstract, and does not contain some extra bits in the
      // header for NDEF payload subrecords:
      var cpUrlU8a = new Uint8Array(encodedNdefU8a);
      cpUrlU8a[0] = cpUrlU8a[0] & NDEF.TNF;

      var equals1 = nfcUtils.equalArrays(encodedNdefU8a, urlU8a);
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
      var ndefRecord = new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                          type: NDEF.RTD_URI,
                                          payload: payload});

      var result = nfcUtils.encodeNDEF([ndefRecord]);
      assertArraysEqual(result, ndefMsg);
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

      var ndefRecord = new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                          type: NDEF.RTD_TEXT,
                                          payload: payload});

      var result = nfcUtils.encodeNDEF([ndefRecord]);
      assertArraysEqual(result, ndefMsg);
    });

    test('No type, no paylod, no id', function() {
      var ndefMsg = new Uint8Array([0xd0, 0x00, 0x00]);

      var result = nfcUtils.encodeNDEF([new MozNDEFRecord()]);
      assertArraysEqual(result, ndefMsg);
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
      var rec1 = new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                    type: NDEF.RTD_URI,
                                    payload: payload1});

      var payload2 = new Uint8Array([0x03, 0x6d, 0x6f, 0x7a, 0x69, 0x6c, 0x6c,
                                     0x61, 0x2e, 0x6f, 0x72, 0x67]);
      var rec2 = new MozNDEFRecord({tnf: NDEF.TNF_WELL_KNOWN,
                                    type: NDEF.RTD_URI,
                                    payload: payload2});

      var result = nfcUtils.encodeNDEF([rec1, rec2]);
      assertArraysEqual(result, ndefMsg);
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
      var ndefrecords = nfcUtils.parseNDEF(buf);
      var equal;

      // There is only one record here:
      assert.equal(ndefrecords[0].tnf, NDEF.TNF_WELL_KNOWN);
      equal = nfcUtils.equalArrays(ndefrecords[0].type, NDEF.RTD_URI);
      assert.equal(equal, true, 'type');

      equal = nfcUtils.equalArrays(ndefrecords[0].id, new Uint8Array());
      assert.equal(equal, true, 'id');

      equal = nfcUtils.equalArrays(ndefrecords[0].payload,
                                 nfcUtils.fromUTF8('\u0003mozilla.org'));
      assert.equal(equal, true, 'payload');
    });

    test('Returns null when first record has no MB bit set',
      function() {
        msg1[0] ^= 128;
        var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when last record has no ME bit set',
      function() {
        msg1[17] ^= 64;
        var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when not only last record has ME bit set',
      function() {

        msg1[7] ^= 64;
        var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null when no record has ME bit set', function() {
      msg1[17] ^= 64;
      var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
      assert.isNull(parsed);
    });

    test('Returns null if MB is set for record other than first',
      function() {

        msg1[7] ^= 128;
        var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Returns null if CF is set (not supported)',
      function() {

        msg1[0] ^= 32;
        var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
        assert.isNull(parsed);
    });

    test('Decodes multi record messages', function() {
      var parsed = nfcUtils.parseNDEF(new NfcBuffer(new Uint8Array(msg1)));
      assert.isNotNull(parsed);
      assert.equal(parsed.length, 3);

      assert.equal(parsed[0].tnf, NDEF.TNF_WELL_KNOWN);
      assert.equal(parsed[1].tnf, NDEF.TNF_ABSOLUTE_URI);
      assert.equal(parsed[2].tnf, NDEF.TNF_EXTERNAL_TYPE);

      assertArraysEqual(parsed[0].type, [0x55], 'type 0');
      assertArraysEqual(parsed[1].type, [0xAA, 0xBB], 'type 1');
      assertArraysEqual(parsed[2].type, [0x55], 'type 2');

      assertArraysEqual(parsed[0].payload,
        [0x03, 0x6D, 0x6F], 'payload 0');
      assertArraysEqual(parsed[1].payload,
        [0x02, 0xAD, 0x8F, 0x71, 0x96], 'payload 1');
      assertArraysEqual(parsed[2].payload,
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
      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assertArraysEqual(parsed.id, [0x01, 0x02, 0x03, 0x04]);
    });

    test('Supports records without ID', function() {
      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assertArraysEqual(parsed.id, []);
    });

    test('Supports long records (no SR bit set)', function() {
      var record = [0xC1, 0x01, 0x00, 0x00, 0x01, 0x1C, 0x55];
      var payload = new Array(284);
      for (var i = 0; i < payload.length; i += 1) {
        payload[i] = 7;
      }
      record = record.concat(payload);

      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assertArraysEqual(parsed.payload, payload);
    });

    test('Decodes TNF', function() {
      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.equal(parsed.tnf, NDEF.TNF_WELL_KNOWN);

      record[0] ^= 1;
      record[0] |= 5;
      parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assert.equal(parsed.tnf, NDEF.TNF_UNKNOWN);
    });

    test('Decodes type', function() {
      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assertArraysEqual(parsed.type, [0x55]);
    });

    test('Decodes payload', function() {
      var parsed = nfcUtils._parseNDEFRecord(new NfcBuffer(record));
      assert.isNotNull(parsed);
      assertArraysEqual(parsed.payload, [0x03, 0x6D, 0x6F, 0x7A, 0x69,
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
      var hrNDEFU8a1 = nfcUtils.encodeNDEF(hrNDEFs1);
      assert.equal(!!hrNDEFU8a1, true);

      var buf = new NfcBuffer(hrNDEFU8a1);
      var hrNDEFs2 = nfcUtils.parseNDEF(buf);
      assert.equal(!!hrNDEFs2, true);

      var hrNDEFU8a2 = nfcUtils.encodeNDEF(hrNDEFs2);
      assert.equal(!!hrNDEFU8a2, true);

      var equal1 = nfcUtils.equalArrays(hrNDEFU8a2, hrNDEFU8a1);
      assert.equal(equal1, true);
    });

    test('Encode and Parse Handover Select', function() {
      var mac = '01:02:03:04:05:06';
      var cps = 0x2;
      var hsNDEFs1 = NDEFUtils.encodeHandoverSelect(mac, cps);
      assert.equal(!!hsNDEFs1, true);

      var hsNDEFU8a1 = nfcUtils.encodeNDEF(hsNDEFs1);
      assert.equal(!!hsNDEFU8a1, true);

      var buf = new NfcBuffer(hsNDEFU8a1);
      var hsNDEFs2 = nfcUtils.parseNDEF(buf);
      assert.equal(!!hsNDEFs2, true);

      var hsNDEFU8a2 = nfcUtils.encodeNDEF(hsNDEFs2);
      assert.equal(!!hsNDEFU8a2, true);

      var equal1 = nfcUtils.equalArrays(hsNDEFU8a2, hsNDEFU8a1);
      assert.equal(equal1, true);
    });
  });
});

suite('NfcBuffer', function() {
  var arr;
  var buf;

  function assertArraysEqual(test, expected, msg) {
    for (var i = 0; i < test.length; i++ ) {
      assert.equal(test[i], expected[i], 
        (msg || 'Arrays not equal') + ' at position: ' + i);
    }
  }

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
    assertArraysEqual([0, 1, 2], buf.getOctetArray(3));
    assertArraysEqual([3], buf.getOctetArray(1));
    assertArraysEqual([4, 5, 6, 7], buf.getOctetArray(4));
    assertArraysEqual([], buf.getOctetArray(0));
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

suite('NDEF.payload', function() {
  var nfcUtils;
  mocksForNfcUtils.attachTestHelpers();

  setup(function() {
    nfcUtils = new NfcUtils();
  });

  suite('decode()', function() {
    test('TNF empty', function() {
      var decoded = NDEF.payload.decode(NDEF.TNF_EMPTY, undefined, undefined);
      assert.deepEqual(decoded, {type: 'empty'});
    });

    test('TNF well known', function() {
      var stubDecodeWellKnown = this.sinon.stub(NDEF.payload,
                                                'decodeWellKnown');
      NDEF.payload.decode(NDEF.TNF_WELL_KNOWN, NDEF.RTD_URI, 'payload');
      assert.isTrue(stubDecodeWellKnown.withArgs(NDEF.RTD_URI, 'payload')
                                       .calledOnce);
    });

    test('TNF mime media-type', function() {
      // text/plain
      var type = new Uint8Array([0x74, 0x65, 0x78, 0x74,
                                 0x2F, 0x70, 0x6C, 0x61,
                                 0x69, 0x6E]);
      // What up?!
      var payload = new Uint8Array([0x57, 0x68, 0x61, 0x74,
                                    0x20, 0x75, 0x70, 0x3F,
                                    0x21]);

      var stubDecodeMIME = this.sinon.stub(NDEF.payload, 'decodeMIME');

      NDEF.payload.decode(NDEF.TNF_MIME_MEDIA, type, payload);
      assert.isTrue(stubDecodeMIME.withArgs(type, payload).calledOnce);
    });

    test('TNF absolute uri', function() {
      // TNF_ABSOLUTE_URI has uri in the type
      var type = new Uint8Array([0x68, 0x74, 0x74, 0x70,
                                 0x3A, 0x2F, 0x2F, 0x6D,
                                 0x6F, 0x7A, 0x69, 0x6C,
                                 0x6C, 0x61, 0x2E, 0x6F,
                                 0x72, 0x67]);

      var decoded = NDEF.payload.decode(NDEF.TNF_ABSOLUTE_URI, type, null);
      assert.deepEqual(decoded, { type: 'http://mozilla.org' });
    });

    test('TNF external type', function() {
      var type = new Uint8Array([0x6D, 0x6F, 0x7A, 0x69,
                                 0x6C, 0x6C, 0x61, 0x2E,
                                 0x6F, 0x72, 0x67, 0x3A,
                                 0x62, 0x75, 0x67]);

      var decoded = NDEF.payload.decode(NDEF.TNF_EXTERNAL_TYPE, type, null);
      assert.deepEqual(decoded, { type: 'mozilla.org:bug' });
    });

    test('TNF unknown', function() {
      var decUnknown = NDEF.payload.decode(NDEF.TNF_UNKNOWN, null, 'data1');
      assert.deepEqual(decUnknown, {}, 'should be empty initialized object');
    });

    test('TNF unchanged', function() {
      var decoded = NDEF.payload.decode(NDEF.TNF_UNCHANGED, null, 'data');
      assert.equal(decoded, null);
    });
  }),

  suite('decodeWellKnown()', function() {
    test('RTD Text', function() {
      var stubDecodeText = this.sinon.stub(NDEF.payload, 'decodeText');

      NDEF.payload.decodeWellKnown(NDEF.RTD_TEXT, 'payload');
      assert.isTrue(stubDecodeText.withArgs('payload').calledOnce);
    });

    test('RTD URI', function() {
      var stubDecodeURI = this.sinon.stub(NDEF.payload, 'decodeURI');

      NDEF.payload.decodeWellKnown(NDEF.RTD_URI, 'payload');
      assert.isTrue(stubDecodeURI.withArgs('payload').calledOnce);
    });

    test('RTD Smart Poster', function() {
      var stubDecodeSmartPoster = this.sinon.stub(NDEF.payload,
                                                  'decodeSmartPoster');

      NDEF.payload.decodeWellKnown(NDEF.RTD_SMART_POSTER, 'payload');
      assert.isTrue(stubDecodeSmartPoster.withArgs('payload').calledOnce);
    });

    test('Wrong RTD', function() {
      var decoded = NDEF.payload.decodeWellKnown('fake', 'payload');
      assert.equal(decoded, null);
    });
  }),

  suite('decodeText()', function() {
    test('UTF-8 en', function() {
      var payload = new Uint8Array([0x02, 0x65, 0x6E, 0x48,
                                    0x65, 0x79, 0x21, 0x20,
                                    0x55, 0x54, 0x46, 0x2D,
                                    0x38, 0x20, 0x65, 0x6E]);

      var decoded = NDEF.payload.decodeText(payload);
      assert.deepEqual(decoded, {
        type: 'text',
        text: 'Hey! UTF-8 en',
        language: 'en',
        encoding: 'UTF-8'
      });
    });

    test('UTF-16 en', function() {
      var payload = new Uint8Array([0x82, 0x65, 0x6E, 0xFF,
                                0xFE, 0x48, 0x00, 0x6F,
                                0x00, 0x21, 0x00, 0x20,
                                0x00, 0x55, 0x00, 0x54,
                                0x00, 0x46, 0x00, 0x2D,
                                0x00, 0x31, 0x00, 0x36,
                                0x00, 0x20, 0x00, 0x65,
                                0x00, 0x6E, 0x00]);

      var decoded = NDEF.payload.decodeText(payload);
      assert.deepEqual(decoded, {
        type: 'text',
        text: 'Ho! UTF-16 en',
        language: 'en',
        encoding: 'UTF-16'
      });
    });
  }),

  suite('decodeURI()', function() {
    test('https://', function() {
      var payload = new Uint8Array([0x04, 0x77, 0x69, 0x6B,
                                    0x69, 0x2E, 0x6D, 0x6F,
                                    0x7A, 0x69, 0x6C, 0x6C,
                                    0x61, 0x2E, 0x6F, 0x72,
                                    0x67]);

      var decoded = NDEF.payload.decodeURI(payload);
      assert.deepEqual(decoded, {
        type: 'uri',
        uri: 'https://wiki.mozilla.org'
      });
    });

    test('mailto:', function() {
      // \u0006 is short for mailto:
      var payload = nfcUtils.fromUTF8('\u0006jorge@borges.ar');

      var decoded = NDEF.payload.decodeURI(payload);
      assert.deepEqual(decoded, {
        type: 'uri',
        uri: 'mailto:jorge@borges.ar'
      });
    });

    test('tel:', function() {
      // \u0005 is short for tel:
      var payload = nfcUtils.fromUTF8('\u00050054267437');

      var decoded = NDEF.payload.decodeURI(payload);
      assert.deepEqual(decoded, {
        type: 'uri',
        uri: 'tel:0054267437'
      });
    });

    test('unabbreviated', function() {
      var payload = nfcUtils.fromUTF8('\u0000http://mozilla.com');

      var decoded = NDEF.payload.decodeURI(payload);
      assert.deepEqual(decoded, {
        type: 'uri',
        uri: 'http://mozilla.com'
      });
    });
  }),

  suite('decodeSmartPoster()', function() {
    /**
     * Constructs a NDEF message with one record. This record
     * is a smart poster, so it contains multiple subrecords
     * in the payload, encoded as bytes.
     *
     * Accepts 3*N arguments, where:
     *  3*(N + 0) argument - TNF of the record
     *  3*(N + 1) argument - type given as string
     *  3*(N + 2) argument - payload, given as Uint8Array
     */
    var makePoster = function() {
      var records = [];
      for (var arg = 0; arg < arguments.length; arg += 3) {
        records.push({
          tnf: arguments[arg],
          type: nfcUtils.fromUTF8(arguments[arg + 1]),
          payload: arguments[arg + 2],
          id: new Uint8Array()
        });
      }

      var payload = nfcUtils.encodeNDEF(records);
      return [{
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_SMART_POSTER,
        id: new Uint8Array(),
        payload: new Uint8Array(payload)
      }];
    };

    var recordURI,
        recordTextEnglish,
        recordTextPolish,
        recordAction,
        recordIcon;

    setup(function() {
      // URI "http://www.youtube.com" with abbreviation
      // for "http://www."
      recordURI = [
        0x01,  // Payload: abbreviation
        0x79, 0x6F, 0x75, 0x74, // 'yout'
        0x75, 0x62, 0x65, 0x2E, // 'ube.'
        0x63, 0x6F, 0x6D        // 'com'
      ];

      // Text record with contents: "Best page ever!  q#@"
      // and language code: "en"
      recordTextEnglish = [
        0x02,  // Status byte: UTF-8, two byte lang code
        0x65, 0x6E, // ISO language code: 'en'
        0x42, 0x65, 0x73, 0x74, // 'Best'
        0x20, 0x70, 0x61, 0x67, // ' pag'
        0x65, 0x20, 0x65, 0x76, // 'e ev'
        0x65, 0x72, 0x21, 0x20, // 'er! '
        0x20, 0x71, 0x23, 0x40  // ' q#@'
      ];

      // Text record with contents: "ąćńó"
      // and language code: "pl"
      recordTextPolish = [
       0x02,  // Status byte: UTF-8, two byte lang code
       0x70, 0x6C, // ISO language code: 'pl'
       0xC4, 0x85, 0xC4, 0x87, // 'ąć'
       0xC5, 0x84, 0xC3, 0xB3  // 'ńó'
      ];

      // Action record with action = 0
      recordAction = [0x00];

      // Icon record with simple 4x4 PNG image.
      recordIcon = [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x04,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x26, 0x93, 0x09,
        0x29, 0x00, 0x00, 0x00, 0x1b, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x03, 0x0c, 0x30, 0xc2, 0x39, 0x8c, 0x8c, 0x8c,
        0x4c, 0x10, 0x0a, 0x2a, 0x85, 0xac, 0x0c, 0x00,
        0x26, 0x0b, 0x09, 0x01, 0xc3, 0xd1, 0x9a, 0x7b,
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
        0xae, 0x42, 0x60, 0x82
      ];
    });

    test('Decodes simple poster', function() {
      var poster = makePoster(NDEF.TNF_WELL_KNOWN, 'U', recordURI);
      var decoded = NDEF.payload.decodeSmartPoster(poster[0].payload);
      assert.equal(decoded.type, 'smartposter');
      assert.equal(decoded.uri, 'http://www.youtube.com');
    });

    test('Decodes extra records', function() {
      var poster = makePoster(NDEF.TNF_WELL_KNOWN, 'U', recordURI,
                              NDEF.TNF_WELL_KNOWN, 'T', recordTextEnglish,
                              NDEF.TNF_WELL_KNOWN, 'T', recordTextPolish,
                              NDEF.TNF_WELL_KNOWN, 'act', recordAction,
                              NDEF.TNF_MIME_MEDIA, 'image/png', recordIcon);

      var decoded = NDEF.payload.decodeSmartPoster(poster[0].payload);
      assert.equal(decoded.uri, 'http://www.youtube.com');
      assert.equal(decoded.text.en, 'Best page ever!  q#@');
      assert.equal(decoded.text.pl, 'ąćńó');
      assert.equal(decoded.icons.length, 1);
      assert.equal(decoded.icons[0].type, 'image/png');
      assert.isTrue(nfcUtils.equalArrays(decoded.icons[0].bytes,
                                         recordIcon));
    });

    test('Does not handle poster with multiple URIs', function() {
      var poster = makePoster(NDEF.TNF_WELL_KNOWN, 'U', recordURI,
                              NDEF.TNF_WELL_KNOWN, 'U', recordURI);

      var decoded = NDEF.payload.decodeSmartPoster(poster[0].payload);
      assert.equal(decoded, null);
    });

    test('Does not handle poster with no URI', function() {
      var poster = makePoster(NDEF.TNF_WELL_KNOWN, 'T', recordTextEnglish,
                              NDEF.TNF_WELL_KNOWN, 'act', recordAction);

      var decoded = NDEF.payload.decodeSmartPoster(poster[0].payload);
      assert.equal(decoded, null);
    });

    test('Does not handle poster with multiple title ' +
      'records in the same language', function() {

      var poster = makePoster(NDEF.TNF_WELL_KNOWN, 'U', recordURI,
                              NDEF.TNF_WELL_KNOWN, 'T', recordTextEnglish,
                              NDEF.TNF_WELL_KNOWN, 'T', recordTextEnglish);

      var decoded = NDEF.payload.decodeSmartPoster(poster[0].payload);
      assert.equal(decoded, null);
    });
  });

  suite('decodeMIME()', function() {
    suite('vcards', function() {
      var vcardTxt = 'BEGIN:VCARD\nVERSION:2.1\nN:J;\nEND:VCARD';
      var payload;
      var decoded;

      setup(function() {
        payload = nfcUtils.fromUTF8(vcardTxt);
        decoded = {
          type: 'text/vcard',
          blob: new Blob([vcardTxt], {type: 'text/vcard'})
        };
      });

      test('text/vcard', function() {
        var vcard = NDEF.payload.decodeMIME(nfcUtils.fromUTF8('text/vcard'),
                                            payload);
        assert.deepEqual(decoded, vcard);
      });

      test('text/x-vCard', function() {
        var vcard = NDEF.payload.decodeMIME(nfcUtils.fromUTF8('text/x-vCard'),
                                            payload);
        assert.deepEqual(decoded, vcard);
      });

      test('text/x-vcard', function() {
        var vcard = NDEF.payload.decodeMIME(nfcUtils.fromUTF8('text/x-vcard'),
                                            payload);
        assert.deepEqual(decoded, vcard);
      });
    });

    test('other', function() {
      var decoded = NDEF.payload.decodeMIME(nfcUtils.fromUTF8('text/plain'),
                                             'payload');
      assert.deepEqual(decoded, { type: 'text/plain' });
    });
  });
});
