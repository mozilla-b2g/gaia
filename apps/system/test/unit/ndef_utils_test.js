'use strict';

/* globals MocksHelper, NDEFUtils, NDEF, NfcUtils */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/js/nfc_utils.js');
requireApp('system/js/ndef_utils.js');

var mocksForNfcUtils = new MocksHelper([
  'MozNDEFRecord'
]).init();

suite('NDEFUtils tests', function() {

  mocksForNfcUtils.attachTestHelpers();

  suite('Helper functions tests', function() {
    test('parseMAC()', function() {
      assert.isNull(NDEFUtils.parseMAC(null));
      assert.isNull(NDEFUtils.parseMAC(''));
      assert.isNull(NDEFUtils.parseMAC('lorem ipsum'));
      assert.isNull(NDEFUtils.parseMAC('ab:cd:ef:gh:ij:kl'));
      assert.isNull(NDEFUtils.parseMAC('ab:cd:ef:12:34'));
      assert.isNull(NDEFUtils.parseMAC(':::::'));
      assert.isNull(NDEFUtils.parseMAC('0:12:12:12:12:12'));

      assert.isNotNull(NDEFUtils.parseMAC('01:23:45:67:89:AB'));
      assert.isNotNull(NDEFUtils.parseMAC('01:23:45:67:89:ab'));
    });

    test('validateCPS()', function() {
      assert.isFalse(NDEFUtils.validateCPS(-1));
      assert.isFalse(NDEFUtils.validateCPS(4));

      assert.isTrue(NDEFUtils.validateCPS(NDEF.CPS_INACTIVE));
      assert.isTrue(NDEFUtils.validateCPS(NDEF.CPS_ACTIVE));
      assert.isTrue(NDEFUtils.validateCPS(NDEF.CPS_ACTIVATING));
      assert.isTrue(NDEFUtils.validateCPS(NDEF.CPS_UNKNOWN));
    });
  });

  suite('encodeHandoverRequest() tests', function() {
    var cps;
    var btMac;
    var stubMathRandom;

    setup(function() {
      cps = NDEF.CPS_ACTIVE;
      btMac = '00:0D:44:E7:95:AB';

      stubMathRandom = this.sinon.stub(Math, 'random');
      stubMathRandom.onCall(0).returns(0.1234567);
      stubMathRandom.onCall(1).returns(0.7654321);
    });

    teardown(function() {
      stubMathRandom.restore();
    });

    test('Encodes CPS', function() {
      var records;

      var cps1 = NDEF.CPS_INACTIVE;
      records = NDEFUtils.encodeHandoverRequest(btMac, cps1);
      assert.equal(records[0].payload[13], cps1);

      var cps2 = NDEF.CPS_ACTIVE;
      records = NDEFUtils.encodeHandoverRequest(btMac, cps2);
      assert.equal(records[0].payload[13], cps2);
    });

    test('Encodes MAC', function() {
      var records = NDEFUtils.encodeHandoverRequest(btMac, cps);

      var mac = '';
      for (var m = 7; m >= 2; m -= 1) {
        var n = records[1].payload[m];
        mac += (n < 0x10 ? '0' : '' ) + n.toString(16);
        if (m > 2) {
          mac += ':';
        }
      }

      assert.equal(mac.toUpperCase(), btMac);
    });

    test('Encodes random number for collision detection', function() {
      var request = NDEFUtils.encodeHandoverRequest(btMac, cps);

      assert.isTrue(stubMathRandom.calledTwice);

      var rndMSB = request[0].payload[6];
      var rndLSB = request[0].payload[7];

      assert.equal(rndMSB, 31);
      assert.equal(rndLSB, 195);
    });

    test('Returns null when MAC invalid', function() {
      var invalidMAC = 'AB:CD';
      var records = NDEFUtils.encodeHandoverRequest(invalidMAC, cps);
      assert.isNull(records);
    });

    test('Returns null when CPS invalid', function() {
      var invalidCPS = 5;
      var records = NDEFUtils.encodeHandoverRequest(btMac, invalidCPS);
      assert.isNull(records);
    });
  });

  suite('encodeHandoverSelect() tests', function() {

    var cps;
    var btMac;
    var btName;
    var recordsDefault;

    setup(function() {
      cps = NDEF.CPS_ACTIVE;
      btMac = '00:0D:44:E7:95:AB';
      btName = NfcUtils.fromUTF8('UE MINI BOOM');

      /*
       * The following NDEF message contains a static handover request
       * from a Motorola UE Mini Boom. The NDEF message encodes the
       * MAC address(00:0D:44:E7:95:AB) and its name (UE MINI BOOM).
       */
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
      var records = NDEFUtils.encodeHandoverSelect(btMac, cps, btName);
      assert.deepEqual(records, recordsDefault);
    });

    test('With MAC and CPS only', function() {
      recordsDefault[1].payload =
        new Uint8Array([8, 0, 171, 149, 231, 68, 13, 0]);
      var records = NDEFUtils.encodeHandoverSelect(btMac, cps);
      assert.deepEqual(records, recordsDefault);
    });

    test('Encodes CPS', function() {
      var records;

      var cps1 = NDEF.CPS_INACTIVE;
      records = NDEFUtils.encodeHandoverSelect(btMac, cps1, btName);
      assert.equal(records[0].payload[6], cps1);

      var cps2 = NDEF.CPS_ACTIVATING;
      records = NDEFUtils.encodeHandoverSelect(btMac, cps2, btName);
      assert.equal(records[0].payload[6], cps2);
    });

    test('Returns null when MAC invalid', function() {
      var invalidMAC = 'AB:CD';
      var records = NDEFUtils.encodeHandoverSelect(invalidMAC, cps);
      assert.isNull(records);
    });

    test('Returns null when CPS invalid', function() {
      var invalidCPS = 5;
      var records = NDEFUtils.encodeHandoverSelect(btMac, invalidCPS);
      assert.isNull(records);
    });
  });

});
