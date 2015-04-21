'use strict';

/* globals MocksHelper, MockBluetooth, MockBluetoothTransfer,
           MockNavigatorSettings, NDEF, NfcConnectSystemDialog,
           MockDOMRequest, MockL10n, NDEFUtils, BaseModule, MockMozNfc,
           NfcUtils, MockNavigatormozSetMessageHandler, MockLazyLoader,
           MockService */

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_moz_nfc.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/js/nfc_utils.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_system_nfc_connect_dialog.js');
requireApp('system/shared/test/unit/mocks/mock_event_target.js');
requireApp('system/shared/test/unit/mocks/mock_dom_request.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/test/unit/mock_bluetooth_transfer.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/js/nfc_manager_utils.js');
requireApp('system/js/ndef_utils.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/settings_core.js');
requireApp('system/js/nfc_handover_manager.js');

var mocksForNfcUtils = new MocksHelper([
  'MozActivity',
  'MozNDEFRecord',
  'NfcConnectSystemDialog',
  'NotificationHelper',
  'LazyLoader',
  'Service'
]).init();

suite('Nfc Handover Manager Functions', function() {
  var realMozNfc;
  var realMozSettings;
  var realMozBluetooth;
  var realMozSetMessageHandler;
  var realL10n;
  var spyDefaultAdapter, spyBluetoothPair;
  var nfcHandoverManager;
  var settingsCore;

  mocksForNfcUtils.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realMozBluetooth = navigator.mozBluetooth;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    realL10n = navigator.mozL10n;
    realMozNfc = navigator.mozNfc;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return MockBluetooth;
      }
    });
    navigator.mozSettings = MockNavigatorSettings;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    navigator.mozL10n = MockL10n;
    navigator.mozNfc = MockMozNfc;

    MockNavigatormozSetMessageHandler.mSetup();
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSettings = realMozSettings;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return realMozBluetooth;
      }
    });
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozL10n = realL10n;
    navigator.mozNfc = realMozNfc;
  });

  setup(function() {
    spyDefaultAdapter = this.sinon.spy(MockBluetooth, 'getDefaultAdapter');
    spyBluetoothPair = this.sinon.spy(MockBluetooth.defaultAdapter, 'pair');
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    nfcHandoverManager = BaseModule.instantiate('NfcHandoverManager');
  });

  teardown(function() {
    settingsCore.stop();
    spyDefaultAdapter.restore();
    spyBluetoothPair.restore();
  });

  var invokeBluetoothGetDefaultAdapter = function() {
    var adapterRequest = spyDefaultAdapter.firstCall.returnValue;
    adapterRequest.fireSuccess(MockBluetooth.defaultAdapter);
  };

  suite('Activity Routing for nfcHandoverManager', function() {
    var activityInjection1;
    var activityInjection2;
    var nfcUtils;
    var peerMac;
    var pairedDevices;
    var stubGetPairedDevices;

    setup(function() {
      nfcUtils = new NfcUtils();
      activityInjection1 = {
        type: 'techDiscovered',
        techList: ['NFC_A','NDEF'],
        records: NDEFUtils.encodeHandoverSelect(
                                    '00:0D:44:E7:95:AB', NDEF.CPS_ACTIVE,
                                    nfcUtils.fromUTF8('UE MINI BOOM')),
        peer: MockMozNfc.MockNFCPeer
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
          type: NDEF.MIME_BLUETOOTH_OOB,
          id: new Uint8Array(),
          payload: new Uint8Array([26, 0, 241, 18, 159, 208, 33, 76, 4, 13, 4,
                                   4, 32, 5, 3, 30, 17, 11, 17, 6, 9, 77, 66,
                                   72, 49, 48])
        }],
        peer: MockMozNfc.MockNFCPeer
      };
      peerMac = '01:23:45:67:89:AB';
      pairedDevices = [{ address: peerMac, connected: false }];
      stubGetPairedDevices = this.sinon.stub(MockBluetooth.defaultAdapter,
                              'getPairedDevices',
                              () => { return new MockDOMRequest(); });
      nfcHandoverManager.start();
      invokeBluetoothGetDefaultAdapter();
    });

    teardown(function() {
      nfcHandoverManager.stop();
      stubGetPairedDevices.restore();
    });

    test('nfc/system_nfc_connect_dialog is loaded', function() {
      this.sinon.stub(MockLazyLoader, 'load');
      nfcHandoverManager.nfcConnectSystemDialog = null;
      nfcHandoverManager.tryHandover(activityInjection1.records,
                                     activityInjection1.peer);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess([]);
      assert.ok(MockLazyLoader.load
        .calledWith('js/system_nfc_connect_dialog.js'));
    });

    test('nfc/HandoverSelect', function() {
      var spyName = this.sinon.spy(NfcConnectSystemDialog.prototype, 'show');
      var spyPairing = this.sinon.spy(nfcHandoverManager, '_doPairing');

      nfcHandoverManager.nfcConnectSystemDialog = new NfcConnectSystemDialog();
      nfcHandoverManager.tryHandover(activityInjection1.records,
                                     activityInjection1.peer);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess([]);
      assert.isTrue(spyName.withArgs('UE MINI BOOM').calledOnce);
      assert.isTrue(spyPairing.withArgs('00:0D:44:E7:95:AB').calledOnce);
    });

    test('nfc/SimplifiedPairingRecord', function() {
      var spyName = this.sinon.spy(NfcConnectSystemDialog.prototype, 'show');
      var spyPairing = this.sinon.spy(nfcHandoverManager, '_doPairing');

      nfcHandoverManager.nfcConnectSystemDialog = new NfcConnectSystemDialog();
      nfcHandoverManager.tryHandover(activityInjection2.records,
                                     activityInjection2.peer);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess([]);
      assert.isTrue(spyName.withArgs('MBH10').calledOnce);
      assert.isTrue(spyPairing.withArgs('4C:21:D0:9F:12:F1').calledOnce);
    });

    test('Attempts to connect to peer after pairing', function() {
      var spyConnect = this.sinon.spy(MockBluetooth.defaultAdapter, 'connect');

      nfcHandoverManager._doPairing(peerMac);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess([]);
      spyBluetoothPair.firstCall.returnValue.fireSuccess();
      stubGetPairedDevices.getCall(1).returnValue.fireSuccess(pairedDevices);

      assert.isTrue(spyConnect.calledOnce);
      assert.equal(spyConnect.firstCall.args[0].address, peerMac);
    });

    test('Attempts to connect to already paired peer', function() {
      var spyConnect = this.sinon.spy(MockBluetooth.defaultAdapter, 'connect');

      nfcHandoverManager._doPairing(peerMac);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess(pairedDevices);

      assert.isTrue(spyBluetoothPair.notCalled);
      assert.isTrue(spyConnect.calledOnce);
      assert.equal(spyConnect.firstCall.args[0].address, peerMac);
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
      spyPairing = this.sinon.spy(nfcHandoverManager, '_doPairing');
      spySendNDEF = this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');

      nfcHandoverManager.start();
      invokeBluetoothGetDefaultAdapter();
    });

    teardown(function() {
      spyPairing.restore();
      spySendNDEF.restore();
      nfcHandoverManager.stop();
    });

    test('_handleHandoverRequest(): sends Hs message to peer', function() {
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);

      assert.isTrue(spySendNDEF.calledOnce);

      // Should send self Bluetooth MAC address in return.
      var OOB = Array.apply([], spySendNDEF.firstCall.args[0][1].payload);
      var myMAC = NDEFUtils.parseMAC(
        MockBluetooth.defaultAdapter.address);
      assert.deepEqual(OOB.slice(2, 8), myMAC);

      var ndefPromise = spySendNDEF.returnValues[0];
      ndefPromise.mFulfillToValue();
      assert.isTrue(nfcHandoverManager.incomingFileTransferInProgress);
    });

    test('_handleHandoverSelect() attempts to pair BT devices', function() {
      var stubGetPairedDevices = this.sinon.stub(MockBluetooth.defaultAdapter,
                              'getPairedDevices',
                              () => { return new MockDOMRequest(); });

      var handoverSelect = NDEFUtils.encodeHandoverSelect(mac, cps);
      nfcHandoverManager.bluetooth.enabled = true;
      nfcHandoverManager._handleHandoverSelect(handoverSelect);
      stubGetPairedDevices.firstCall.returnValue.fireSuccess([]);

      assert.isTrue(spyPairing.calledOnce);
      assert.equal(mac, spyPairing.firstCall.args[0]);
      nfcHandoverManager.bluetooth.enabled = false;
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
      MockNavigatormozSetMessageHandler.mSetup();
      MockBluetooth.enabled = true;

      spySendNDEF = this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');

      fileRequest = {
        peer: MockMozNfc.MockNFCPeer,
        blob: { name: 'Lorem ipsum' },
        requestId: 'request-01'
      };

      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.start();
      invokeBluetoothGetDefaultAdapter();
    });

    teardown(function() {
      MockBluetooth.enabled = false;
      MockService.mockQueryWith('BluetoothTransfer.isFileTransferInProgress',
        false);

      spySendNDEF.restore();
      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.stop();
    });

    test('"nfc-manager-send-file" results in handover request sent to peer',
      function() {

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

      assert.isTrue(nfcHandoverManager.isHandoverInProgress());

      var ndefPromise = spySendNDEF.returnValues[0];
      ndefPromise.mFulfillToValue();
      assert.equal(1, nfcHandoverManager.sendFileQueue.length);
    });

    test('Sending aborts when another file is transmitted concurrently',
      function() {

      MockService.mockQueryWith('BluetoothTransfer.isFileTransferInProgress',
        true);

      var stubShowNotification = this.sinon.stub(nfcHandoverManager,
                                                 '_showTryAgainNotification');
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);
      assert.isTrue(stubShowNotification.calledOnce,
                    'Notification not shown');
    });

    test('Aborts when sendNDEF() fails.', function() {
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      var spyNotify = this.sinon.spy(MockMozNfc, 'notifySendFileStatus');

      var ndefPromise = spySendNDEF.returnValues[0];
      ndefPromise.mRejectToError();
      assert.equal(0, nfcHandoverManager.sendFileQueue.length);
      assert.isTrue(spyNotify.calledOnce);
      assert.equal(spyNotify.firstCall.args[0], 1);
    });

    test('Aborts when MozNFCPeer lost during file send.', function() {
      fileRequest.peer = {isLost: true};
      var spyNotify = this.sinon.spy(MockMozNfc, 'notifySendFileStatus');
      var stubShowNotification = this.sinon.stub(nfcHandoverManager,
                                                 '_showFailedNotification');
      var stubRestoreBT = this.sinon.stub(nfcHandoverManager,
                                          '_restoreBluetoothStatus');

      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);
      assert.isTrue(spyNotify.calledOnce);
      assert.equal(spyNotify.firstCall.args[0], 1);
      assert.isTrue(stubShowNotification
                    .withArgs('transferFinished-sentFailed-title',
                              fileRequest.blob.name)
                    .calledOnce,
                    'Notification not shown');
      assert.isTrue(stubRestoreBT.calledOnce, 'BT status not restored');
    });

    test('Aborts when MozNFCPeer lost during file receive.', function() {
      var cps = NDEF.CPS_ACTIVE;
      var mac = '01:23:45:67:89:AB';
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      var stubShowNotification = this.sinon.stub(nfcHandoverManager,
                                                 '_showFailedNotification');
      var stubRestoreBT = this.sinon.stub(nfcHandoverManager,
                                          '_restoreBluetoothStatus');

      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        {isLost: true});
      assert.isTrue(spySendNDEF.notCalled);
      assert.isTrue(stubShowNotification
                    .withArgs('transferFinished-receivedFailed-title')
                    .calledOnce,
                    'Notification not shown');
      assert.isTrue(stubRestoreBT.calledOnce, 'BT status not restored');
    });

    test('Handover select results in file being transmitted over Bluetooth',
      function() {
      this.sinon.stub(nfcHandoverManager, 'publish');
      nfcHandoverManager.sendFileQueue.push(fileRequest);

      var select = NDEFUtils.encodeHandoverSelect(
        '01:23:45:67:89:AB', NDEF.CPS_ACTIVE);
      nfcHandoverManager._handleHandoverSelect(select);
      assert.equal(nfcHandoverManager.publish.firstCall.args[0],
        'bluetooth-sendfile-via-handover');
      assert.deepEqual(nfcHandoverManager.publish.firstCall.args[1], {
        mac: '01:23:45:67:89:AB',
        blob: { name: 'Lorem ipsum' }
      });
    });

    test('Empty Handover Select results in abort',
      function() {

      fileRequest.onerror = sinon.stub();
      nfcHandoverManager.sendFileQueue.push(fileRequest);

      var stubShowNotification = this.sinon.stub(nfcHandoverManager,
                                                 '_showTryAgainNotification');
      var spyRestoreBT = sinon.spy(nfcHandoverManager,
                                   '_restoreBluetoothStatus');
      var spySendFile = this.sinon.spy(MockBluetoothTransfer,
        'sendFileViaHandover');

      var select = NDEFUtils.encodeEmptyHandoverSelect();
      nfcHandoverManager._handleHandoverSelect(select);

      assert.isTrue(spySendFile.notCalled);
      assert.isTrue(fileRequest.onerror.calledOnce);
      assert.isTrue(stubShowNotification.calledOnce,
                    'Notification not shown');
      assert.isTrue(spyRestoreBT.calledOnce);
    });
  });

  suite('Action queuing when Bluetooth disabled', function() {
    setup(function() {
      MockBluetooth.enabled = false;
      nfcHandoverManager.start();
    });

    teardown(function() {
      MockBluetooth.enabled = true;
      nfcHandoverManager.actionQueue.splice(0);
      nfcHandoverManager.stop();
    });

    test('Action are queued when Bluetooth off', function() {
      assert.equal(0, nfcHandoverManager.actionQueue.length);

      var action = {};
      nfcHandoverManager._doAction(action);
      MockNavigatorSettings.mReplyToRequests();

      assert.equal(1, nfcHandoverManager.actionQueue.length);
      assert.isTrue(MockNavigatorSettings.mSettings['bluetooth.enabled']);
    });

    test('Actions executed when Bluetooth turned on', function() {
      var action = {
        callback: this.sinon.spy(),
        args: ['lorem', 100]
      };

      nfcHandoverManager._doAction(action);

      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
      invokeBluetoothGetDefaultAdapter();

      assert.isTrue(action.callback.calledOnce);
      assert.deepEqual(action.args, action.callback.getCall(0).args);
    });
  });

  suite('Restore state of Bluetooth adapter', function() {
    var spySendNDEF;
    var mockFileRequest;

    setup(function() {
      MockService.mockQueryWith('BluetoothTransfer.isSendFileQueueEmpty',
        true);
      this.sinon.useFakeTimers();
      mockFileRequest = {
          peer: MockMozNfc.MockNFCPeer,
          blob: new Blob(),
          requestId: 'req-id-1'
      };
      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.start();
    });

    teardown(function() {
      MockService.mockQueryWith('BluetoothTransfer.isSendFileQueueEmpty',
        false);
      nfcHandoverManager.stop();
      spySendNDEF.restore();
    });

    var initiateFileTransfer = function() {
      spySendNDEF = sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
      invokeBluetoothGetDefaultAdapter();
      nfcHandoverManager.handleFileTransfer(mockFileRequest.peer,
                                            mockFileRequest.blob,
                                            mockFileRequest.requestId);
    };

    var finalizeFileTransfer = function() {
      var hs = NDEFUtils.encodeHandoverSelect('11:22:33:44:55:66',
        NDEF.CPS_ACTIVE);
      nfcHandoverManager._handleHandoverSelect(hs);
    };

    test('Send file with BT enabled',
      function() {

      MockBluetooth.enabled = true;
      initiateFileTransfer();
      assert.isTrue(MockBluetooth.enabled);
      finalizeFileTransfer();
      assert.isTrue(MockBluetooth.enabled);
    });

    test('Send file with BT disabled and empty send file queue',
      function() {

      var stubGetPairedDevices = this.sinon.stub(MockBluetooth.defaultAdapter,
                              'getPairedDevices',
                              () => { return new MockDOMRequest(); });

      MockBluetooth.enabled = false;
      initiateFileTransfer();
      assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
        true);
      MockBluetooth.enabled = true;

      finalizeFileTransfer();

      stubGetPairedDevices.getCall(0).returnValue.fireSuccess([]);
      stubGetPairedDevices.getCall(1).returnValue.fireSuccess([]);
      spyBluetoothPair.firstCall.returnValue.fireError();
      assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
        false);
    });

    test('Send file with BT disabled and non-empty send file queue',
      function() {

      MockBluetooth.enabled = false;
      initiateFileTransfer();
      assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
              true);
      MockService.mockQueryWith('BluetoothTransfer.isSendFileQueueEmpty',
        false);
      finalizeFileTransfer();

      // Now finalize the second transfer (the one not initiated
      // via NFC handover)
      var details = {received: false,
                     success: true,
                     viaHandover: false};
      MockService.mockQueryWith('BluetoothTransfer.isSendFileQueueEmpty',
        true);
      nfcHandoverManager.transferComplete({
        detail: details
      });
      assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
              false);

    });

    test('Timeout outgoing file transfer', function() {
      MockBluetooth.enabled = true;
      var spyCancel = this.sinon.spy(nfcHandoverManager,
                                     '_cancelSendFileTransfer');

      initiateFileTransfer();
      assert.isTrue(MockBluetooth.enabled);
      this.sinon.clock.tick(nfcHandoverManager.responseTimeoutMillis);
      assert.isTrue(spyCancel.calledOnce);
    });

    test('Timeout incoming file transfer', function() {
      var cps = NDEF.CPS_ACTIVE;
      var mac = '01:23:45:67:89:AB';
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      MockBluetooth.enabled = true;
      var spyCancel = sinon.spy(nfcHandoverManager,
                                '_cancelIncomingFileTransfer');
      initiateFileTransfer();
      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);
      this.sinon.clock.tick(nfcHandoverManager.responseTimeoutMillis);
      assert.isTrue(spyCancel.calledOnce);
    });
  });

  suite('tryHandover', function() {
    var nfcPeer;

    // simplified pairing record
    var spr;
    // handover select record
    var hsr;
    // handover request record
    var hrr;

    var uriRecord;
    var mimeRecord;

    var stubHandleSPR;
    var stubHandleHSR;
    var stubHandleHRR;

    setup(function() {
      nfcPeer = MockMozNfc.MockNFCPeer;
      spr = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: NDEF.MIME_BLUETOOTH_OOB,
        id: new Uint8Array([1]),
        payload: new Uint8Array([1])
      };

      hsr = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_HANDOVER_SELECT,
        id: new Uint8Array([2]),
        payload: new Uint8Array([2])
      };

      hrr = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_HANDOVER_REQUEST,
        id: new Uint8Array([3]),
        payload: new Uint8Array([3])
      };

      uriRecord = {
        tnf: NDEF.TNF_WELL_KNOWN,
        type: NDEF.RTD_URI,
        id: new Uint8Array([4]),
        payload: new Uint8Array([4])
      };

      mimeRecord = {
        tnf: NDEF.TNF_MIME_MEDIA,
        type: 'text/plain',
        id: new Uint8Array([5]),
        payload: new Uint8Array([5])
      };

      stubHandleSPR = this.sinon.stub(nfcHandoverManager,
                                      '_handleSimplifiedPairingRecord');
      stubHandleHSR = this.sinon.stub(nfcHandoverManager,
                                      '_handleHandoverSelect');
      stubHandleHRR = this.sinon.stub(nfcHandoverManager,
                                      '_handleHandoverRequest');
    });

    teardown(function() {
      stubHandleSPR.restore();
      stubHandleHSR.restore();
      stubHandleHRR.restore();
    });

    test('simplified pairing record', function() {
      var result = nfcHandoverManager.tryHandover([spr], nfcPeer);
      assert.isTrue(result, 'result');
      assert.isTrue(stubHandleSPR.withArgs([spr]).calledOnce, 'method');
    });

    test('handover select record', function() {
      var result = nfcHandoverManager.tryHandover([hsr], nfcPeer);
      assert.isTrue(result, 'result');
      assert.isTrue(stubHandleHSR.withArgs([hsr]).calledOnce, 'method');
    });

    test('handover request record', function() {
      var result = nfcHandoverManager.tryHandover([hrr], nfcPeer);
      assert.isTrue(result, 'result');
      assert.isTrue(stubHandleHRR.withArgs([hrr], nfcPeer).calledOnce,
                                           'method');
    });

    test('regular records', function() {
      var result = nfcHandoverManager.tryHandover([uriRecord], nfcPeer);
      assert.isFalse(result, 'regular URI record');

      result = nfcHandoverManager.tryHandover([mimeRecord], nfcPeer);
      assert.isFalse(result, 'regular MIME record');
    });

    test('multiple handover records, only first handled', function() {
      var result = nfcHandoverManager.tryHandover([spr, hsr], nfcPeer);
      assert.isTrue(result, 'result');
      assert.isTrue(stubHandleSPR.withArgs([spr, hsr]).calledOnce, 'handled');
      assert.isFalse(stubHandleHSR.called, 'not handled');
    });

    test('multiple records, handover record second, not handled', function() {
      var result = nfcHandoverManager.tryHandover([uriRecord, hsr], nfcPeer);
      assert.isFalse(result, 'result');
      assert.isFalse(stubHandleHSR.called, 'not handled');
    });
  });
});
