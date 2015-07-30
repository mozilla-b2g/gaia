'use strict';

/* globals MocksHelper, MockNavigatorSettings, NDEF, Service, MockLazyLoader,
           MockL10n, NDEFUtils, BaseModule, MockMozNfc, NfcUtils,
           MockNavigatormozSetMessageHandler, MockDOMRequest, MockPromise,
           MockMozBluetooth, MockBTAdapter, NfcConnectSystemDialog,
           MockService */
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_moz_ndefrecord.js');
require('/shared/test/unit/mocks/mock_moz_nfc.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_promise.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/js/nfc_utils.js');
requireApp('system/test/unit/mock_system_nfc_connect_dialog.js');
requireApp('system/test/unit/mock_lazy_loader.js');
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

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('Nfc Handover Manager Functions', function() {
  var realMozNfc;
  var realMozSettings;
  var realMozBluetooth;
  var realMozSetMessageHandler;
  var realL10n;
  var nfcHandoverManager;
  var settingsCore;

  mocksForNfcUtils.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;
    realL10n = navigator.mozL10n;
    realMozNfc = navigator.mozNfc;
    realMozBluetooth = navigator.mozBluetooth;
    navigator.mozSettings = MockNavigatorSettings;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    navigator.mozL10n = MockL10n;
    navigator.mozNfc = MockMozNfc;
    switchReadOnlyProperty(window.navigator, 'mozBluetooth', MockMozBluetooth);

    MockNavigatormozSetMessageHandler.mSetup();
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSettings = realMozSettings;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozL10n = realL10n;
    navigator.mozNfc = realMozNfc;
    switchReadOnlyProperty(window.navigator, 'mozBluetooth', realMozBluetooth);
  });

  setup(function() {
    settingsCore = BaseModule.instantiate('SettingsCore');
    settingsCore.start();
    nfcHandoverManager = BaseModule.instantiate('NfcHandoverManager');
  });

  teardown(function() {
    settingsCore.stop();
  });

  suite('Initialize', function() {
    teardown(function() {
      nfcHandoverManager.stop();
    });

    test('start', function() {
      this.sinon.stub(window.navigator, 'mozSetMessageHandler');
      nfcHandoverManager.start();

      assert.isFalse(nfcHandoverManager.incomingFileTransferInProgress);
      assert.isFalse(nfcHandoverManager.bluetoothStatusSaved);
      assert.isFalse(nfcHandoverManager.bluetoothAutoEnabled);
      assert.ok(window.navigator.mozSetMessageHandler
        .calledWith('nfc-manager-send-file'));
    });

    test('SetMessageHandler', function() {
      nfcHandoverManager.start();
      this.sinon.stub(nfcHandoverManager, 'handleFileTransfer');
      var fileRequest = this.sinon.stub();
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      assert.ok(nfcHandoverManager.handleFileTransfer
        .calledWith(fileRequest));
    });
  });

  suite('Events', function() {
    teardown(function() {
      nfcHandoverManager.stop();
    });

    test('nfc-transfer-started event is handled', function() {
      this.sinon.spy(nfcHandoverManager, '_transferStarted');
      nfcHandoverManager.start();
      window.dispatchEvent(new CustomEvent('nfc-transfer-started',
        {detail: {}}));

      assert.ok(nfcHandoverManager._transferStarted.called);
    });

    test('nfc-transfer-completed event is handled', function() {
      this.sinon.spy(nfcHandoverManager, 'transferComplete');
      nfcHandoverManager.start();
      window.dispatchEvent(new CustomEvent('nfc-transfer-completed',
        {detail: {}}));

      assert.ok(nfcHandoverManager.transferComplete.called);
    });

    test('bluetooth-disabled event is handled', function() {
      this.sinon.spy(nfcHandoverManager, '_clearBluetoothStatus');
      nfcHandoverManager.start();
      nfcHandoverManager.publish('bluetooth-disabled',
        nfcHandoverManager, true);

      assert.ok(nfcHandoverManager._clearBluetoothStatus.called);
    });

    test('adapter is not retrieved', function() {
      var fakePromise = new MockPromise();
      var callback = this.sinon.stub();
      this.sinon.stub(Service, 'request', () => fakePromise);
      nfcHandoverManager.actionQueue.push({callback: callback});

      nfcHandoverManager.start();
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));

      fakePromise.mRejectToError();
      assert.ok(Service.request.calledWith('Bluetooth:adapter'));
      Service.request.restore();
      assert.ok(!callback.called);
      assert.equal(nfcHandoverManager.actionQueue.length, 1);
    });

    test('bluetooth-enabled event is handled', function() {
      var fakePromise = new MockPromise();
      this.sinon.stub(Service, 'request', () => fakePromise);
      nfcHandoverManager.start();
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));

      fakePromise.mFulfillToValue(MockBTAdapter);
      assert.ok(Service.request.calledWith('Bluetooth:adapter'));
      assert.isFalse(nfcHandoverManager.settingsNotified);
      assert.equal(nfcHandoverManager.actionQueue, 0);
      Service.request.restore();
    });

    test('adapter is retrieved with 1 action in queue', function() {
      var fakePromise = new MockPromise();
      var callback = this.sinon.stub();
      this.sinon.stub(Service, 'request', () => fakePromise);
      nfcHandoverManager.actionQueue.push({callback: callback});
      nfcHandoverManager.start();
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));

      fakePromise.mFulfillToValue(MockBTAdapter);
      assert.isFalse(nfcHandoverManager.settingsNotified);
      assert.ok(callback.called);
      assert.equal(nfcHandoverManager.actionQueue.length, 0);

      Service.request.restore();
    });
  });

  suite('saveBluetoothStatus', function() {
    teardown(function() {
      nfcHandoverManager.stop();
    });

    test('bluetoothStatusSaved is false', function() {
      nfcHandoverManager.bluetoothStatusSaved = false;
      this.sinon.stub(Service, 'query').returns(true);
      nfcHandoverManager.start();
      nfcHandoverManager._saveBluetoothStatus();

      assert.isTrue(nfcHandoverManager.bluetoothStatusSaved);
      assert.isFalse(nfcHandoverManager.bluetoothAutoEnabled);
      assert.ok(Service.query.calledWith('Bluetooth.isEnabled'));
    });

    test('bluetoothStatusSaved is true', function() {
      this.sinon.stub(Service, 'query').returns(true);
      nfcHandoverManager.start();
      nfcHandoverManager.bluetoothStatusSaved = true;
      nfcHandoverManager._saveBluetoothStatus();

      assert.ok(!Service.query.called);
    });
  });

  suite('restoreBluetoothStatus', function() {
    test('if handover is not in progress, bluetooth transfer queue is empty, ' +
      'and bluetoothAutoEnabled is true', function() {
      this.sinon.stub(nfcHandoverManager, 'isHandoverInProgress')
        .returns(false);
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(nfcHandoverManager, 'publish');
      nfcHandoverManager.bluetoothAutoEnabled = true;
      nfcHandoverManager._restoreBluetoothStatus();

      assert.isFalse(nfcHandoverManager.bluetoothAutoEnabled);
      assert.isFalse(nfcHandoverManager.bluetoothStatusSaved);
      assert.ok(Service.query
        .calledWith('BluetoothTransfer.isSendFileQueueEmpty'));
      assert.ok(nfcHandoverManager.publish
        .calledWith('request-disable-bluetooth'));
    });

    test('if handover is not in progress, bluetooth transfer queue is empty, '+
      'and bluetoothAutoEnabled is false', function() {
      this.sinon.stub(nfcHandoverManager, 'isHandoverInProgress')
        .returns(false);
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(nfcHandoverManager, 'publish');
      nfcHandoverManager.bluetoothAutoEnabled = false;
      nfcHandoverManager._restoreBluetoothStatus();

      assert.isFalse(nfcHandoverManager.bluetoothAutoEnabled);
      assert.ok(Service.query
        .calledWith('BluetoothTransfer.isSendFileQueueEmpty'));
      assert.ok(!nfcHandoverManager.publish.called);
    });

    test('if handover is not in progress, bluetooth transfer queue ' +
      'is not empty', function() {
      this.sinon.stub(nfcHandoverManager, 'isHandoverInProgress')
        .returns(false);
      this.sinon.stub(Service, 'query').returns(false);
      this.sinon.spy(nfcHandoverManager, 'publish');
      nfcHandoverManager._restoreBluetoothStatus();

      assert.ok(Service.query
        .calledWith('BluetoothTransfer.isSendFileQueueEmpty'));
      assert.ok(!nfcHandoverManager.publish.called);
    });

    test('if handover is in progress, bluetooth transfer queue is empty',
      function() {
      this.sinon.stub(nfcHandoverManager, 'isHandoverInProgress')
        .returns(true);
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(nfcHandoverManager, 'publish');
      nfcHandoverManager._restoreBluetoothStatus();

      assert.ok(!Service.query
        .calledWith('BluetoothTransfer.isSendFileQueueEmpty'));
      assert.ok(!nfcHandoverManager.publish.called);
    });

    test('if handover is in progress, bluetooth transfer queue is not empty',
      function() {
        this.sinon.stub(nfcHandoverManager, 'isHandoverInProgress')
          .returns(true);
        this.sinon.stub(Service, 'query').returns(false);
        this.sinon.spy(nfcHandoverManager, 'publish');
        nfcHandoverManager._restoreBluetoothStatus();

        assert.ok(!Service.query
          .calledWith('BluetoothTransfer.isSendFileQueueEmpty'));
        assert.ok(!nfcHandoverManager.publish.called);
    });
  });

  suite('findPairedDevice', function() {
    var device = {
      address: '01:23:45:67:89:AB',
      connected: true
    };

    setup(function() {
      nfcHandoverManager._adapter = MockBTAdapter;
    });

    teardown(function() {
      nfcHandoverManager._adapter = null;
    });

    test('found a paired device', function() {
      var fakePromise = new MockPromise();
      this.sinon.stub(Service, 'request', () => fakePromise);
      var foundCb = this.sinon.stub();
      var notFoundCb = this.sinon.stub();
      var mac = device.address;
      nfcHandoverManager._findPairedDevice(mac, foundCb, notFoundCb);

      fakePromise.mFulfillToValue([device]);
      assert.ok(Service.request.calledWith('Bluetooth:getPairedDevices'));
      assert.ok(foundCb.called);
    });

    test('Not found a paired device', function() {
      var fakePromise = new MockPromise();
      this.sinon.stub(Service, 'request', () => fakePromise);
      var foundCb = this.sinon.stub();
      var notFoundCb = this.sinon.stub();
      var mac = '';
      nfcHandoverManager._findPairedDevice(mac, foundCb, notFoundCb);

      fakePromise.mFulfillToValue([device]);
      assert.ok(Service.request.calledWith('Bluetooth:getPairedDevices'));
      assert.ok(notFoundCb.called);
    });
  });

  suite('doPairing', function() {
    var mac = '01:23:45:67:89:AB';
    setup(function() {
      nfcHandoverManager._adapter = MockBTAdapter;
      this.sinon.spy(MockBTAdapter, 'connect');
      this.sinon.spy(MockBTAdapter, 'pair');
      this.sinon.spy(nfcHandoverManager, '_findPairedDevice');
    });

    teardown(function() {
      nfcHandoverManager._findPairedDevice.restore();
    });

    test('Attempts to connect to peer after pairing', function() {
      var fakePromise = new MockPromise();
      this.sinon.stub(Service, 'request', () => fakePromise);
      nfcHandoverManager._doPairing(mac);

      fakePromise.mFulfillToValue([{address: mac, connected: true}]);
      assert.ok(nfcHandoverManager._findPairedDevice.called);
      assert.ok(Service.request.calledWith('Bluetooth:getPairedDevices'));
    });

    test('Attempts to restore Bluetooth Status after pairing fail',
      function() {
      var fakePromise = new MockPromise();
      this.sinon.stub(Service, 'request', () => fakePromise);
      this.sinon.spy(nfcHandoverManager, '_logVisibly');
      nfcHandoverManager._doPairing(mac);

      fakePromise.mRejectToError();
      assert.ok(nfcHandoverManager._findPairedDevice.called);
      assert.ok(Service.request.calledWith('Bluetooth:getPairedDevices'));
      assert.isTrue(nfcHandoverManager._logVisibly.calledOnce);
    });
  });

  suite('Activity Routing for nfcHandoverManager', function() {
    var activityInjection1;
    var activityInjection2;
    var nfcUtils;
    var peerMac;
    var pairedDevices;

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
      this.sinon.spy(NfcConnectSystemDialog.prototype, 'show');
      this.sinon.spy(nfcHandoverManager, '_handleHandoverRequest');
      this.sinon.spy(nfcHandoverManager, '_checkConnected');
      nfcHandoverManager.start();
    });

    teardown(function() {
      nfcHandoverManager.stop();
    });

    test('nfc/system_nfc_connect_dialog is loaded', function() {
      this.sinon.spy(MockLazyLoader, 'load');
      nfcHandoverManager.nfcConnectSystemDialog = null;
      var btssp = {mac: '', localname: ''};
      nfcHandoverManager._onRequestConnect(btssp);

      assert.ok(MockLazyLoader.load
        .calledWith('js/system_nfc_connect_dialog.js'));
    });

    test('handleSimplifiedPairingRecord when NDEF message contains ' +
      'simplified pairing record', function() {
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(nfcHandoverManager, '_handleSimplifiedPairingRecord');
      this.sinon.stub(MockBTAdapter, 'getConnectedDevices', function() {
        return new MockDOMRequest();
      });
      nfcHandoverManager._adapter = MockBTAdapter;
      nfcHandoverManager.tryHandover(activityInjection2.records,
                                     activityInjection2.peer);

      assert.ok(nfcHandoverManager._handleSimplifiedPairingRecord
        .calledWith(activityInjection2.records));
      assert.ok(nfcHandoverManager._checkConnected.called);
      assert.ok(MockBTAdapter.getConnectedDevices.called);
    });

    test('nfc/SimplifiedPairingRecord', function() {
      nfcHandoverManager.nfcConnectSystemDialog =
        new NfcConnectSystemDialog();
      nfcHandoverManager.tryHandover(activityInjection2.records,
                                     activityInjection2.peer);
      assert.isTrue(NfcConnectSystemDialog.prototype.show
        .withArgs('MBH10').calledOnce);
    });

    /*
     * Outbound file transfer is a two-phase process: sending handover request
     * to peer device (result of 'nfc-manager-senf-file' message) and sending
     * file over Bluetooth (result of peer device responding with hadover
     * select). Those two phases are tested in two separate test cases.
     */
    test('HandoverSelect when request type is RTD_HANDOVER_SELECT ' +
      'format', function() {
      this.sinon.spy(nfcHandoverManager, '_handleHandoverSelect');
      this.sinon.spy(nfcHandoverManager, '_getBluetoothSSP');

      nfcHandoverManager.nfcConnectSystemDialog =
        new NfcConnectSystemDialog();
      nfcHandoverManager.tryHandover(activityInjection1.records,
                                     activityInjection1.peer);

      assert.ok(nfcHandoverManager._handleHandoverSelect.called);
      assert.ok(nfcHandoverManager._getBluetoothSSP
        .calledWith(activityInjection1.records));
      assert.ok(nfcHandoverManager._checkConnected.called);
      assert.isTrue(NfcConnectSystemDialog.prototype.show
        .withArgs('UE MINI BOOM').calledOnce);
    });
  });

  suite('Handover request and select', function() {
    var cps;
    var mac;

    setup(function() {
      this.sinon.useFakeTimers();
      cps = NDEF.CPS_ACTIVE;
      mac = '01:23:45:67:89:AB';
      this.sinon.spy(nfcHandoverManager, '_doAction');
      this.sinon.spy(nfcHandoverManager, '_saveBluetoothStatus');
      nfcHandoverManager.start();
    });

    teardown(function() {
      nfcHandoverManager.stop();
      nfcHandoverManager._adapter = null;
    });

    test('handleHandoverRequest: aborting via empty Hs if file transfer ' +
      'is already in progress', function() {
      this.sinon.stub(Service, 'query')
        .withArgs('BluetoothTransfer.isFileTransferInProgress').returns(true);
      this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      var hs = NDEFUtils.encodeEmptyHandoverSelect();
      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);

      assert.isTrue(MockMozNfc.MockNFCPeer.sendNDEF.calledWith(hs));
    });

    test('handleHandoverRequest: proper handling when file transfer ' +
      'is not in progress', function() {
      this.sinon.stub(Service, 'query')
        .withArgs('BluetoothTransfer.isFileTransferInProgress').returns(false);
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);

      assert.ok(nfcHandoverManager._saveBluetoothStatus.called);
      assert.ok(nfcHandoverManager._doAction.calledWith({
        callback: nfcHandoverManager._doHandoverRequest,
        args: [handoverRequest, MockMozNfc.MockNFCPeer]
      }));
    });

    test('doHandoverRequest return early when _getBluetoothSSP is null',
      function() {
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      this.sinon.stub(nfcHandoverManager, '_getBluetoothSSP', function() {
        return null;
      });
      this.sinon.stub(Service, 'query').returns(true);
      nfcHandoverManager._doHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);

      assert.ok(!Service.query.called);
    });

    test('doHandoverRequest', function() {
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(NDEFUtils, 'encodeHandoverSelect');
      this.sinon.spy(nfcHandoverManager, '_clearTimeout');
      this.sinon.spy(nfcHandoverManager, '_restoreBluetoothStatus');
      this.sinon.spy(nfcHandoverManager, '_logVisibly');
      this.sinon.spy(nfcHandoverManager, '_cancelIncomingFileTransfer');
      var fakePromise = new MockPromise();
      this.sinon.stub(MockMozNfc.MockNFCPeer, 'sendNDEF',
        () => fakePromise);
      nfcHandoverManager._adapter = MockBTAdapter;
      nfcHandoverManager._doHandoverRequest(handoverRequest,
        MockMozNfc.MockNFCPeer);

      fakePromise.mFulfillToValue();
      assert.ok(Service.query.calledWith('Bluetooth.isEnabled'));
      assert.ok(NDEFUtils.encodeHandoverSelect.calledWith(
        MockBTAdapter.address,
        NDEF.CPS_ACTIVE));
      assert.ok(nfcHandoverManager._clearTimeout.called);
      assert.ok(!nfcHandoverManager._restoreBluetoothStatus.called);
      // Timeout incoming file transfer
      this.sinon.clock.tick(nfcHandoverManager.responseTimeoutMillis);
      assert.ok(nfcHandoverManager._cancelIncomingFileTransfer.called);

      fakePromise.mRejectToError();
      assert.ok(nfcHandoverManager._logVisibly.called);
      assert.ok(nfcHandoverManager._clearTimeout.called);
      assert.ok(nfcHandoverManager._restoreBluetoothStatus.called);
    });

    test('doHandoverRequest when nfcPeer is lost', function() {
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      this.sinon.spy(nfcHandoverManager, '_showFailedNotification');
      this.sinon.spy(nfcHandoverManager, '_restoreBluetoothStatus');
      nfcHandoverManager._adapter = MockBTAdapter;
      nfcHandoverManager._doHandoverRequest(handoverRequest,
        {isLost: true});

      assert.ok(nfcHandoverManager._showFailedNotification.called);
      assert.ok(nfcHandoverManager._restoreBluetoothStatus.called);
    });
  });

  /*
   * Outbound file transfer is a two-phase process: sending handover request
   * to peer device (result of 'nfc-manager-senf-file' message) and sending
   * file over Bluetooth (result of peer device responding with hadover
   * select). Those two phases are tested in two separate test cases.
   */
  suite('File transfer', function() {
    var fileRequest;

    setup(function() {
      MockNavigatormozSetMessageHandler.mSetup();
      this.sinon.spy(nfcHandoverManager, '_saveBluetoothStatus');
      this.sinon.spy(nfcHandoverManager, '_initiateFileTransfer');

      fileRequest = {
        peer: MockMozNfc.MockNFCPeer,
        blob: { name: 'Lorem ipsum' },
        requestId: 'request-01'
      };

      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.start();
    });

    teardown(function() {
      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.stop();
    });

    test('"nfc-manager-send-file" Proceed with file transfer if no ' +
      'concurrent filer transfer is in progress.', function() {
      this.sinon.stub(Service, 'query')
        .withArgs('BluetoothTransfer.isFileTransferInProgress')
        .returns(false);
      this.sinon.stub(nfcHandoverManager, '_doAction');
      nfcHandoverManager.handleFileTransfer(fileRequest);

      assert.ok(nfcHandoverManager._saveBluetoothStatus.called);
      assert.ok(nfcHandoverManager._doAction.calledWith({
        callback: nfcHandoverManager._initiateFileTransfer,
        args: [fileRequest]}));
    });

    test('Sending aborts when another file is transmitted concurrently',
      function() {
      MockService.mockQueryWith('BluetoothTransfer.isFileTransferInProgress',
        true);
      this.sinon.stub(nfcHandoverManager,'_showTryAgainNotification');
      this.sinon.stub(nfcHandoverManager, '_dispatchSendFileStatus');
      nfcHandoverManager.handleFileTransfer(fileRequest);

      assert.ok(nfcHandoverManager._dispatchSendFileStatus.calledWith(
                1, fileRequest.requestId));
      assert.ok(nfcHandoverManager._showTryAgainNotification.calledOnce,
                'Notification not shown');
    });

    test('Aborts when sendNDEF() fails.', function() {
      this.sinon.spy(nfcHandoverManager, 'handleFileTransfer');
      this.sinon.spy(nfcHandoverManager, '_dispatchSendFileStatus');
      this.sinon.spy(nfcHandoverManager, '_showTryAgainNotification');
      this.sinon.stub(Service, 'query').returns(true);
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      assert.ok(nfcHandoverManager.handleFileTransfer.called);
      assert.equal(0, nfcHandoverManager.sendFileQueue.length);
      assert.ok(nfcHandoverManager._dispatchSendFileStatus.called);
      assert.ok(nfcHandoverManager._showTryAgainNotification.called);
    });

    test('Aborts when MozNFCPeer lost during file send.', function() {
      fileRequest.peer = {isLost: true};
      this.sinon.stub(Service, 'query').returns(true);
      this.sinon.spy(nfcHandoverManager, 'handleFileTransfer');
      this.sinon.spy(nfcHandoverManager, '_dispatchSendFileStatus');
      this.sinon.stub(nfcHandoverManager, '_showTryAgainNotification');
      this.sinon.spy(MockMozNfc, 'notifySendFileStatus');
      this.sinon.stub(nfcHandoverManager, '_restoreBluetoothStatus');
      MockNavigatormozSetMessageHandler.mTrigger(
        'nfc-manager-send-file', fileRequest);

      assert.ok(nfcHandoverManager.handleFileTransfer.called);
      assert.ok(nfcHandoverManager._dispatchSendFileStatus.called);
      assert.ok(nfcHandoverManager._showTryAgainNotification.called);
      assert.ok(MockMozNfc.notifySendFileStatus.calledOnce);
      assert.equal(MockMozNfc.notifySendFileStatus.firstCall.args[0], 1);
      assert.ok(nfcHandoverManager._showTryAgainNotification
        .calledOnce, 'Notification not shown');
      assert.ok(!nfcHandoverManager._saveBluetoothStatus.called);
    });

    test('Aborts when MozNFCPeer lost during file receive.', function() {
      var cps = NDEF.CPS_ACTIVE;
      var mac = '01:23:45:67:89:AB';
      var handoverRequest = NDEFUtils.encodeHandoverRequest(mac, cps);
      this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');
      this.sinon.stub(Service, 'query').returns(false);
      this.sinon.stub(NDEFUtils, 'encodeEmptyHandoverSelect');
      this.sinon.stub(nfcHandoverManager, '_doAction');
      nfcHandoverManager._handleHandoverRequest(handoverRequest,
        {isLost: true});

      assert.ok(Service.query
        .calledWith('BluetoothTransfer.isFileTransferInProgress'));
      assert.ok(!NDEFUtils.encodeEmptyHandoverSelect.called);
      assert.ok(!MockMozNfc.MockNFCPeer.sendNDEF.called);
      assert.ok(nfcHandoverManager._saveBluetoothStatus.called);
      assert.ok(nfcHandoverManager._doAction.called);
    });

    test('Handover select results in file being transmitted over Bluetooth',
      function() {
      this.sinon.stub(Service, 'query').returns(true);
      var mac = fileRequest.mac;
      this.sinon.stub(nfcHandoverManager, '_clearTimeout');
      this.sinon.stub(nfcHandoverManager, '_getBluetoothSSP')
        .returns({mac: mac});
      this.sinon.spy(nfcHandoverManager, '_doAction');
      this.sinon.spy(nfcHandoverManager, '_doFileTransfer');
      this.sinon.spy(nfcHandoverManager, 'publish');

      nfcHandoverManager.sendFileQueue.push(fileRequest);

      var select = NDEFUtils.encodeHandoverSelect(
        mac, NDEF.CPS_ACTIVE);
      nfcHandoverManager._handleHandoverSelect(select);

      assert.ok(nfcHandoverManager._clearTimeout.called);
      assert.ok(nfcHandoverManager._doAction.calledWith({
        callback: nfcHandoverManager._doFileTransfer,
        args: [mac]
      }));
      assert.ok(nfcHandoverManager._doFileTransfer.called);
      assert.ok(nfcHandoverManager.publish.calledWith(
        'bluetooth-sendfile-via-handover', {
          mac: fileRequest.mac,
          blob: fileRequest.blob
        })
      );
    });

    test('Empty Handover Select results in abort', function() {
      fileRequest.onerror = sinon.stub();
      nfcHandoverManager.sendFileQueue.push(fileRequest);

      this.sinon.stub(nfcHandoverManager, '_showTryAgainNotification');
      this.sinon.spy(nfcHandoverManager, '_restoreBluetoothStatus');
      this.sinon.stub(nfcHandoverManager, '_doAction');

      var select = NDEFUtils.encodeEmptyHandoverSelect();
      nfcHandoverManager._handleHandoverSelect(select);

      assert.isTrue(nfcHandoverManager._doAction.notCalled);
      assert.isTrue(fileRequest.onerror.calledOnce);
      assert.isTrue(nfcHandoverManager._showTryAgainNotification.calledOnce,
                    'Notification not shown');
      assert.isTrue(nfcHandoverManager._restoreBluetoothStatus.calledOnce);
    });
  });

  suite('Initiate File transfer', function() {
    var fileRequest;

    setup(function() {
      this.sinon.useFakeTimers();
      MockNavigatormozSetMessageHandler.mSetup();
      this.sinon.spy(nfcHandoverManager, '_restoreBluetoothStatus');
      this.sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');
      this.sinon.spy(nfcHandoverManager, '_clearTimeout');
      nfcHandoverManager._adapter = MockBTAdapter;

      fileRequest = {
        peer: MockMozNfc.MockNFCPeer,
        blob: { name: 'Lorem ipsum' },
        requestId: 'request-01'
      };
    });

    teardown(function() {
      nfcHandoverManager._adapter = null;
    });

    test('sending a Handover Request to the remote device', function() {
      this.sinon.stub(Service, 'query'). returns(true);
      this.sinon.spy(NDEFUtils, 'encodeHandoverRequest');
      this.sinon.spy(nfcHandoverManager, '_cancelSendFileTransfer');
      nfcHandoverManager._initiateFileTransfer(fileRequest);

      assert.isFalse(nfcHandoverManager._restoreBluetoothStatus.called);
      assert.equal(nfcHandoverManager.sendFileQueue.length, 1);
      assert.ok(MockMozNfc.MockNFCPeer.sendNDEF.calledOnce);
      // CPS should be either active or activating. In this test
      // MockMozBluetooths sets it to active, so assert that.
      assert.ok(NDEFUtils.encodeHandoverRequest.calledWith(
        MockBTAdapter.address,
        NDEF.CPS_ACTIVE
      ));
      assert.ok(nfcHandoverManager._clearTimeout.called);
      // Timeout outgoing file transfer
      this.sinon.clock.tick(nfcHandoverManager.responseTimeoutMillis);
      assert.ok(nfcHandoverManager._cancelSendFileTransfer.called);
    });
  });

  suite('Action queuing when Bluetooth disabled', function() {
    setup(function() {
      nfcHandoverManager.actionQueue = [];
      nfcHandoverManager.start();
      this.sinon.spy(nfcHandoverManager, 'publish');
    });

    teardown(function() {
      nfcHandoverManager.actionQueue.splice(0);
      nfcHandoverManager.stop();
    });

    test('Action are queued when Bluetooth off', function() {
      this.sinon.stub(Service, 'query').returns(false);
      assert.equal(0, nfcHandoverManager.actionQueue.length);

      var action = {};
      nfcHandoverManager._doAction(action);
      MockNavigatorSettings.mReplyToRequests();

      assert.equal(1, nfcHandoverManager.actionQueue.length);
      assert.ok(nfcHandoverManager.publish
        .calledWith('request-enable-bluetooth'));
    });
  });

  suite('Restore state of Bluetooth adapter', function() {
    var spySendNDEF;
    var mockFileRequest;

    setup(function() {
      mockFileRequest = {
        peer: MockMozNfc.MockNFCPeer,
        blob: new Blob(),
        requestId: 'req-id-1'
      };
      spySendNDEF = sinon.spy(MockMozNfc.MockNFCPeer, 'sendNDEF');
      nfcHandoverManager.sendFileQueue = [];
      nfcHandoverManager.start();
    });

    teardown(function() {
      nfcHandoverManager.stop();
      spySendNDEF.restore();
    });

    test('Send file with BT enabled', function() {
      nfcHandoverManager._adapter = MockBTAdapter;
      nfcHandoverManager.handleFileTransfer(mockFileRequest);

      assert.equal(nfcHandoverManager._adapter, MockBTAdapter);

      var hs = NDEFUtils.encodeHandoverSelect('11:22:33:44:55:66',
        NDEF.CPS_ACTIVE);
      nfcHandoverManager._handleHandoverSelect(hs);

      assert.equal(nfcHandoverManager._adapter, MockBTAdapter);
    });

    test('Send file with BT disabled and empty send file queue',
      function() {
      nfcHandoverManager._adapter = null;
      this.sinon.stub(Service, 'query').returns(false);
      nfcHandoverManager.settingsNotified = false;
      this.sinon.spy(nfcHandoverManager, '_doAction');
      this.sinon.spy(nfcHandoverManager, '_checkConnected');
      this.sinon.spy(nfcHandoverManager, '_onRequestConnect');
      this.sinon.spy(nfcHandoverManager, 'publish');
      nfcHandoverManager.handleFileTransfer(mockFileRequest);

      assert.ok(nfcHandoverManager._doAction.called);
      //to enable event
      assert.ok(nfcHandoverManager.publish
        .calledWith('request-enable-bluetooth'));
      nfcHandoverManager._adapter = MockBTAdapter;

      var hs = NDEFUtils.encodeHandoverSelect('11:22:33:44:55:66',
      NDEF.CPS_ACTIVE);
      nfcHandoverManager._handleHandoverSelect(hs);

      assert.ok(nfcHandoverManager._checkConnected.called);
      assert.ok(nfcHandoverManager._onRequestConnect.called);
    });

    test('Send file with BT disabled and non-empty send file queue',
      function() {
      this.sinon.stub(nfcHandoverManager, '_restoreBluetoothStatus');
      // Now finalize the second transfer (the one not initiated
      // via NFC handover)
      var details = {received: false,
                     success: true,
                     viaHandover: false};
      nfcHandoverManager.transferComplete({detail: details});

      assert.ok(nfcHandoverManager._restoreBluetoothStatus.called);
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
      assert.isTrue(stubHandleSPR.withArgs([spr, hsr]).calledOnce,
        'handled');
      assert.isFalse(stubHandleHSR.called, 'not handled');
    });

    test('multiple records, handover record second, not handled',
      function() {
      var result = nfcHandoverManager.tryHandover([uriRecord, hsr],
         nfcPeer);
      assert.isFalse(result, 'result');
      assert.isFalse(stubHandleHSR.called, 'not handled');
    });
  });
});
