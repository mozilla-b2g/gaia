'use strict';

/* globals MocksHelper, NDEFUtils, NDEF, NfcUtils,
           MozNDEFRecord */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/js/nfc_utils.js');
requireApp('system/js/ndef_utils.js');

var mocksForNfcUtils = new MocksHelper([
  'MozNDEFRecord'
]).init();

suite('NDEFUtils tests', function() {
  var nfcUtils;

  mocksForNfcUtils.attachTestHelpers();

  setup(function() {
    nfcUtils = new NfcUtils();
  });

  suite('Helper functions tests', function() {
    test('formatMAC()', function() {
      assert.isNull(NDEFUtils.formatMAC(null));
      assert.isNull(NDEFUtils.formatMAC([]));
      assert.isNull(NDEFUtils.formatMAC([1,2,3,4,5]));
      assert.isNull(NDEFUtils.formatMAC([1,2,3,4,5,6,7]));

      assert.equal(NDEFUtils.formatMAC([1,2,3,4,5,6]),
        '06:05:04:03:02:01');
      assert.equal(NDEFUtils.formatMAC([0xAB, 0xCD, 0xEF, 0, 1, 2]),
        '02:01:00:EF:CD:AB');

      var mac = [1,2,3,4,5,6];
      var mac2 = NDEFUtils.parseMAC(NDEFUtils.formatMAC(mac));
      assert.deepEqual(mac2, mac);
    });

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

  suite('parseHandoverNDEF() tests', function() {
    var mac;

    setup(function() {
      mac = '01:23:45:67:89:AB';
    });

    test('Transitive with encodeHandoverSelect()', function() {
      var cps = 2;
      var hin = NDEFUtils.encodeHandoverSelect(mac, cps);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.equal(hout.majorVersion, 1);
      assert.equal(hout.minorVersion, 2);
      assert.equal(hout.type, 'Hs');
      // Only one AC record (for Bluetooth).
      assert.equal(hout.ac.length, 1);
      assert.equal(hout.ac[0].cps, cps);
      assert.deepEqual(hout.ac[0].cdr.payload, hin[1].payload);
    });

    test('Transitive with encodeHandoverRequest()', function() {
      var cps = 1;
      var hin = NDEFUtils.encodeHandoverRequest(mac, cps);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.equal(hout.majorVersion, 1);
      assert.equal(hout.minorVersion, 2);
      assert.equal(hout.type, 'Hr');
      // Only one AC record (for Bluetooth).
      assert.equal(hout.ac.length, 1);
      assert.equal(hout.ac[0].cps, cps);
      assert.deepEqual(hout.ac[0].cdr.payload, hin[1].payload);
    });

    test('Decodes AC record correctly', function() {
      var cps = 2;
      var name = nfcUtils.fromUTF8('lorem ipsum');
      var hin = NDEFUtils.encodeHandoverSelect(mac, cps, name);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      var ac = hout.ac[0].cdr.payload;

      var m = ac.subarray(2, 8);
      assert.equal(NDEFUtils.formatMAC(m), mac);

      var n = ac.subarray(10, 10 + name.length);
      assert.equal(nfcUtils.toUTF8(n), 'lorem ipsum');
    });

    test('Parses multiple Alternative Carrier (AC) records', function() {
      var makeAC = function(id, cps, order) {
        var f;
        if (order === 'first') {
          f = 0x91; // set MB bit
        } else if (order === 'last') {
          f = 0x51; // set ME bit
        } else {
          f = 0x11; // leave MB and ME unset
        }
        return [f, 0x02, 0x04, 0x61, 0x63, cps, 0x01, id, 0x00];
      };

      var makeBTRecord = function(id, mac) {
        return new MozNDEFRecord({
          tnf: NDEF.TNF_MIME_MEDIA,
          type: NDEF.MIME_BLUETOOTH_OOB,
          id: new Uint8Array([id]),
          payload: new Uint8Array([8, 0].concat(mac))});
      };

      var macs = [
        [1, 2, 3, 4, 5, 6],
        [6, 5, 4, 3, 2, 1],
        [0xFF, 0, 0, 0, 0, 0]
      ];

      var hin = [new MozNDEFRecord({
                    tnf: NDEF.TNF_WELL_KNOWN,
                    type: NDEF.RTD_HANDOVER_SELECT,
                    payload: new Uint8Array([0x12].concat(
                      makeAC(0, 0, 'first'), makeAC(1, 1, 2),
                      makeAC(2, 2, 'last')))}),
                 makeBTRecord(0, macs[0]),
                 makeBTRecord(1, macs[1]),
                 makeBTRecord(2, macs[2])];
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNotNull(hout);
      assert.equal(hout.ac.length, 3);
      assert.deepEqual(hout.ac[0].cps, 0);
      assert.deepEqual(hout.ac[1].cps, 1);
      assert.deepEqual(hout.ac[2].cps, 2);
      assert.deepEqual(hout.ac[0].cdr.payload, [8, 0].concat(macs[0]));
      assert.deepEqual(hout.ac[1].cdr.payload, [8, 0].concat(macs[1]));
      assert.deepEqual(hout.ac[2].cdr.payload, [8, 0].concat(macs[2]));
    });

    test('Parses Collision Resolution Record', function() {
      var stubMathRandom = this.sinon.stub(Math, 'random');
      stubMathRandom.onCall(0).returns(0.11223344);
      stubMathRandom.onCall(1).returns(0.44332211);

      var his = NDEFUtils.encodeHandoverRequest(mac, 1);
      var hout = NDEFUtils.parseHandoverNDEF(his);

      assert.equal(hout.cr, 7281);
    });

    test('Returns null when no input given', function() {
      var hout = NDEFUtils.parseHandoverNDEF();
      assert.isNull(hout);
    });

    test('Returns null when TNF of first record invalid', function() {
      var hin = NDEFUtils.encodeHandoverSelect(mac, 1);
      // Any value other than TNF_WELL_KNOWN is invalid.
      hin[0].tnf = NDEF.TNF_MIME_MEDIA;
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });

    test('Returns null when no collision resolution record in Hr', function() {
      // Hs message is almost identical to Hr, but it does not
      // contain collision resolution record. So use that, only
      // fix it's type.
      var hin = NDEFUtils.encodeHandoverSelect(mac, 1);
      hin[0].type = NDEF.RTD_HANDOVER_REQUEST;
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });

    test('Returns null when invalid collision resolution record', function() {
      // Add third byte in collision resolution record.
      var hin = NDEFUtils.encodeHandoverRequest(mac, 1);
      var payload = Array.apply([], hin[0].payload);
      payload[3] = 3;
      payload.splice(6, 0, 0x01);
      hin[0].payload = new Uint8Array(payload);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });

    test('Do not attempt to parse records other that Hs/Hr', function() {
      var hin = NDEFUtils.encodeHandoverRequest(mac, 1);
      hin[0].type = nfcUtils.fromUTF8('Xx');
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });

    test('Return null if Hs/Hr record contains unexpected bytes.', function() {
      var hin = NDEFUtils.encodeHandoverRequest(mac, 1);
      var payload = Array.apply([], hin[0].payload);
      payload.push(0x00);
      hin[0].payload = new Uint8Array(payload);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });

    test('Decodes even when records other than "cr"/"ac" are present',
      function() {

      var hin = NDEFUtils.encodeHandoverRequest(mac, 1);
      var payload = Array.apply([], hin[0].payload);
      // 0x63, 0x63 is "cc" record which isn't supported
      // (probably doesn't even exist ;))
      payload = payload.concat([0x51, 0x02, 0x02, 0x63, 0x63, 0x00, 0x01]);
      // Previously last records isn't last anymore, so remove ME bit.
      payload[8] = 0x11;
      hin[0].payload = new Uint8Array(payload);
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNotNull(hout);
    });

    test('Return null when ID in AC record does not match ID of any records',
      function() {

      var hin = NDEFUtils.encodeHandoverRequest(mac, 1);
      hin[1].id[0] += 1;
      var hout = NDEFUtils.parseHandoverNDEF(hin);

      assert.isNull(hout);
    });
  });

  suite('searchForBluetoothAC() tests', function() {
    var h;

    setup(function() {
      var mac = '01:23:45:67:89:AB';
      var cps = 1;

      var hin = NDEFUtils.encodeHandoverSelect(mac, cps);
      h = NDEFUtils.parseHandoverNDEF(hin);
    });

    test('Returns when BT AC present', function() {
      var btAC = NDEFUtils.searchForBluetoothAC(h);
      assert.isNotNull(btAC);
    });

    test('No BT AC present - incorrect TNF', function() {
      h.ac[0].cdr.tnf = NDEF.TNF_WELL_KNOWN;
      var btAC = NDEFUtils.searchForBluetoothAC(h);
      assert.isNull(btAC);
    });

    test('No BT AC present - incorrect type', function() {
      h.ac[0].cdr.type = nfcUtils.fromUTF8('application/invalid');
      var btAC = NDEFUtils.searchForBluetoothAC(h);
      assert.isNull(btAC);
    });
  });

  suite('parseBluetoothSSP() tests', function() {
    var mac;
    var macArr;

    setup(function() {
      mac = '01:23:45:67:89:AB';
      macArr = NDEFUtils.parseMAC(mac);
    });

    test('Returns null if invoked with invalid record', function() {
      assert.isNull(NDEFUtils.parseBluetoothSSP());
      assert.isNull(NDEFUtils.parseBluetoothSSP({}));
    });

    test('Returns null if payload length invalid', function() {
      var record = {
        payload: new Uint8Array([0x08])
      };
      var dec = NDEFUtils.parseBluetoothSSP(record);

      assert.isNull(dec);
    });

    test('Decodes MAC from valid record', function() {
      var OOB = [0x08, 0x00];

      var record = {
        payload: new Uint8Array(OOB.concat(macArr))
      };
      var dec = NDEFUtils.parseBluetoothSSP(record);

      assert.equal(dec.mac, mac);
    });

    test('Decodes Bluetooth local name from valid record', function() {
      var name = 'Lorem ipsum';

      var record = NDEFUtils.encodeHandoverSelect(mac, 1,
        nfcUtils.fromUTF8(name));
      var dec = NDEFUtils.parseBluetoothSSP(record[1]);

      assert.equal(dec.localName, name);
    });

    test('Ignores unsupported EIR/OOB fields', function() {
      // Contruct this by hand, since encodeHandoverSelect() does
      // not support extra EIR parameters (other than MAC and BT
      // local name).

      // Some unsupported field: Simple Pairing Randomizer.
      var pairingRandomizer = [0x0F, 0x0E, 0x0D, 0x0C,
                               0x0B, 0x0A, 0x09, 0x08,
                               0x07, 0x06, 0x05, 0x04,
                               0x03, 0x02, 0x01, 0x00];
      var prEIRType = 0x0F;
      var prEIRLength = 1 + pairingRandomizer.length;

      // Another unsupported field: Class of Device.
      var deviceClass = [0x20, 0x06, 0x08];
      var dcEIRType = 0x0D;
      var dcEIRLength = 1 + deviceClass.length;

      // Bluetooth local name (supported field).
      var name = 'Lorem ipsum';
      var nameArr = Array.apply([], nfcUtils.fromUTF8(name));
      var nEIRType = 0x09;
      var nEIRLength = 1 + nameArr.length;

      var totalLength = 2 + macArr.length + (prEIRLength + 1) +
                        (dcEIRLength + 1)+ (nEIRLength + 1);

      var OOB = [totalLength, 0]
        .concat(macArr, prEIRLength, prEIRType, pairingRandomizer,
                nEIRLength, nEIRType, nameArr, dcEIRLength, dcEIRType,
                deviceClass);

      var record = {
        payload: OOB
      };
      var dec = NDEFUtils.parseBluetoothSSP(record);

      assert.equal(dec.mac, mac);
      assert.equal(dec.localName, name);
    });

    test('Returns null on invalid record - MAC incomplete', function() {

      var record = NDEFUtils.encodeHandoverSelect(mac, 1);

      // Make MAC address invalid: delete one hex digit (2 bytes)
      // from it.
      var OOB = Array.apply([], record[1].payload);
      OOB.splice(5, 1);

      record = {
        payload: OOB
      };
      assert.isNull(NDEFUtils.parseBluetoothSSP(record));
    });

    test('Returns null on invalid record - local name incomplete',
      function() {

      var record = NDEFUtils.encodeHandoverSelect(mac, 1,
        nfcUtils.fromUTF8('Lorem ipsum'));

      // Make local name invalid: delete one character from it.
      // Set OOB length as if this character was missing.
      // So now it should fail because EIR field length will
      // be inconsistent.
      var OOB = Array.apply([], record[1].payload);
      OOB.splice(13, 1);
      OOB[0] -= 1;

      record = {
        payload: OOB
      };
      assert.isNull(NDEFUtils.parseBluetoothSSP(record));
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
      btName = nfcUtils.fromUTF8('UE MINI BOOM');

      /*
       * The following NDEF message contains a static handover request
       * from a Motorola UE Mini Boom. The NDEF message encodes the
       * MAC address(00:0D:44:E7:95:AB) and its name (UE MINI BOOM).
       */
      recordsDefault = [{
        tnf: NDEF.TNF_WELL_KNOWN,
        type: new Uint8Array([72, 115]),
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
      for (var i = 0; i < records.length; i++) {
        assert.deepEqual(records[i].tnf, recordsDefault[i].tnf);
        if (records[i].type) {
          assert.deepEqual(records[i].type, recordsDefault[i].type);
        }
        if (records[i].id) {
          assert.deepEqual(records[i].id, recordsDefault[i].id);
        }
        if (records[i].payload) {
          assert.deepEqual(records[i].payload, recordsDefault[i].payload);
        }
      }
    });

    test('With MAC and CPS only', function() {
      recordsDefault[1].payload =
        new Uint8Array([8, 0, 171, 149, 231, 68, 13, 0]);
      var records = NDEFUtils.encodeHandoverSelect(btMac, cps);
      for (var i = 0; i < records.length; i++) {
        assert.deepEqual(records[i].tnf, recordsDefault[i].tnf);
        if (records[i].type) {
          assert.deepEqual(records[i].type, recordsDefault[i].type);
        }
        if (records[i].id) {
          assert.deepEqual(records[i].id, recordsDefault[i].id);
        }
        if (records[i].payload) {
          assert.deepEqual(records[i].payload, recordsDefault[i].payload);
        }
      }
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
