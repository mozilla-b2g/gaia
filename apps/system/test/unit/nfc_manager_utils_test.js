'use strict';

mocha.globals(['NfcManagerUtils']);

/* globals MocksHelper, NfcManagerUtils, NDEF, NfcUtils */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/js/nfc_utils.js');
requireApp('system/js/nfc_manager_utils.js');

var mocksForNfcUtils = new MocksHelper([
  'MozNDEFRecord'
]).init();

suite('encodeHandoverSelect() tests', function() {

  mocksForNfcUtils.attachTestHelpers();

  var recordsDefault;
  var btMac;
  var btName;

  setup(function() {
    /*
     * The following NDEF message contains a static handover request
     * from a Motorola UE Mini Boom. The NDEF message encodes the
     * MAC address(00:0D:44:E7:95:AB) and its name (UE MINI BOOM).
     */
    btMac = '00:0D:44:E7:95:AB';
    btName = NfcUtils.fromUTF8('UE MINI BOOM');

    recordsDefault = [{
      tnf: NDEF.TNF_WELL_KNOWN,
      type: new Uint8Array([72, 115]),
      id: new Uint8Array(),
      payload: new Uint8Array([18, 209, 2, 4, 97, 99, 1, 1, 48, 0])
    }, {
      tnf: NDEF.TNF_MIME_MEDIA,
      type: new Uint8Array([97, 112, 112, 108, 105, 99, 97, 116, 105,
                            111, 110, 47, 118, 110, 100, 46, 98, 108, 117,
                            101, 116, 111, 111, 116, 104, 46, 101, 112,
                            46, 111, 111, 98]),
      id: new Uint8Array([48]),
      payload: new Uint8Array([22, 0, 171, 149, 231, 68, 13, 0, 13, 9, 85,
                               69, 32, 77, 73, 78, 73, 32, 66, 79,
                               79, 77])
    }];
  });

  test('With MAC, CPS and device name', function() {
    var records = NfcManagerUtils.encodeHandoverSelect(btMac, 1, btName);
    assert.deepEqual(records, recordsDefault);
  });

  test('With MAC and CPS only', function() {
    recordsDefault[1].payload =
      new Uint8Array([8, 0, 171, 149, 231, 68, 13, 0]);
    var records = NfcManagerUtils.encodeHandoverSelect(btMac, 1);
    assert.deepEqual(records, recordsDefault);
  });

  test('Encodes CPS', function() {
    var records, cps;

    cps = 0;
    records = NfcManagerUtils.encodeHandoverSelect(btMac, cps, btName);
    assert.equal(records[0].payload[6], cps);

    cps = 2;
    records = NfcManagerUtils.encodeHandoverSelect(btMac, cps, btName);
    assert.equal(records[0].payload[6], cps);
  });

  test('Returns null when MAC invalid', function() {
    var invalidMAC = 'AB:CD';
    var records = NfcManagerUtils.encodeHandoverSelect(invalidMAC, 1);
    assert.isNull(records);
  });

  test('Returns null when CPS invalid', function() {
    var invalidCPS = 5;
    var records = NfcManagerUtils.encodeHandoverSelect(btMac, invalidCPS);
    assert.isNull(records);
  });
});
