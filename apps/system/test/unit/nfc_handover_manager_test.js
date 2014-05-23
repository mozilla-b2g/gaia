'use strict';

/* globals MocksHelper, MockBluetooth, MockNavigatorSettings,
           NDEF, NfcConnectSystemDialog, MockBluetoothTransfer,
           NfcManager, NfcHandoverManager, NDEFUtils,
           MockMozNfc, NfcUtils, MockNavigatormozSetMessageHandler */

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_moz_nfc.js');
require('/shared/js/nfc_utils.js');
requireApp('system/test/unit/mock_settingslistener_installer.js');
requireApp('system/test/unit/mock_system_nfc_connect_dialog.js');
requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_bluetooth_transfer.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/js/nfc_manager_utils.js');

var mocksForNfcUtils = new MocksHelper([
  'MozActivity',
  'BluetoothTransfer',
  'MozNDEFRecord',
  'NfcConnectSystemDialog'
]).init();

suite('Nfc Handover Manager Functions', function() {

  var realMozNfc;
  var realMozSettings;
  var realMozBluetooth;
  var realMozSetMessageHandler;

  var spyDefaultAdapter;

  mocksForNfcUtils.attachTestHelpers();

  suiteSetup(function(done) {
    realMozNfc = navigator.mozNfc;
    realMozSettings = navigator.mozSettings;
    realMozBluetooth = navigator.mozBluetooth;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;

    navigator.mozNfc = MockMozNfc;
    navigator.mozSettings = MockNavigatorSettings;
    navigator.mozBluetooth = MockBluetooth;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    MockNavigatormozSetMessageHandler.mSetup();

    MockNavigatormozSetMessageHandler.mSetup();

    requireApp('system/js/ndef_utils.js');
    requireApp('system/js/nfc_manager.js');
    requireApp('system/js/nfc_handover_manager.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();

    navigator.mozNfc = realMozNfc;
    navigator.mozSettings = realMozSettings;
    navigator.mozBluetooth = realMozBluetooth;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
  });

  setup(function() {
    spyDefaultAdapter = this.sinon.spy(MockBluetooth, 'getDefaultAdapter');
  });

  teardown(function() {
    spyDefaultAdapter.restore();
  });

  var invokeBluetoothGetDefaultAdapter = function() {
    var adapterRequest = spyDefaultAdapter.firstCall.returnValue;
    adapterRequest.fireSuccess(MockBluetooth.defaultAdapter);
  };

  suite('Activity Routing for NfcHandoverManager', function() {
    var activityInjection1;
    var activityInjection2;

    setup(function() {
      activityInjection1 = {
        type: 'techDiscovered',
        techList: ['NFC_A','NDEF'],
        records: NDEFUtils.encodeHandoverSelect(
                                    '00:0D:44:E7:95:AB', NDEF.CPS_ACTIVE,
                                    NfcUtils.fromUTF8('UE MINI BOOM')),
        sessionToken: '{e9364a8b-538c-4c9d-84e2-e6ce524afd17}'
      };

      /*
       * This NDEF message contains a simplified pairing record
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
          type: NfcUtils.fromUTF8('application/vnd.bluetooth.ep.oob'),
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

  suite('Handover request and select', function() {
    var cps;
    var mac;

    var spyPairing;
    var spySendNDEF;

    setup(function() {
      cps = NDEF.CPS_ACTIVE;
      mac = '01:23:45:67:89:AB';
      spyPairing = this.sinon.spy(NfcHandoverManager, 'doPairing');
      spySendNDEF = this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');

      NfcHandoverManager.init();
      invokeBluetoothGetDefaultAdapter();
    });

    teardown(function() {
      spyPairing.restore();
      spySendNDEF.restore();
    });

    test('handleHandoverRequest(): sends Hs message to peer', function() {
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      NfcHandoverManager.handleHandoverRequest(handoverRequest);

      assert.isTrue(spySendNDEF.calledOnce);

      // Should send self Bluetooth MAC address in return.
      var OOB = Array.apply([], spySendNDEF.firstCall.args[0][1].payload);
      var myMAC = NDEFUtils.parseMAC(
        MockBluetooth.defaultAdapter.address);
      assert.deepEqual(OOB.slice(2, 8), myMAC);

      var ndefRequest = spySendNDEF.returnValues[0];
      ndefRequest.fireSuccess();
      assert.isTrue(NfcHandoverManager.incomingFileTransferInProgress);
    });

    test('handleHandoverSelect() attempts to pair BT devices', function() {
      var handoverSelect = NDEFUtils.encodeHandoverSelect(mac, cps);
      NfcHandoverManager.handleHandoverSelect(handoverSelect);

      assert.isTrue(spyPairing.calledOnce);
      assert.equal(mac, spyPairing.firstCall.args[0]);
    });
  });

  /*
   * Outbound file transfer is a two-phase process: sending handover request
   * to peer device (result of 'nfc-manager-senf-file' message) and sending
   * file over Bluetooth (result of peer device responding with hadover
   * select). Those two phases are tested in two separate test cases.
   */
  suite('File transfer', function() {
    var spySendNDEF;

    var fileRequest;

    setup(function() {
      MockBluetooth.enabled = true;

      spySendNDEF = this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');

      fileRequest = {
        session: '0da40690-518c-469b-8345-dc7875cf77eb',
        blob: 'Lorem ipsum',
        requestId: 'request-01'
      };

      NfcHandoverManager.init();
      invokeBluetoothGetDefaultAdapter();
    });

    teardown(function() {
      MockBluetooth.enabled = false;

      spySendNDEF.restore();
      NfcHandoverManager.sendFileRequest = null;
    });

    test('"nfc-manager-send-file" results in handover request sent to peer',
      function() {

      fileRequest.sessionToken = fileRequest.session;
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      assert.isTrue(spySendNDEF.calledOnce);

      // CPS should be either active or activating. In this test
      // MockBluetooths sets it to active, so assert that.
      var cps = spySendNDEF.firstCall.args[0][0].payload[13];
      assert.equal(cps, NDEF.CPS_ACTIVE);

      // OOB payload should contain MAC address of this device's
      // default Bluetooth Adapter (it's being sent to a peer).
      var OOB = Array.apply([], spySendNDEF.firstCall.args[0][1].payload);
      var myMAC = NDEFUtils.parseMAC(
        MockBluetooth.defaultAdapter.address);
      assert.deepEqual(OOB.slice(2, 8), myMAC);

      assert.isTrue(NfcHandoverManager.isHandoverInProgress());

      var ndefReq = spySendNDEF.returnValues[0];
      ndefReq.fireSuccess();
      assert.isNotNull(NfcHandoverManager.sendFileRequest);
    });

    test('Aborts when sendNDEF() fails.', function() {
      fileRequest.sessionToken = fileRequest.session;
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      var spyNotify = this.sinon.spy(MockMozNfc, 'notifySendFileStatus');

      var ndefReq = spySendNDEF.returnValues[0];
      ndefReq.fireError();
      assert.isNull(NfcHandoverManager.sendFileRequest);
      assert.isTrue(spyNotify.calledOnce);
      assert.equal(spyNotify.firstCall.args[0], 1);
    });

    test('Handover select results in file being transmitted over Bluetooth',
      function() {

      fileRequest.onsuccess = sinon.stub();
      NfcHandoverManager.sendFileRequest = fileRequest;

      var spySendFile = this.sinon.spy(MockBluetoothTransfer, 'sendFile');

      var select = NDEFUtils.encodeHandoverSelect(
        '01:23:45:67:89:AB', NDEF.CPS_ACTIVE);
      NfcHandoverManager.handleHandoverSelect(select);

      assert.isTrue(spySendFile.calledOnce);
      assert.equal(fileRequest.onsuccess.callCount, 0);

      // File transfer finished.
      var sendFileRequest = spySendFile.returnValues[0];
      sendFileRequest.fireSuccess();

      assert.isTrue(fileRequest.onsuccess.calledOnce);
    });
  });

  suite('Action queuing when Bluetooth disabled', function() {
    setup(function() {
      MockBluetooth.enabled = false;
      NfcHandoverManager.init();
    });

    teardown(function() {
      MockBluetooth.enabled = true;
      NfcHandoverManager.actionQueue.splice(0);
    });

    test('Action are queued when Bluetooth off', function() {
      assert.equal(0, NfcHandoverManager.actionQueue.length);

      var action = {};
      NfcHandoverManager.doAction(action);

      assert.equal(1, NfcHandoverManager.actionQueue.length);
    });

    test('Actions executed when Bluetooth turned on', function() {
      var action = {
        callback: this.sinon.spy(),
        args: ['lorem', 100]
      };

      NfcHandoverManager.doAction(action);

      window.dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
      invokeBluetoothGetDefaultAdapter();

      assert.isTrue(action.callback.calledOnce);
      assert.deepEqual(action.args, action.callback.getCall(0).args);
    });
  });
});
