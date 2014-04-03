'use strict';

/* globals MocksHelper,
           MozNDEFRecord, NfcBuffer, NDEF, NfcManager, NfcManagerUtils, NfcUtils
*/

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_screen_manager.js');
requireApp('system/test/unit/mock_settingslistener_installer.js');
requireApp('system/js/nfc_manager_utils.js');
requireApp('system/js/nfc_manager.js');

var mocksForNfcUtils = new MocksHelper([
  'MozActivity',
  'MozNDEFRecord',
  'ScreenManager'
]).init();

suite('Nfc Utility functions', function() {

  mocksForNfcUtils.attachTestHelpers();

  suiteSetup(function() {
  });

  suite('nfc uint8array utils', function() {
    var string1;
    var uint8array1;

    suiteSetup(function() {
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
      var equals = NfcUtils.equalArrays(NfcUtils.fromUTF8(string1),
                                        uint8array1);
      assert.equal(equals, true);
    });

    test('transitive', function() {
      var u8a = NfcUtils.fromUTF8(string1);
      var str = NfcUtils.toUTF8(uint8array1);
      var backStr = NfcUtils.toUTF8(u8a);
      var backU8a = NfcUtils.fromUTF8(str);

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
    });

  });

  suite('NDEF Conversions', function() {
    var urlNDEF; // MozNDEFRecord
    var urlU8a; // Uint8Array

    suiteSetup(function() {
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
                               0x6f, 0x72, 0x67]); // SR: mozilla.org

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

    test('Encode and Parse Handover Request', function() {
      var mac = '01:02:03:04:05:06';
      var cps = 0x2;
      var rnd = 3141592654;
      var hrNDEFs1 = NfcManagerUtils.encodeHandoverRequest(mac, cps, rnd);
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
      var hsNDEFs1 = NfcManagerUtils.encodeHandoverSelect(mac, cps);
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

  suite('Activity Routing', function() {
    var vcard;
    var activityInjection1;
    var activityInjection2;
    var activityInjection3;

    setup(function() {
      vcard = 'BEGIN:VCARD\n';
      vcard += 'VERSION:2.1\n';
      vcard += 'N:Office;Mozilla;;;\n';
      vcard += 'FN:Mozilla Office\n';
      vcard += 'TEL;PREF:1-555-555-5555\n';
      vcard += 'END:VCARD';

      activityInjection1 = {
        type: 'techDiscovered',
        techList: ['P2P','NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/vcard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd17}'
      };
      activityInjection2 = {
        type: 'techDiscovered',
        techList: ['P2P','NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/x-vcard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd18}'
      };
      activityInjection3 = {
        type: 'techDiscovered',
        techList: ['P2P','NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NfcUtils.fromUTF8('text/x-vCard'),
          id: new Uint8Array(),
          payload: NfcUtils.fromUTF8(vcard)
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd19}'
      };
    });

    test('text/vcard', function() {
      var stubFormatVCardRecord = sinon.spy(NfcManager, 'formatVCardRecord');

      NfcManager.handleTechnologyDiscovered(activityInjection1);
      assert.isTrue(stubFormatVCardRecord.calledOnce);

      NfcManager.handleTechnologyDiscovered(activityInjection2);
      assert.isTrue(stubFormatVCardRecord.calledTwice);

      NfcManager.handleTechnologyDiscovered(activityInjection3);
      assert.isTrue(stubFormatVCardRecord.calledThrice);

      stubFormatVCardRecord.restore();
    });
  });

});
