'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/test/unit/mock_navigator_get_device_storage.js');
require('/test/unit/mock_bluetooth.js');
require('/test/unit/mock_l10n.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_custom_dialog.js');
require('/shared/js/mime_mapper.js');
require('/test/unit/mock_utility_tray.js');
require('/test/unit/mock_nfc_handover_manager.js');
require('/test/unit/mock_activity.js');

var mocksForBluetoothTransfer = new MocksHelper([
  'Bluetooth',
  'NotificationHelper',
  'CustomDialog',
  'MozActivity',
  'UtilityTray',
  'NfcHandoverManager'
]).init();

suite('system/bluetooth_transfer', function() {
  mocksForBluetoothTransfer.attachTestHelpers();

  var realSetMessageHandler;
  var realNavigatorGetDeviceStorage;
  var realL10n;
  var realPairList;
  var real_sendingFilesQueue;

  var fakePairList;
  var fake_sendingFilesQueue;

  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realNavigatorGetDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockNavigatorGetDeviceStorage;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    MockNavigatormozSetMessageHandler.mSetup();

    requireApp('system/js/bluetooth_transfer.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.getDeviceStorage = realNavigatorGetDeviceStorage;
    navigator.mozL10n = realL10n;
  });

  suite('UI', function() {
    suite('getPairedDevice', function() {
      suite('have paired devices', function() {
        var getPairedDeviceCompleteCallback = function() {};

        setup(function(done) {
          getPairedDeviceCompleteCallback = this.sinon.spy();
          BluetoothTransfer.getPairedDevice(function() {
            getPairedDeviceCompleteCallback();
            done();
          });
        });

        test('have paired devices ', function() {
          assert.ok(getPairedDeviceCompleteCallback.called);
        });
      });
    });

    suite('getDeviceName', function() {
      setup(function() {
        realPairList = BluetoothTransfer.pairList;
        fakePairList = {
          index: [{name: 'device-No1',
                  address: '00:11:22:AA:BB:CC'},
                  {name: 'device-No2',
                  address: 'AA:BB:CC:00:11:22'}
        ]};
        BluetoothTransfer.pairList = fakePairList;
      });

      teardown(function() {
        BluetoothTransfer.pairList = realPairList;
      });

      suite('have device name', function() {
        test('have device name ', function() {
          var address = 'AA:BB:CC:00:11:22';
          var deviceName = 'device-No2';
          assert.equal(deviceName, BluetoothTransfer.getDeviceName(address));
        });
      });

      suite('no device name', function() {
        setup(function() {
          BluetoothTransfer.pairList = {
            index: []
          };
        });

        test('no device name ', function() {
          var address = 'AA:BB:CC:00:11:22';
          var deviceName = 'unknown-device';
          assert.equal(deviceName, BluetoothTransfer.getDeviceName(address));
        });
      });
    });

    suite('humanizeSize', function() {
      test('should handle zero size ', function() {
        var expectedSize = 'fileSize{"size":"0.00","unit":"byteUnit-B"}';
        assert.equal(expectedSize, BluetoothTransfer.humanizeSize(0));
      });

      test('should handle bytes size ', function() {
        var expectedSize = 'fileSize{"size":"42.00","unit":"byteUnit-B"}';
        assert.equal(expectedSize, BluetoothTransfer.humanizeSize(42));
      });

      test('should handle kilobytes size ', function() {
        var expectedSize = 'fileSize{"size":"1.00","unit":"byteUnit-KB"}';
        assert.equal(expectedSize, BluetoothTransfer.humanizeSize(1024));
      });

      test('should handle megabytes size ', function() {
        var expectedSize = 'fileSize{"size":"4.67","unit":"byteUnit-MB"}';
        assert.equal(expectedSize, BluetoothTransfer.humanizeSize(4901024));
      });

      test('should handle gigabytes size ', function() {
        var expectedSize = 'fileSize{"size":"3.73","unit":"byteUnit-GB"}';
        assert.equal(expectedSize, BluetoothTransfer.humanizeSize(4000901024));
      });
    });

    suite('operate sending files queue ', function() {
      suiteSetup(function() {
        real_sendingFilesQueue = BluetoothTransfer._sendingFilesQueue;
        fake_sendingFilesQueue = [{
          numberOfFiles: 1,
          numSuccessful: 0,
          numUnsuccessful: 0
        }];
        BluetoothTransfer._sendingFilesQueue = fake_sendingFilesQueue;
      });

      suiteTeardown(function() {
        BluetoothTransfer._sendingFilesQueue = real_sendingFilesQueue;
      });

      test('push sending files request in queue, then create notification ',
        function() {
        var sendingFilesSchedule = {
          numberOfFiles: 2,
          numSuccessful: 0,
          numUnsuccessful: 0
        };
        var evt = {
          detail: sendingFilesSchedule
        };
        var title = 'transfer-has-started-title';
        BluetoothTransfer.onFilesSending(evt);
        assert.equal(2, BluetoothTransfer._sendingFilesQueue.length);
        assert.equal(MockNotificationHelper.mTitle, title);
      });

      test('received onTransferComplete callback for received task, ' +
           'should be ignored.. ', function() {
        var transferInfo = {
          received: true,
          success: true
        };
        BluetoothTransfer.summarizeSentFilesReport(transferInfo);
        assert.equal(2, BluetoothTransfer._sendingFilesQueue.length);
        assert.equal(MockNotificationHelper.mTitle, null);
      });

      test('received onTransferComplete callback for the first sent task, ' +
           'should remove the tast from queue.. ', function() {
        var transferInfo = {
          received: false,
          success: true
        };
        BluetoothTransfer.summarizeSentFilesReport(transferInfo);
        assert.equal(1, BluetoothTransfer._sendingFilesQueue.length);
        assert.equal(MockNotificationHelper.mTitle, null);
      });

      test('received onTransferComplete callback for the second sent task' +
           ' --> first file, should record success/fail report in queue.. ',
           function() {
        var transferInfo = {
          received: false,
          success: false
        };
        BluetoothTransfer.summarizeSentFilesReport(transferInfo);
        assert.equal(1, BluetoothTransfer._sendingFilesQueue.length);
        assert.equal(1,
          BluetoothTransfer._sendingFilesQueue[0].numUnsuccessful);

        assert.equal(MockNotificationHelper.mTitle, null);
      });

      test('received onTransferComplete callback for the second sent task' +
           ' --> the second file, should remove the tast from queue. Then, ' +
           'create a report in notification.. ', function() {
        var transferInfo = {
          received: false,
          success: true
        };
        var title = 'transferReport-title';
        var body = 'transferReport-description' +
                   '{"numSuccessful":1,"numUnsuccessful":1}';

        BluetoothTransfer.summarizeSentFilesReport(transferInfo);
        assert.equal(0, BluetoothTransfer._sendingFilesQueue.length);
        assert.equal(MockNotificationHelper.mTitle, title);
        assert.equal(MockNotificationHelper.mBody, body);
      });
    });

    suite('confirmation, decline, accept, and storage check', function() {
      test('receivingFileConfirmation', function() {
        var stubIsHandOverInProgress =
          this.sinon.stub(MockNfcHandoverManager, 'isHandoverInProgress')
          .returns(false);
        var stubGetDeviceName =
          this.sinon.stub(BluetoothTransfer, 'getDeviceName')
          .returns('nameName');
        var stubGetPairedDevice =
          this.sinon.stub(BluetoothTransfer, 'getPairedDevice');
        var stubMockUtilityTrayHide =
          this.sinon.stub(MockUtilityTray, 'hide');
        var stubShowReceivePrompt =
          this.sinon.stub(BluetoothTransfer, 'showReceivePrompt');
        var _ = navigator.mozL10n.get;
        var evt = {
          address: 'AA:BB:CC:00:11:22',
          fileLength: 1048000
        };
        BluetoothTransfer.onReceivingFileConfirmation(evt);
        assert.isTrue(stubIsHandOverInProgress.called);
        assert.isTrue(stubGetPairedDevice.called);

        // call getPairedDeviceComplete
        stubGetPairedDevice.getCall(0).args[0]();

        assert.isTrue(stubGetDeviceName.calledWith(evt.address));

        assert.equal(
          MockNotificationHelper.mTitle,
          _('transfer-confirmation-title', {deviceName: 'nameName'})
        );
        assert.equal(
          MockNotificationHelper.mBody,
          _('transfer-confirmation-description')
        );
        assert.equal(
          MockNotificationHelper.mIcon,
          'style/bluetooth_transfer/images/icon_bluetooth.png'
        );
        MockNotificationHelper.mClickCB();
        assert.isTrue(stubMockUtilityTrayHide.called);
        assert.isTrue(stubShowReceivePrompt.called);
        MockNotificationHelper.mTeardown();
      });

      test('declineReceive', function() {
        var spyConfirmReceivingFile =
          this.sinon.spy(MockBluetooth.defaultAdapter, 'confirmReceivingFile');

        BluetoothTransfer.declineReceive('AA:BB:CC:00:22:33');

        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(
          spyConfirmReceivingFile.calledWith('AA:BB:CC:00:22:33', false)
        );

        spyConfirmReceivingFile.reset();

        var stubGetAdapater =
          this.sinon.stub(MockBluetooth, 'getAdapter').returns(null);

        BluetoothTransfer.declineReceive('AA:BB:CC:00:22:33');
        assert.isFalse(spyConfirmReceivingFile.called);

        MockCustomDialog.mTeardown();
      });

      test('acceptReceive', function() {
        var evt = {
          address: 'AA:BB:CC:00:11:24',
          fileLength: 1048500
        };
        var stubCheckStorageSpace =
          this.sinon.stub(BluetoothTransfer, 'checkStorageSpace');
        var stubShowStorageUnavailablePrompt =
          this.sinon.stub(BluetoothTransfer, 'showStorageUnavaliablePrompt');
        var spyConfirmReceivingFile =
          this.sinon.spy(MockBluetooth.defaultAdapter, 'confirmReceivingFile');

        BluetoothTransfer.acceptReceive(evt);

        assert.isFalse(MockCustomDialog.mShown);

        assert.isTrue(stubCheckStorageSpace.calledWith(evt.fileLength));
        stubCheckStorageSpace.getCall(0).args[1](true, 'somemsg');
        assert.isTrue(
          spyConfirmReceivingFile.calledWith(evt.address, true)
        );

        spyConfirmReceivingFile.reset();
        stubCheckStorageSpace.getCall(0).args[1](false, 'somemsg2');
        assert.isTrue(
          spyConfirmReceivingFile.calledWith(evt.address, false)
        );
        assert.isTrue(stubShowStorageUnavailablePrompt.calledWith('somemsg2'));

        spyConfirmReceivingFile.reset();
        var stubGetAdapater =
          this.sinon.stub(MockBluetooth, 'getAdapter').returns(null);
        stubCheckStorageSpace.getCall(0).args[1](false, 'somemsg3');
        assert.isFalse(spyConfirmReceivingFile.called);

        MockCustomDialog.mTeardown();
      });

      test('showStorageUnavaliablePrompt', function() {
        var _ = navigator.mozL10n.get;

        MockCustomDialog.mTeardown();

        BluetoothTransfer.showStorageUnavaliablePrompt('message');

        assert.equal(MockCustomDialog.mShowedTitle, _('cannotReceiveFile'));
        assert.equal(
          MockCustomDialog.mShowedMsg,
          'message'
        );
        assert.isTrue(MockCustomDialog.mShown);

        assert.equal(MockCustomDialog.mShowedCancel.title, _('confirm'));
        MockCustomDialog.mShowedCancel.callback();
        assert.isFalse(MockCustomDialog.mShown);

        MockCustomDialog.mTeardown();
      });

      test('checkStorageSpace', function() {
        var _ = navigator.mozL10n.get;

        var spyCb = this.sinon.spy();
        var mockDeviceStorage = MockNavigatorGetDeviceStorage();
        var spyAvailable = this.sinon.spy(mockDeviceStorage, 'available');
        var spyFreeSpace = this.sinon.spy(mockDeviceStorage, 'freeSpace');

        BluetoothTransfer.checkStorageSpace(10240, spyCb);

        assert.isTrue(spyAvailable.called);
        var availreq = spyAvailable.getCall(0).returnValue;

        availreq.fireError(null);
        assert.isTrue(spyCb.calledWith(false, _('cannotGetStorageState')));
        assert.isFalse(spyFreeSpace.called);
        spyFreeSpace.reset();
        spyCb.reset();

        availreq.readyState = 'pending';
        availreq.fireSuccess('unavailable');
        assert.isTrue(spyCb.calledWith(false, _('sdcard-not-exist2')));
        assert.isFalse(spyFreeSpace.called);
        spyFreeSpace.reset();
        spyCb.reset();

        availreq.readyState = 'pending';
        availreq.fireSuccess('shared');
        assert.isTrue(spyCb.calledWith(false, _('sdcard-in-use')));
        assert.isFalse(spyFreeSpace.called);
        spyFreeSpace.reset();
        spyCb.reset();

        availreq.readyState = 'pending';
        availreq.fireSuccess('some-default-case');
        assert.isTrue(spyCb.calledWith(false, _('unknown-error')));
        assert.isFalse(spyFreeSpace.called);
        spyFreeSpace.reset();
        spyCb.reset();

        availreq.readyState = 'pending';
        availreq.fireSuccess('available');
        var freereq = spyFreeSpace.getCall(0).returnValue;
        freereq.fireError();
        assert.isTrue(spyCb.calledWith(false, _('cannotGetStorageState')));
        spyCb.reset();

        freereq.readyState = 'pending';
        freereq.fireSuccess(20480);
        assert.isTrue(spyCb.calledWith(true, ''));
        spyCb.reset();

        freereq.readyState = 'pending';
        freereq.fireSuccess(512);
        assert.isTrue(spyCb.calledWith(false, 'sdcard-no-space2'));
        spyCb.reset();

        spyAvailable.reset();
        BluetoothTransfer.checkStorageSpace(10240, null);
        assert.isFalse(spyAvailable.called);
      });
    });

    suite('openReceivedFile', function() {
      test('until getreq.onsuccess', function() {
        var evt = {
          fileName: 'someFile.txt',
          contentType: 'text/plain'
        };

        var mockDeviceStorage = MockNavigatorGetDeviceStorage();
        var spyGetDeviceStorage = this.sinon.spy(navigator, 'getDeviceStorage');
        var spyGet = this.sinon.spy(mockDeviceStorage, 'get');

        BluetoothTransfer.openReceivedFile(evt);
        assert.isTrue(spyGetDeviceStorage.calledWith('sdcard'));
        assert.isTrue(spyGet.calledWith('Download/Bluetooth/' + evt.fileName));
      });

      test('into getreq.onsuccess', function() {
        var evt = {
          fileName: 'someFile.txt',
          contentType: 'text/plain'
        };

        var mockDeviceStorage = MockNavigatorGetDeviceStorage();
        var spyGet = this.sinon.spy(mockDeviceStorage, 'get');
        BluetoothTransfer.openReceivedFile(evt);

        var stubMimeIsSupportedType =
          this.sinon.stub(MimeMapper, 'isSupportedType').returns(false);
        var stubMimeGuessTypeFromExtension =
          this.sinon.stub(MimeMapper, 'guessTypeFromExtension')
          .returns('text/plain');

        var req = spyGet.getCall(0).returnValue;

        req.fireSuccess({
          name: evt.fileName,
          type: evt.contentType
        });

        assert.equal(mockMozActivityInstance.name, 'open');
        assert.deepEqual(
          mockMozActivityInstance.data,
          {
            type: req.result.type,
            blob: req.result,
            filename: req.result.name
          }
        );

        assert.isFunction(mockMozActivityInstance.onsuccess);
        assert.isFunction(mockMozActivityInstance.onerror);

        var stubMockUtilityTrayHide = this.sinon.stub(MockUtilityTray, 'hide');
        var stubShowUnknownMediaPrompt =
          this.sinon.stub(BluetoothTransfer, 'showUnknownMediaPrompt');

        mockMozActivityInstance.error = {
          name: 'NO_PROVIDER'
        };

        mockMozActivityInstance.onerror(null);

        assert.isTrue(stubMockUtilityTrayHide.called);
        assert.isTrue(stubShowUnknownMediaPrompt.calledWith(req.result.name));

        stubMockUtilityTrayHide.reset();
        stubShowUnknownMediaPrompt.reset();

        mockMozActivityInstance.error = {
            name: 'USER_ABORT'
        };

        mockMozActivityInstance.onerror(null);

        assert.isFalse(stubMockUtilityTrayHide.called);
        assert.isFalse(stubShowUnknownMediaPrompt.calledWith(req.result.name));
      });

      test('getreq.onsuccess with vcard', function() {
        var evt = {
          fileName: 'someCard.vcf',
          contentType: 'text/vcard'
        };

        var mockDeviceStorage = MockNavigatorGetDeviceStorage();
        var spyGet = this.sinon.spy(mockDeviceStorage, 'get');

        BluetoothTransfer.openReceivedFile(evt);

        var stubMimeIsSupportedType =
        this.sinon.stub(MimeMapper, 'isSupportedType').returns(true);

        var req = spyGet.getCall(0).returnValue;

        req.fireSuccess({
          name: evt.fileName,
          type: evt.contentType
        });

        assert.equal(mockMozActivityInstance.name, 'import');
        assert.deepEqual(
          mockMozActivityInstance.data,
          {
            type: req.result.type,
            blob: req.result,
            filename: req.result.name
          }
        );

        assert.isFunction(mockMozActivityInstance.onsuccess);
        assert.isFunction(mockMozActivityInstance.onerror);
      });

      test('showUnknownMediaPrompt', function() {
        var _ = navigator.mozL10n.get;

        MockCustomDialog.mTeardown();

        BluetoothTransfer.showUnknownMediaPrompt('theFile.ext');

        assert.equal(MockCustomDialog.mShowedTitle, _('cannotOpenFile'));
        assert.equal(
          MockCustomDialog.mShowedMsg,
          _('unknownMediaTypeToOpen') + ' ' + 'theFile.ext'
        );
        assert.isTrue(MockCustomDialog.mShown);

        assert.equal(MockCustomDialog.mShowedCancel.title, _('confirm'));
        MockCustomDialog.mShowedCancel.callback();
        assert.isFalse(MockCustomDialog.mShown);

        MockCustomDialog.mTeardown();
      });
    });

    suite('sendFile, transfer, and progress', function() {
      test('sendFile', function() {
        var spySendFile =
          this.sinon.spy(MockBluetooth.defaultAdapter, 'sendFile');
        var stubOnFilesSending =
          this.sinon.stub(BluetoothTransfer, 'onFilesSending');
        var stubSetTimeout = this.sinon.stub(window, 'setTimeout');
        BluetoothTransfer.sendFile(
          'AA:BB:CC:00:11:55',
          'blahblahblah\0xa0\0xa0blahblahblah'
        );

        assert.isTrue(stubOnFilesSending.called);
        assert.equal(typeof stubOnFilesSending.getCall(0).args[0], 'object');

        assert.isTrue(stubSetTimeout.called);
        assert.isTrue(stubSetTimeout.getCall(0).args[1] > 0);
        stubSetTimeout.getCall(0).args[0]();

        assert.isTrue(
          spySendFile
          .calledWith('AA:BB:CC:00:11:55', 'blahblahblah\0xa0\0xa0blahblahblah')
        );

        var stubGetAdapater =
          this.sinon.stub(MockBluetooth, 'getAdapter').returns(null);
        BluetoothTransfer.sendFile(
          'AA:BB:CC:00:11:66',
          'blahblahblah\0xa0\0xa0blahblahblahblah'
        );

        stubOnFilesSending.reset();
        assert.isFalse(stubOnFilesSending.called);
      });

      test('onUpdateProgress', function() {
        // mode = start
        var stubInitProgress =
          this.sinon.stub(BluetoothTransfer, 'initProgress');
        var evt = {
          detail: {
            transferInfo: 'info123'
          }
        };

        BluetoothTransfer.onUpdateProgress('start', evt);
        assert.isTrue(stubInitProgress.calledWith('info123'));

        // mode = progress
        var stubUpdateProgress =
          this.sinon.stub(BluetoothTransfer, 'updateProgress');
        evt = {
          address: 'AA:BB:DD:11:22:44',
          processedLength: '1024',
          fileLength: '2048'
        };

        BluetoothTransfer.onUpdateProgress('progress', evt);
        assert.isTrue(
            Math.abs(stubUpdateProgress.getCall(0).args[0]) -
            (evt.processedLength / evt.fileLength) <
            0.00001
        );
        assert.equal(stubUpdateProgress.getCall(0).args[1], evt);

        evt.fileLength = 0;
        BluetoothTransfer.onUpdateProgress('progress', evt);
        assert.isTrue(stubUpdateProgress.calledWith(0, evt));

        evt.fileLength = 1024;
        evt.processedLength = 1000;
        BluetoothTransfer.onUpdateProgress('progress', evt);
        assert.isTrue(stubUpdateProgress.calledWith(0, evt));

        stubUpdateProgress.reset();
      });

      test('onCancelTransferTask', function() {
        var stubMockUtilityTrayHide = this.sinon.stub(MockUtilityTray, 'hide');
        var stubShowCancelTransferPrompt =
          this.sinon.stub(BluetoothTransfer, 'showCancelTransferPrompt');

        BluetoothTransfer.onCancelTransferTask({
          target: {
            dataset: {
              id: 1234
            }
          }
        });

        assert.isTrue(stubMockUtilityTrayHide.called);
        assert.isTrue(stubShowCancelTransferPrompt.calledWith(1234));
      });

      test('showCancelTransferPrompt', function() {
        MockCustomDialog.mTeardown();

        var _ = navigator.mozL10n.get;

        var stubContinueTransfer =
          this.sinon.stub(BluetoothTransfer, 'continueTransfer');
        var stubCancelTransfer =
          this.sinon.stub(BluetoothTransfer, 'cancelTransfer');

        BluetoothTransfer.showCancelTransferPrompt('DD:FE:00:11:22:33');

        assert.isTrue(MockCustomDialog.mShown);
        assert.equal(MockCustomDialog.mShowedTitle, _('cancelFileTransfer'));
        assert.equal(MockCustomDialog.mShowedMsg, _('cancelFileTransfer'));
        assert.equal(
          MockCustomDialog.mShowedCancel.title,
          _('continueFileTransfer')
        );
        assert.equal(MockCustomDialog.mShowedConfirm.title, _('cancel'));

        MockCustomDialog.mShowedCancel.callback();
        assert.isTrue(stubContinueTransfer.called);

        MockCustomDialog.mShowedConfirm.callback();
        assert.isTrue(stubCancelTransfer.calledWith('DD:FE:00:11:22:33'));

        MockCustomDialog.mTeardown();
      });

      test('cancelTransfer', function() {
        var spyStopSendingFile =
          this.sinon.spy(MockBluetooth.defaultAdapter, 'stopSendingFile');
        MockCustomDialog.mTeardown();

        BluetoothTransfer.cancelTransfer('CC:DD:00:AA:22:44');

        assert.isFalse(MockCustomDialog.mShown);
        assert.isTrue(spyStopSendingFile.calledWith('CC:DD:00:AA:22:44'));

        var stubGetAdapater =
          this.sinon.stub(MockBluetooth, 'getAdapter').returns(null);

        spyStopSendingFile.reset();

        BluetoothTransfer.cancelTransfer('CC:DD:00:AA:22:44');
        assert.isFalse(spyStopSendingFile.called);

        MockCustomDialog.mTeardown();
      });
    });
  });
});
