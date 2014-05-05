'use strict';

mocha.globals(['NfcConnectSystemDialog', 'NfcHandoverManager', 'NfcManager',
               'NfcManagerUtils']);

/* globals MocksHelper, MockBluetooth, MockNavigatorSettings,
           NDEF, NfcConnectSystemDialog,
           NfcManager, NfcHandoverManager */

require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/js/nfc_utils.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_settingslistener_installer.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_system_nfc_connect_dialog.js');


var mocksForNfcUtils = new MocksHelper([
  'MozActivity',
  'MozNDEFRecord',
  'NfcConnectSystemDialog'
]).init();

suite('Nfc Handover Manager Functions', function() {

  var realMozSettings;
  var realMozBluetooth;

  mocksForNfcUtils.attachTestHelpers();

  setup(function(done) {
    realMozSettings = navigator.mozSettings;
    realMozBluetooth = navigator.mozBluetooth;

    navigator.mozSettings = MockNavigatorSettings;
    navigator.mozBluetooth = MockBluetooth;

    requireApp('system/js/nfc_manager_utils.js');
    requireApp('system/js/nfc_manager.js');
    requireApp('system/js/nfc_handover_manager.js', done);
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozBluetooth = realMozBluetooth;
  });

  suite('Activity Routing for NfcHandoverManager', function() {
    var activityInjection1;
    var activityInjection2;

    setup(function() {
      /*
       * The following NDEF message contains a static handover request
       * from a Motorola UE Mini Boom. The NDEF message encodes the
       * MAC address(00:0D:44:E7:95:AB) and its name (UE MINI BOOM).
       * Both parameters are checked via appropriate spies.
       */
      activityInjection1 = {
        type: 'techDiscovered',
        techList: ['NFC_A','NDEF'],
        records: [{
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
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd17}'
      };

      /*
       * The next NDEF message contains a simplified pairing record
       * according to Section 4.2.1 Simplified Tag Format for a Single
       * Bluetooth Carrier. The NDEF message encodes the
       * MAC address (4C:21:D0:9F:12:F1) and its name (MBH10).
       * Both parameters are checked via appropriate spies.
       */
      activityInjection2 = {
        type: 'techDiscovered',
        techList: ['NDEF'],
        records: [{
          tnf: NDEF.TNF_MIME_MEDIA,
          type: new Uint8Array([97, 112, 112, 108, 105, 99, 97, 116, 105,
                                111, 110, 47, 118, 110, 100, 46, 98, 108, 117,
                                101, 116, 111, 111, 116, 104, 46, 101, 112,
                                46, 111, 111, 98]),
          id: new Uint8Array(),
          payload: new Uint8Array([26, 0, 241, 18, 159, 208, 33, 76, 4, 13, 4,
                                   4, 32, 5, 3, 30, 17, 11, 17, 6, 9, 77, 66,
                                   72, 49, 48])
        }],
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd18}'
      };
    });

    test('nfc/HandoverSelect', function() {
      var spyName = this.sinon.spy(NfcConnectSystemDialog.prototype, 'show');
      var spyPairing = this.sinon.spy(NfcHandoverManager, 'doPairing');

      NfcManager.handleTechnologyDiscovered(activityInjection1);
      assert.isTrue(spyName.withArgs('UE MINI BOOM').calledOnce);
      assert.isTrue(spyPairing.withArgs('00:0D:44:E7:95:AB').calledOnce);
    });

    test('nfc/SimplifiedPairingRecord', function() {
      var spyName = this.sinon.spy(NfcConnectSystemDialog.prototype, 'show');
      var spyPairing = this.sinon.spy(NfcHandoverManager, 'doPairing');

      NfcManager.handleTechnologyDiscovered(activityInjection2);
      assert.isTrue(spyName.withArgs('MBH10').calledOnce);
      assert.isTrue(spyPairing.withArgs('4C:21:D0:9F:12:F1').calledOnce);
    });
  });

});
