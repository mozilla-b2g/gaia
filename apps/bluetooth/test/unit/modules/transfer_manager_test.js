/* global MockNavigatormozSetMessageHandler, MockNavigatormozApps */

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('Bluetooth app > PairManager ', function() {
  var realSetMessageHandler;
  var realMozApps;
  var realGetDeviceStorage;
  var AdapterManager;
  var BtContext;
  var CannotTransferDialog;
  var DevicePickerPanel;
  var TurnBluetoothOnDialog;
  var TransferManager;

  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    MockNavigatormozSetMessageHandler.mSetup();

    var modules = [
      'modules/bluetooth/bluetooth_adapter_manager',
      'modules/bluetooth/bluetooth_context',
      'views/cannot_transfer_dialog',
      'views/device_picker_panel',
      'views/turn_bluetooth_on_dialog',
      'modules/transfer_manager'
    ];

    var maps = {
      '*': {
        'modules/bluetooth/bluetooth_adapter_manager': 'MockAdapterManager',
        'modules/bluetooth/bluetooth_context': 'MockBluetoothContext',
        'views/cannot_transfer_dialog': 'unit/mock_cannot_transfer_dialog',
        'views/device_picker_panel': 'MockDevicePickerPanel',
        'views/turn_bluetooth_on_dialog': 'unit/mock_turn_bluetooth_on_dialog'
      }
    };

    this.MockAdapterManager = {
      defaultAdapter: {},
      observe: function() {}
    };

    define('MockAdapterManager', function() {
      return this.MockAdapterManager;
    }.bind(this));

    this.MockBluetoothContext = {
      callbacks: {
        'enabled': []
      },
      observe: function(eventName, callback) {
        this.callbacks[eventName].push(callback);
      },
      setEnabled: function() {},
      sendFile: function() {}
    };

    define('MockBluetoothContext', function() {
      return this.MockBluetoothContext;
    }.bind(this));

    this.MockDevicePickerPanel = {
      visible: false,
      addEventListener: function() {}
    };

    define('MockDevicePickerPanel', function() {
      return this.MockDevicePickerPanel;
    }.bind(this));

    var requireCtx = testRequire([], maps, function() {});
    requireCtx(modules, function(adapterManager, btContext,
                                 cannotTransferDialog, devicePickerPanel,
                                 turnBluetoothOnDialog, transferManager) {
      AdapterManager = adapterManager;
      BtContext = btContext;
      CannotTransferDialog = cannotTransferDialog;
      DevicePickerPanel = devicePickerPanel;
      TurnBluetoothOnDialog = turnBluetoothOnDialog;
      TransferManager = transferManager;

      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    MockNavigatormozApps.mTeardown();
    navigator.mozApps = realMozApps;
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.getDeviceStorage = realGetDeviceStorage;
  });

  suite('init > ', function() {
    setup(function() {
      this.sinon.stub(TransferManager, '_watchActivityRequest');
    });

    test('_watchActivityRequest() should be called ', function() {
      TransferManager.init();
      assert.isTrue(TransferManager._watchActivityRequest.called);
    });
  });

  suite('_watchActivityRequest > ', function() {
    setup(function() {
      this.sinon.stub(navigator, 'mozSetMessageHandler');
      this.sinon.stub(TransferManager, '_activityHandler');
    });

    test('navigator.mozSetMessageHandler() should be set with activity handler',
         function() {
      TransferManager._watchActivityRequest();
      assert.equal(navigator.mozSetMessageHandler.args[0][0], 'activity');
      navigator.mozSetMessageHandler.args[0][1]();
      assert.isTrue(TransferManager._activityHandler.called);
    });
  });

  suite('_activityHandler > ', function() {
    var mockActivityRequest;
    suite('accepted format to service sending files > ', function() {
      setup(function() {
        mockActivityRequest = {
          source: {
            name: 'share',
            data: {
              blobs: [{}, {}]
            }
          }
        };
        TransferManager._activity = null;
        DevicePickerPanel.visible = false;
        this.sinon.stub(TransferManager, '_observeDefaultAdapter');
        this.sinon.stub(TransferManager, '_observeBluetoothEnabled');
        this.sinon.stub(TransferManager, '_watchEventFromDevicePicker');
        this.sinon.stub(TransferManager, '_cannotTransfer');
      });

      test('Should service the activity request, ' +
           'adapter, Bluetooth state, device picker should be observed event ',
           function() {
        TransferManager._activityHandler(mockActivityRequest);
        assert.deepEqual(TransferManager._activity, mockActivityRequest);
        assert.isTrue(TransferManager._observeDefaultAdapter.called);
        assert.isTrue(TransferManager._observeBluetoothEnabled.called);
        assert.isTrue(TransferManager._watchEventFromDevicePicker.called);
        assert.isTrue(DevicePickerPanel.visible);
        assert.isFalse(TransferManager._cannotTransfer.called);
      });
    });

    suite('unaccepted format to cancel sending files > ', function() {
      setup(function() {
        TransferManager._activity = null;
        DevicePickerPanel.visible = false;
        this.sinon.stub(TransferManager, '_observeDefaultAdapter');
        this.sinon.stub(TransferManager, '_observeBluetoothEnabled');
        this.sinon.stub(TransferManager, '_watchEventFromDevicePicker');
        this.sinon.stub(TransferManager, '_cannotTransfer');
      });

      suite('no blobs in activity.source.data > ', function() {
        setup(function() {
          mockActivityRequest = {
            source: {
              name: 'share',
              data: {}
            }
          };
        });

        test('Should not service the activity request, ' +
             '_cannotTransfer() should be called ',
             function() {
          TransferManager._activityHandler(mockActivityRequest);
          assert.isNull(TransferManager._activity);
          assert.isFalse(TransferManager._observeDefaultAdapter.called);
          assert.isFalse(TransferManager._observeBluetoothEnabled.called);
          assert.isFalse(TransferManager._watchEventFromDevicePicker.called);
          assert.isFalse(DevicePickerPanel.visible);
          assert.isTrue(TransferManager._cannotTransfer.called);
        });
      });

      suite('empty array in activity.source.data.blobs > ', function() {
        setup(function() {
          mockActivityRequest = {
            source: {
              name: 'share',
              data: {
                blobs: []
              }
            }
          };
        });

        test('Should not service the activity request, ' +
             '_cannotTransfer() should be called ',
             function() {
          TransferManager._activityHandler(mockActivityRequest);
          assert.isNull(TransferManager._activity);
          assert.isFalse(TransferManager._observeDefaultAdapter.called);
          assert.isFalse(TransferManager._observeBluetoothEnabled.called);
          assert.isFalse(TransferManager._watchEventFromDevicePicker.called);
          assert.isFalse(DevicePickerPanel.visible);
          assert.isTrue(TransferManager._cannotTransfer.called);
        });
      });
    });
  });

  suite('_cannotTransfer > ', function() {
    suite('CannotTransferDialog is not visible > ', function() {
      var mockShowConfirmPromise;
      setup(function() {
        switchReadOnlyProperty(CannotTransferDialog, 'isVisible', false);
        mockShowConfirmPromise = Promise.resolve();
        this.sinon.stub(CannotTransferDialog, 'showConfirm').returns(
          mockShowConfirmPromise);
        this.sinon.stub(TransferManager, '_endTransferWithReason');
      });

      test('CannotTransferDialog should be shown, ' +
           '_endTransferWithReason() should be called with "cancelled"' +
           'after a user confirm the dialog ', function(done) {
        TransferManager._cannotTransfer();
        assert.isTrue(CannotTransferDialog.showConfirm.called);
        CannotTransferDialog.showConfirm().then(() => {
          assert.isTrue(
            TransferManager._endTransferWithReason.calledWith('cancelled'));
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('CannotTransferDialog is visible > ', function() {
      setup(function() {
        switchReadOnlyProperty(CannotTransferDialog, 'isVisible', true);
        this.sinon.stub(CannotTransferDialog, 'showConfirm');
        this.sinon.stub(TransferManager, '_endTransferWithReason');
      });

      test('_endTransferWithReason() should not be called ', function() {
        TransferManager._cannotTransfer();
        assert.isFalse(CannotTransferDialog.showConfirm.called);
      });
    });
  });

  suite('_endTransferWithReason > ', function() {
    var mockActivityRequest, mockReason;
    suite('reason is "transferred" > ', function() {
      setup(function() {
        mockActivityRequest = {
          postResult: function() {}
        };
        TransferManager._activity = mockActivityRequest;
        this.sinon.stub(mockActivityRequest, 'postResult');
        mockReason = 'transferred';
      });

      test('postResult() should be call with the reason ', function() {
        TransferManager._endTransferWithReason(mockReason);
        assert.isTrue(mockActivityRequest.postResult.calledWith(mockReason));
        assert.isNull(TransferManager._activity);
      });
    });

    suite('reason is "cancelled" > ', function() {
      setup(function() {
        mockActivityRequest = {
          postError: function() {}
        };
        TransferManager._activity = mockActivityRequest;
        this.sinon.stub(mockActivityRequest, 'postError');
        mockReason = 'cancelled';
      });

      test('postError() should be call with the reason ', function() {
        TransferManager._endTransferWithReason(mockReason);
        assert.isTrue(mockActivityRequest.postError.calledWith(mockReason));
        assert.isNull(TransferManager._activity);
      });
    });
  });

  suite('_observeDefaultAdapter > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {};
      AdapterManager.defaultAdapter = mockAdapter;
      this.sinon.stub(AdapterManager, 'observe');
      this.sinon.stub(TransferManager, '_onDefaultAdapterChanged');
    });

    test('AdapterManager should be observed with "defaultAdapter", ' +
         '_onDefaultAdapterChanged() should be called ', function() {
      TransferManager._observeDefaultAdapter();
      assert.equal(AdapterManager.observe.args[0][0], 'defaultAdapter');
      assert.isDefined(AdapterManager.observe.args[0][1]);
      assert.isTrue(TransferManager._onDefaultAdapterChanged.calledWith(
        mockAdapter));
    });
  });

  suite('_observeBluetoothEnabled > ', function() {
    var mockEnabledState;
    setup(function() {
      mockEnabledState = true;
      BtContext.enabled = mockEnabledState;
      this.sinon.stub(BtContext, 'observe');
      this.sinon.stub(TransferManager, '_onBluetoothEnabledChanged');
    });

    test('BtContext should be observed with "enabled"', function() {
      TransferManager._observeBluetoothEnabled();
      assert.equal(BtContext.observe.args[0][0], 'enabled');
      assert.isDefined(BtContext.observe.args[0][1]);
    });
  });

  suite('_onDefaultAdapterChanged > ', function() {
    suite('adapter is changed from existing instance to null > ', function() {
      var mockNewAdapter, mockOldAdapter;
      setup(function() {
        mockNewAdapter = null;
        mockOldAdapter = {};
        this.sinon.stub(TransferManager, '_endTransferWithReason');
      });

      test('_endTransferWithReason() should be called with reason "cancelled"',
           function() {
        TransferManager._onDefaultAdapterChanged(
          mockNewAdapter, mockOldAdapter);
        assert.isTrue(TransferManager._endTransferWithReason.calledWith(
          'cancelled'));
      });
    });

    suite('adapter is changed from null to existing instance > ', function() {
      var mockNewAdapter, mockOldAdapter;
      setup(function() {
        mockNewAdapter = {};
        mockOldAdapter = null;
        this.sinon.stub(TransferManager, '_endTransferWithReason');
      });

      test('_endTransferWithReason() should not be called', function() {
        TransferManager._onDefaultAdapterChanged(
          mockNewAdapter, mockOldAdapter);
        assert.isFalse(TransferManager._endTransferWithReason.called);
      });
    });
  });

  suite('_onBluetoothEnabledChanged > ', function() {
    var mockEnabledState;
    setup(function() {
      this.sinon.stub(TurnBluetoothOnDialog, 'close');
    });

    suite('Bluetooth "enabled" state changed to be true > ', function() {
      setup(function() {
        mockEnabledState = true;
        this.sinon.stub(TurnBluetoothOnDialog, 'showConfirm');
      });

      test('TurnBluetoothOnDialog should be closed ', function() {
        TransferManager._onBluetoothEnabledChanged(mockEnabledState);
        assert.isTrue(TurnBluetoothOnDialog.close.called);
        assert.isFalse(TurnBluetoothOnDialog.showConfirm.called);
      });
    });

    suite('Bluetooth "enabled" state changed to be false > ', function() {
      var mockUserAction, mockShowConfirmPromise;
      setup(function() {
        this.sinon.stub(BtContext, 'setEnabled');
        this.sinon.stub(TransferManager, '_endTransferWithReason');
      });

      suite('A user confirmed to turn Bluetooth on > ', function() {
        setup(function() {
          mockEnabledState = false;
          mockUserAction = 'confirm';
          mockShowConfirmPromise = Promise.resolve(mockUserAction);
          this.sinon.stub(TurnBluetoothOnDialog, 'showConfirm').returns(
            mockShowConfirmPromise);
        });

        test('TurnBluetoothOnDialog should be shown with confirm dialog, ' +
             'BtContext should be enabled with true ', function(done) {
          TransferManager._onBluetoothEnabledChanged(mockEnabledState);
          assert.isFalse(TurnBluetoothOnDialog.close.called);
          assert.isTrue(TurnBluetoothOnDialog.showConfirm.called);
          mockShowConfirmPromise.then((userAction) => {
            assert.equal(userAction, mockUserAction);
            assert.isTrue(BtContext.setEnabled.calledWith(true));
            assert.isFalse(TransferManager._endTransferWithReason.called);
          }, () => {
            // reject case
            assert.isTrue(false);
          }).then(done, done);
        });
      });

      suite('A user cancelled to turn Bluetooth on > ', function() {
        setup(function() {
          mockEnabledState = false;
          mockUserAction = 'cancel';
          mockShowConfirmPromise = Promise.resolve(mockUserAction);
          this.sinon.stub(TurnBluetoothOnDialog, 'showConfirm').returns(
            mockShowConfirmPromise);
        });

        test('TurnBluetoothOnDialog should be shown with confirm dialog, ' +
             '_endTransferWithReason should be called with reason "cancelled" ',
             function(done) {
          TransferManager._onBluetoothEnabledChanged(mockEnabledState);
          assert.isFalse(TurnBluetoothOnDialog.close.called);
          assert.isTrue(TurnBluetoothOnDialog.showConfirm.called);
          mockShowConfirmPromise.then((userAction) => {
            assert.equal(userAction, mockUserAction);
            assert.isFalse(BtContext.setEnabled.called);
            assert.isTrue(
              TransferManager._endTransferWithReason.calledWith('cancelled'));
          }, () => {
            // reject case
            assert.isTrue(false);
          }).then(done, done);
        });
      });
    });
  });

  suite('_watchEventFromDevicePicker > ', function() {
    setup(function() {
      this.sinon.stub(DevicePickerPanel, 'addEventListener');
    });

    test('Should add "devicePicked", "cancelSelection" events, ' +
         'and regited _onDevicePicked(), _onCancelSelection() handlers ' +
         'from DevicePickerPanel ', function() {
      TransferManager._watchEventFromDevicePicker();
      assert.equal(DevicePickerPanel.addEventListener.args[0][0],
        'devicePicked');
      assert.isDefined(DevicePickerPanel.addEventListener.args[0][1]);
      assert.equal(DevicePickerPanel.addEventListener.args[1][0],
        'cancelSelection');
      assert.isDefined(DevicePickerPanel.addEventListener.args[1][1]);
    });
  });

  suite('_onDevicePicked > ', function() {
    var mockActivityRequest, mockEvent, mockSchedule;
    setup(function() {
      mockSchedule = {};
      this.sinon.stub(TransferManager,
                      '_produceSendingFilesSchedule').returns(mockSchedule);
      this.sinon.stub(TransferManager, '_postMessageToSystemApp');
      this.sinon.stub(BtContext, 'sendFile');
      this.sinon.stub(TransferManager, '_endTransferWithReason');
      mockEvent = {
        detail: {
          address: 'AA:BB:CC:00:11:22'
        }
      };
    });

    suite('blob has name > ', function() {
      setup(function() {
        mockActivityRequest = {
          source: {
            name: 'share',
            data: {
              blobs: [{
                name: 'file_01'
              }, {
                name: 'file_02'
              }]
            }
          }
        };
        TransferManager._activity = mockActivityRequest;
      });

      test('_produceSendingFilesSchedule() should be called with length, ' +
           '_postMessageToSystemApp() should be called with schedule, ' +
           'BtContext.sendFile() should be called with: ' +
           'address of target device and blob in soure.data, ' +
           '_endTransferWithReason() should be called with transferred ',
           function(done) {
        TransferManager._onDevicePicked(mockEvent).then(() => {
          assert.isTrue(
            TransferManager._produceSendingFilesSchedule.calledWith(
              mockActivityRequest.source.data.blobs.length));
          assert.isTrue(
            TransferManager._postMessageToSystemApp.calledWith(mockSchedule));
          assert.equal(BtContext.sendFile.args[0][0], mockEvent.detail.address);
          assert.deepEqual(BtContext.sendFile.args[0][1],
                           mockActivityRequest.source.data.blobs[0]);
          assert.equal(BtContext.sendFile.args[1][0], mockEvent.detail.address);
          assert.deepEqual(BtContext.sendFile.args[1][1],
                           mockActivityRequest.source.data.blobs[1]);
          assert.isTrue(TransferManager._endTransferWithReason.calledWith(
            'transferred'));
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('blob has no name, has filepaths > ', function() {
      var mockGetPromise, mockGotFile;
      setup(function() {
        mockActivityRequest = {
          source: {
            name: 'share',
            data: {
              blobs: [{}, {}],
              filepaths: [
                '/sdcard/DCIM/100MZLLA/IMG_0001.jpg',
                '/sdcard/DCIM/100MZLLA/IMG_0002.jpg'
              ]
            }
          }
        };
        TransferManager._activity = mockActivityRequest;
        mockGotFile = {};
        mockGetPromise = Promise.resolve(mockGotFile);
        var MockGetDeviceStorage = function() {
          return {
            get: function() {return mockGetPromise;}
          };
        };
        realGetDeviceStorage = navigator.getDeviceStorage;
        navigator.getDeviceStorage = MockGetDeviceStorage;
      });

      teardown(function() {
        navigator.getDeviceStorage = realGetDeviceStorage;
      });

      test('_produceSendingFilesSchedule() should be called with length, ' +
           '_postMessageToSystemApp() should be called with schedule, ' +
           'BtContext.sendFile() should be called with: ' +
           'address of target device and file from device storage, ' +
           '_endTransferWithReason() should be called with transferred ',
           function(done) {
        TransferManager._onDevicePicked(mockEvent).then(() => {
          assert.isTrue(
            TransferManager._produceSendingFilesSchedule.calledWith(
              mockActivityRequest.source.data.blobs.length));
          assert.isTrue(
            TransferManager._postMessageToSystemApp.calledWith(mockSchedule));
          assert.equal(BtContext.sendFile.args[0][0], mockEvent.detail.address);
          assert.equal(BtContext.sendFile.args[0][1], mockGotFile);
          assert.equal(BtContext.sendFile.args[1][0], mockEvent.detail.address);
          assert.equal(BtContext.sendFile.args[1][1], mockGotFile);
          assert.isTrue(TransferManager._endTransferWithReason.calledWith(
            'transferred'));
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('blob has no name, has no filepaths > ', function() {
      setup(function() {
        mockActivityRequest = {
          source: {
            name: 'share',
            data: {
              blobs: [{}, {}]
            }
          }
        };
        TransferManager._activity = mockActivityRequest;
      });

      test('_produceSendingFilesSchedule() should be called with length, ' +
           '_postMessageToSystemApp() should be called with schedule, ' +
           'BtContext.sendFile() should be called with: ' +
           'address of target device and blob in soure.data, ' +
           '_endTransferWithReason() should be called with transferred ',
           function(done) {
        TransferManager._onDevicePicked(mockEvent).then(() => {
          assert.isTrue(
            TransferManager._produceSendingFilesSchedule.calledWith(
              mockActivityRequest.source.data.blobs.length));
          assert.isTrue(
            TransferManager._postMessageToSystemApp.calledWith(mockSchedule));
          assert.equal(BtContext.sendFile.args[0][0], mockEvent.detail.address);
          assert.deepEqual(BtContext.sendFile.args[0][1],
                           mockActivityRequest.source.data.blobs[0]);
          assert.equal(BtContext.sendFile.args[1][0], mockEvent.detail.address);
          assert.deepEqual(BtContext.sendFile.args[1][1],
                           mockActivityRequest.source.data.blobs[1]);
          assert.isTrue(TransferManager._endTransferWithReason.calledWith(
            'transferred'));
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });

  suite('_onCancelSelection > ', function() {
    setup(function() {
      this.sinon.stub(TransferManager, '_endTransferWithReason');
    });

    test('_endTransferWithReason() should be called with reason "cancelled"',
         function() {
      TransferManager._onCancelSelection();
      assert.isTrue(
        TransferManager._endTransferWithReason.calledWith('cancelled'));
    });
  });

  suite('_produceSendingFilesSchedule > ', function() {
    var mockSendingFilesSchedule, mockNumberOfTasks;
    setup(function() {
      mockNumberOfTasks = 3;
      mockSendingFilesSchedule = {
        numberOfFiles: mockNumberOfTasks,
        numSuccessful: 0,
        numUnsuccessful: 0
      };
    });

    test('_postMessageToSystemApp() should be called with object of ' +
         'sending files schedule ', function() {
      assert.deepEqual(
        TransferManager._produceSendingFilesSchedule(mockNumberOfTasks),
        mockSendingFilesSchedule);
    });
  });

  suite('_postMessageToSystemApp > ', function() {
    var mockMessage, mockResultOfMozAppGetSelf, mockConnectPromise, mockPorts;
    setup(function() {
      mockMessage = {};
      mockPorts = [
        {
          postMessage: function() {}
        }
      ];
      this.sinon.stub(mockPorts[0], 'postMessage');
      mockConnectPromise = Promise.resolve(mockPorts);
      mockResultOfMozAppGetSelf = {
        connect: function() {return mockConnectPromise;}
      };
      this.sinon.spy(mockResultOfMozAppGetSelf, 'connect');
    });

    test('Should post inputed message via port "bluetoothTransfercomms" ' +
         'if get app.connect, ports via mozApps successfully ', function(done) {
      TransferManager._postMessageToSystemApp(mockMessage);
      MockNavigatormozApps.mTriggerLastRequestSuccess(
        mockResultOfMozAppGetSelf);
      assert.isTrue(
        mockResultOfMozAppGetSelf.connect.calledWith('bluetoothTransfercomms'));
      mockConnectPromise.then(() => {
        assert.isTrue(
          mockPorts[0].postMessage.calledWith(mockMessage));
      }, () => {
        // reject case
        assert.isTrue(false);
      }).then(done, done);
    });
  });
});
