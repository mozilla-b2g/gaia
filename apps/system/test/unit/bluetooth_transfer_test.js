'use strict';

mocha.globals(['BluetoothTransfer']);

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js'
);

requireApp('system/test/unit/mock_navigator_get_device_storage.js');
requireApp('system/test/unit/mock_bluetooth.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('sms/shared/test/unit/mocks/mock_notification_helper.js');

var mocksForBluetoothTransfer = new MocksHelper([
  'Bluetooth',
  'NotificationHelper'
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
  });
});
