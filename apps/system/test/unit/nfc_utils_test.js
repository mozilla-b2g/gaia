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

  setup(function() {
    string1 = 'StringTestString ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    uint8array1 = new Uint8Array([0x53, 0x74, 0x72, 0x69, 0x6e, 0x67,
                                  0x54, 0x65, 0x73, 0x74,
                                  0x53, 0x74, 0x72, 0x69, 0x6e, 0x67,
                                  0x20,
                                  0x41, 0x42, 0x43, 0x44, 0x45, 0x46,
                                  0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c,
                                  0x4d, 0x4e, 0x4f, 0x50, 0x51, 0x52,
                                  0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
                                  0x59, 0x5a]);
  });

  test('equalArrays', function() {
    assert.isTrue(NfcUtils.equalArrays(NfcUtils.fromUTF8(string1),
                                       uint8array1));
    assert.isFalse(NfcUtils.equalArrays(null, null));
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

  suite('String <> byte conversions', function() {
    test('UTF16BytesToString', function() {
      assert.equal('©', NfcUtils.UTF16BytesToString([0xFE, 0xFF, 0x00, 0xA9]));
      assert.equal('©', NfcUtils.UTF16BytesToString([0xFF, 0xFE, 0xA9, 0x00]));
      assert.equal('ą', NfcUtils.UTF16BytesToString([0x01, 0x05]));

      var foxArr = [0x00, 0x42, 0x00, 0x69, 0x00, 0x67, 0x00, 0x20, 0x00, 0x62,
                    0x00, 0x72, 0x00, 0x6F, 0x00, 0x77, 0x00, 0x6E, 0x00, 0x20,
                    0x00, 0x66, 0x00, 0x6F, 0x00, 0x78, 0x00, 0x21, 0x00, 0x20,
                    0x00, 0x44, 0x00, 0x75, 0x01, 0x7C, 0x00, 0x79, 0x00, 0x20,
                    0x00, 0x62, 0x00, 0x72, 0x01, 0x05, 0x00, 0x7A, 0x00, 0x6F,
                    0x00, 0x77, 0x00, 0x79, 0x00, 0x20, 0x00, 0x6C, 0x00, 0x69,
                    0x00, 0x73, 0x00, 0x3F];
      var foxTxt = 'Big brown fox! Duży brązowy lis?';
      assert.equal(foxTxt, NfcUtils.UTF16BytesToString(foxArr));
    });
  });

  suite('NDEF Conversions', function() {
    var urlNDEF; // MozNDEFRecord
    var urlU8a; // Uint8Array

    setup(function() {
      var tnf     = NDEF.TNF_WELL_KNOWN;
      var type    = NDEF.RTD_URI;
      var id      = new Uint8Array(); // no id.
      // Short Record, 0x3 or "http://"
      var payload = new Uint8Array(NfcUtils.fromUTF8(
                                   '\u0003mozilla.org'));

      urlNDEF = new MozNDEFRecord(tnf, type, id, payload);

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

    test('encodeNDEF Subrecord', function() {
      var encodedNdefU8a = NfcUtils.encodeNDEF([urlNDEF]);
      // MozNDEFRecord is abstract, and does not contain some extra bits in the
      // header for NDEF payload subrecords:
      var cpUrlU8a = new Uint8Array(encodedNdefU8a);
      cpUrlU8a[0] = cpUrlU8a[0] & NDEF.TNF;

      var equals1 = NfcUtils.equalArrays(encodedNdefU8a, urlU8a);
      assert.equal(equals1, true);
    });

    test('parseNDEF Subrecord', function() {
      var buf = new NfcBuffer(urlU8a);
      var ndefrecords = NfcUtils.parseNDEF(buf);
      var equal;
      // There is only one record here:
      assert.equal(ndefrecords[0].tnf, NDEF.TNF_WELL_KNOWN);
      equal = NfcUtils.equalArrays(ndefrecords[0].type, NDEF.RTD_URI);
      assert.equal(equal, true);

      equal = NfcUtils.equalArrays(ndefrecords[0].id, new Uint8Array());
      assert.equal(equal, true);

      equal = NfcUtils.equalArrays(ndefrecords[0].payload,
                                 NfcUtils.fromUTF8('\u0003mozilla.org'));
      assert.equal(equal, true);
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
