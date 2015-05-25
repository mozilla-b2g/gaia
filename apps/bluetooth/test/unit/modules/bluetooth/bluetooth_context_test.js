'use strict';

/* global MockNavigatorSettings */
requireApp('bluetooth/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('BluetoothContext', function() {
  var realSettings;
  var adapterManager;
  var btContext;
  var btDevice;
  var connectionManager;
  var observableArray;

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_adapter_manager',
      'modules/bluetooth/bluetooth_context',
      'modules/bluetooth/bluetooth_device',
      'modules/bluetooth/bluetooth_connection_manager',
      'modules/mvvm/observable_array'
    ];

    var map = {
      '*': {
        'modules/bluetooth/bluetooth_adapter_manager': 'MockAdapterManager',
        'modules/bluetooth/bluetooth_device': 'MockBluetoothDevice',
        'modules/bluetooth/bluetooth_connection_manager':
          'MockConnectionManager'
      }
    };

    this.MockAdapterManager = {
      defaultAdapter: {
        addEventListener: function() {},
        getPairedDevices: function() {return [];}
      },
      observe: function() {}
    };

    define('MockAdapterManager', function() {
      return this.MockAdapterManager;
    }.bind(this));

    this.MockBluetoothDevice = function ctor_mock_bluetooth_device(device) {
      var mockBluetoothDevice = {
        name: device.name,
        paired: device.paired
      };
      return mockBluetoothDevice;
    };

    define('MockBluetoothDevice', function() {
      return this.MockBluetoothDevice;
    }.bind(this));

    this.MockConnectionManager = {
      addEventListener: function() {},
      connectingAddress: null,
      getConnectedDevices: function() {}
    };

    define('MockConnectionManager', function() {
      return this.MockConnectionManager;
    }.bind(this));

    testRequire(modules, map, function(AdapterManager, BluetoothContext,
                                       BluetoothDevice, ConnectionManager,
                                       ObservableArray) {
      adapterManager = AdapterManager;
      btContext = BluetoothContext;
      btDevice = BluetoothDevice;
      connectionManager = ConnectionManager;
      observableArray = ObservableArray;

      MockNavigatorSettings.mSetup();
      done();
    });
  });

  suite('Init > ', function() {
    setup(function() {
      this.sinon.stub(adapterManager, 'observe');
      this.sinon.stub(btContext, '_onDefaultAdapterChanged');
      this.sinon.stub(btContext, '_updateDeviceConnectionInfo');
      this.sinon.stub(connectionManager, 'addEventListener');
    });

    test('AdapterManager "defaultAdapter" property should be observed, ' +
         'and access defaultAdapter from AdapterManager manually, ' +
         'and regedit event listener from ConnectionManager ', function() {
      btContext._init();
      assert.isTrue(adapterManager.observe.calledWith('defaultAdapter'));
      assert.isTrue(btContext._onDefaultAdapterChanged.calledWith(
        adapterManager.defaultAdapter));
      assert.equal(connectionManager.addEventListener.args[0][0], 'connecting');
      assert.isDefined(connectionManager.addEventListener.args[0][1]);
      assert.equal(connectionManager.addEventListener.args[1][0], 'connected');
      assert.isDefined(connectionManager.addEventListener.args[1][1]);
      assert.equal(
        connectionManager.addEventListener.args[2][0], 'disconnected');
      assert.isDefined(connectionManager.addEventListener.args[2][1]);
      assert.equal(
        connectionManager.addEventListener.args[3][0], 'profileChanged');
      assert.isDefined(connectionManager.addEventListener.args[3][1]);
    });
  });

  suite('_initProperties > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        state: true,
        address: 'AA:BB:CC:00:11:22',
        name: 'device-01',
        discoverable: true,
        discovering: true
      };

      this.sinon.stub(btContext, '_updateStatus');
    });

    test('Observable properties should be inited ', function() {
      btContext._initProperties(mockAdapter);
      assert.isTrue(btContext._updateStatus.calledWith(mockAdapter.state));
      assert.equal(btContext.address, mockAdapter.address);
      assert.equal(btContext.name, mockAdapter.name);
      assert.equal(btContext.discoverable, mockAdapter.discoverable);
      assert.equal(btContext.discovering, mockAdapter.discovering);
    });
  });

  suite('_resetProperties > ', function() {
    setup(function() {
      this.sinon.stub(btContext, '_updateStatus');
    });

    test('Observable properties should be reset and _updateStatus() ' +
         'should be called with "disabled" status ', function() {
      btContext._resetProperties();
      assert.isTrue(btContext._updateStatus.calledWith('disabled'));
      assert.equal(btContext.address, '');
      assert.equal(btContext.name, '');
      assert.isFalse(btContext.discoverable);
      assert.isFalse(btContext.discovering);
    });
  });

  suite('_watchDefaultAdapterOnattributechanged > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        addEventListener: function() {}
      };
      this.sinon.stub(mockAdapter, 'addEventListener');
      this.sinon.stub(btContext, '_onAdapterAttributeChanged');
    });

    test('attributechanged should be registered callback function', function() {
      btContext._watchDefaultAdapterOnattributechanged(mockAdapter);
      assert.equal(mockAdapter.addEventListener.args[0][0], 'attributechanged');
      mockAdapter.addEventListener.args[0][1]();
      assert.isTrue(btContext._onAdapterAttributeChanged.calledWith(
        mockAdapter));
    });
  });

  suite('_unwatchDefaultAdapterOnattributechanged > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        removeEventListener: function() {}
      };
      this.sinon.stub(mockAdapter, 'removeEventListener');
      this.sinon.stub(btContext, '_onAdapterAttributeChanged');
    });

    test('onattributechanged should be unregedit ', function() {
      btContext._unwatchDefaultAdapterOnattributechanged(mockAdapter);
      assert.equal(mockAdapter.removeEventListener.args[0][0],
        'attributechanged');
      assert.equal(mockAdapter.removeEventListener.args[0][1],
        btContext._onAdapterAttributeChanged);
    });
  });

  suite('_watchDefaultAdapterOndevicepaired > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {};
      this.sinon.stub(btContext, '_onAdapterDevicepaired');
    });

    test('ondevicepaired should be regedit callback function ', function() {
      btContext._watchDefaultAdapterOndevicepaired(mockAdapter);
      assert.isDefined(mockAdapter.ondevicepaired);
      mockAdapter.ondevicepaired();
      assert.isTrue(btContext._onAdapterDevicepaired.calledWith(mockAdapter));
    });
  });

  suite('_unwatchDefaultAdapterOndevicepaired > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        ondevicepaired: function() {}
      };
      this.sinon.stub(btContext, '_onAdapterDevicepaired');
    });

    test('ondevicepaired should be unregedit ', function() {
      btContext._unwatchDefaultAdapterOndevicepaired(mockAdapter);
      assert.isNull(mockAdapter.ondevicepaired);
    });
  });

  suite('_watchDefaultAdapterOndeviceunpaired > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {};
      this.sinon.stub(btContext, '_onAdapterDeviceunpaired');
    });

    test('ondeviceunpaired should be regedit callback function ', function() {
      btContext._watchDefaultAdapterOndeviceunpaired(mockAdapter);
      assert.isDefined(mockAdapter.ondeviceunpaired);
      mockAdapter.ondeviceunpaired();
      assert.isTrue(btContext._onAdapterDeviceunpaired.calledWith(mockAdapter));
    });
  });

  suite('_unwatchDefaultAdapterOndeviceunpaired > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        ondeviceunpaired: function() {}
      };
      this.sinon.stub(btContext, '_onAdapterDeviceunpaired');
    });

    test('onattributechanged should be unregedit ', function() {
      btContext._unwatchDefaultAdapterOndeviceunpaired(mockAdapter);
      assert.isNull(mockAdapter.ondeviceunpaired);
    });
  });

  suite('_onAdapterAttributeChanged > ', function() {
    var mockAdapter, evt;
    setup(function() {
      mockAdapter = {
        state: 'enabled',
        address: 'AA:BB:CC:00:11:22',
        name: 'device-01',
        discoverable: true,
        discovering: true
      };
    });

    suite('state changed in enabled ', function() {
      setup(function() {
        evt = {
          attrs: ['state']
        };
        this.sinon.stub(btContext, '_updateStatus');
        this.sinon.stub(btContext, '_refreshPairedDevicesInfo');
        this.sinon.stub(btContext, 'startDiscovery');
      });

      test('_updateStatus() should be called with new state ' +
           'and startDiscovery() should be called ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.isTrue(btContext._updateStatus.calledWith(mockAdapter.state));
        assert.isTrue(btContext._refreshPairedDevicesInfo.calledWith(
          mockAdapter));
        assert.isTrue(btContext.startDiscovery.called);
      });
    });

    suite('state changed in disabled ', function() {
      setup(function() {
        mockAdapter.state = 'disabled';
        evt = {
          attrs: ['state']
        };
        this.sinon.stub(btContext, '_updateStatus');
        this.sinon.stub(btContext, '_refreshPairedDevicesInfo');
        this.sinon.stub(btContext, 'startDiscovery');
      });

      test('_updateStatus() should be called with new state ' +
           'and startDiscovery() should be called ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.isTrue(btContext._updateStatus.calledWith(mockAdapter.state));
        assert.isFalse(btContext._refreshPairedDevicesInfo.called);
        assert.isFalse(btContext.startDiscovery.called);
      });
    });

    suite('address changed ', function() {
      setup(function() {
        evt = {
          attrs: ['address']
        };
      });

      test('address should be called with new address ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.equal(btContext.address, mockAdapter.address);
      });
    });

    suite('name changed ', function() {
      setup(function() {
        evt = {
          attrs: ['name']
        };
      });

      test('name should be called with new name ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.equal(btContext.name, mockAdapter.name);
      });
    });

    suite('discoverable changed ', function() {
      setup(function() {
        evt = {
          attrs: ['discoverable']
        };
      });

      test('discoverable should be called with new state ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.equal(btContext.discoverable, mockAdapter.discoverable);
      });
    });

    suite('discovering changed ', function() {
      setup(function() {
        evt = {
          attrs: ['discovering']
        };
      });

      test('discovering should be called with new state ', function() {
        btContext._onAdapterAttributeChanged(mockAdapter, evt);
        assert.equal(btContext.discovering, mockAdapter.discovering);
      });
    });
  });

  suite('_onAdapterDevicepaired > ', function() {
    var mockAdapter, mockEvent;
    setup(function() {
      mockAdapter = {};
      mockEvent = {
        device: {
          address: 'AA:BB:CC:00:11:01'
        }
      };
      this.sinon.stub(btContext, '_refreshPairedDevicesInfo');
    });

    test('_refreshPairedDevicesInfo() should be called with adapter ',
    function() {
      btContext._onAdapterDevicepaired(mockAdapter, mockEvent);
      assert.isTrue(btContext._refreshPairedDevicesInfo.calledWith(
        mockAdapter));
    });
  });

  suite('_onAdapterDeviceunpaired > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {};
      this.sinon.stub(btContext, '_refreshPairedDevicesInfo');
    });

    test('_refreshPairedDevicesInfo() should be called with adapter ',
    function() {
      btContext._onAdapterDeviceunpaired(mockAdapter);
      assert.isTrue(btContext._refreshPairedDevicesInfo.calledWith(
        mockAdapter));
    });
  });

  suite('_onDefaultAdapterChanged > ', function() {
    var newAdapter, oldAdapter;
    setup(function() {
      oldAdapter = {};
      btContext._defaultAdapter = null;
      this.sinon.stub(btContext, '_unwatchDefaultAdapterOnattributechanged');
      this.sinon.stub(btContext, '_unwatchDefaultAdapterOndeviceunpaired');
      this.sinon.stub(btContext, '_unwatchDefaultAdapterOndevicepaired');
      this.sinon.stub(btContext, '_initProperties');
      this.sinon.stub(btContext, '_watchDefaultAdapterOnattributechanged');
      this.sinon.stub(btContext, '_watchDefaultAdapterOndevicepaired');
      this.sinon.stub(btContext, '_watchDefaultAdapterOndeviceunpaired');
      this.sinon.stub(btContext, '_resetProperties');
      this.sinon.stub(btContext, '_refreshPairedDevicesInfo');
    });

    suite('changed with new/old adapter, ' +
          'in case of having new adapter > ', function() {
      suiteSetup(function() {
        newAdapter = {
          state: 'enabled'
        };
      });

      test('should unwatch events from old adapter, ' +
         'then watch events from new adapter ', function() {
        btContext._onDefaultAdapterChanged(newAdapter, oldAdapter);
        // test default adapter updated
        assert.equal(btContext._defaultAdapter, newAdapter);
        // test unwatch events
        assert.isTrue(
          btContext._unwatchDefaultAdapterOnattributechanged.calledWith(
            oldAdapter));
        assert.isTrue(
          btContext._unwatchDefaultAdapterOndeviceunpaired.calledWith(
            oldAdapter));
        assert.isTrue(
          btContext._unwatchDefaultAdapterOndevicepaired.calledWith(
            oldAdapter));
        // test init porperties
        assert.isTrue(btContext._initProperties.calledWith(newAdapter));
        // test watch events
        assert.isTrue(
          btContext._watchDefaultAdapterOnattributechanged.calledWith(
            newAdapter));
        assert.isTrue(
          btContext._watchDefaultAdapterOndevicepaired.calledWith(newAdapter));
        assert.isTrue(
          btContext._watchDefaultAdapterOndeviceunpaired.calledWith(
            newAdapter));
        // test init paired devices information
        assert.isTrue(btContext._refreshPairedDevicesInfo.calledWith(
          newAdapter));
        // test reset properties
        assert.isFalse(btContext._resetProperties.called);
      });
    });

    suite('changed with new/old adapter, ' +
          'in case of new adapter is null > ', function() {
      suiteSetup(function() {
        newAdapter = null;
      });

      test('should unwatch events from old adapter, ' +
         'then watch events from new adapter ', function() {
        btContext._onDefaultAdapterChanged(newAdapter, oldAdapter);
        // test default adapter updated
        assert.equal(btContext._defaultAdapter, newAdapter);
        // test unwatch events
        assert.isTrue(
          btContext._unwatchDefaultAdapterOnattributechanged.calledWith(
            oldAdapter));
        assert.isTrue(
          btContext._unwatchDefaultAdapterOndeviceunpaired.calledWith(
            oldAdapter));
        assert.isTrue(
          btContext._unwatchDefaultAdapterOndevicepaired.calledWith(
            oldAdapter));
        // test init porperties
        assert.isFalse(btContext._initProperties.called);
        // test watch events
        assert.isFalse(btContext._watchDefaultAdapterOnattributechanged.called);
        assert.isFalse(btContext._watchDefaultAdapterOndevicepaired.called);
        assert.isFalse(btContext._watchDefaultAdapterOndeviceunpaired.called);
        // test init paired devices information
        assert.isFalse(btContext._refreshPairedDevicesInfo.called);
        // test reset properties
        assert.isTrue(btContext._resetProperties.called);
      });
    });
  });

  suite('_refreshPairedDevicesInfo > ', function() {
    suite('no paired device > ', function() {
      var mockAdapter, mockPairedDvices;
      setup(function() {
        mockPairedDvices = [];
        this.sinon.stub(btContext._pairedDevices, 'reset');
        this.sinon.stub(btContext, '_initConnectingDevices');
        this.sinon.stub(btContext, '_initConnectedDevices');
        mockAdapter = {
          getPairedDevices: function() {return mockPairedDvices;}
        };
      });

      test('_pairedDevices should be reset, ' +
           '"firstPairedDeviceName" property should be empty, ' +
           '"hasPairedDevice" property should be false, ' +
           '"numberOfPairedDevices" property should be zero ', function() {
        btContext._refreshPairedDevicesInfo(mockAdapter);
        assert.isTrue(
          btContext._pairedDevices.reset.calledWith(mockPairedDvices));
        assert.equal(btContext.firstPairedDeviceName, '');
        assert.isFalse(btContext.hasPairedDevice);
        assert.isFalse(btContext._initConnectingDevices.called);
        assert.isFalse(btContext._initConnectedDevices.called);
        assert.equal(btContext.numberOfPairedDevices, mockPairedDvices.length);
      });
    });

    suite('has paired device > ', function() {
      var mockAdapter, mockPairedDvices;
      setup(function() {
        mockPairedDvices = [
          {address: 'AA:BB:CC:00:11:01',
           name: 'BB-device',
           paired: false},
          {address: 'AA:BB:CC:00:11:02',
           name: 'AA-device',
           paired: false}];
        this.sinon.stub(btContext._pairedDevices, 'reset');
        this.sinon.stub(btContext, '_initConnectingDevices');
        this.sinon.stub(btContext, '_initConnectedDevices');
        mockAdapter = {
          getPairedDevices: function() {return mockPairedDvices;}
        };
      });

      test('_pairedDevices should be reset, ' +
           '"firstPairedDeviceName" property should be "AA-device", ' +
           '"hasPairedDevice" property should be true, ' +
           '"numberOfPairedDevices" property should be two ', function() {
        btContext._refreshPairedDevicesInfo(mockAdapter);
        assert.isTrue(btContext._pairedDevices.reset.calledWith([]));
        assert.equal(btContext.firstPairedDeviceName, 'AA-device');
        assert.isTrue(btContext.hasPairedDevice);
        assert.isTrue(btContext._initConnectingDevices.called);
        assert.isTrue(btContext._initConnectedDevices.called);
        assert.equal(btContext.numberOfPairedDevices, mockPairedDvices.length);
      });
    });
  });

  suite('_updateStatus > ', function() {
    suite('enabled = false, state = "disabled", ' +
      '_updateStatus with "enabled" ', function() {
      setup(function() {
        btContext.enabled = false;
        btContext.state = 'disabled';
        this.sinon.stub(btContext, '_syncWithSettingsKey');
      });

      test('new state will be enabled = true, state = "enabled" ', function() {
        btContext._updateStatus('enabled');
        assert.equal(btContext.state, 'enabled');
        assert.isTrue(btContext.enabled);
        assert.isTrue(btContext._syncWithSettingsKey.calledWith(
          btContext.enabled));
      });
    });

    suite('enabled = false, state = "disabled", ' +
      '_updateStatus with "enabling" ', function() {
      setup(function() {
        btContext.enabled = false;
        btContext.state = 'disabled';
        this.sinon.stub(btContext, '_syncWithSettingsKey');
      });

      test('new state will be enabled = false, state = "enabling"', function() {
        btContext._updateStatus('enabling');
        assert.equal(btContext.state, 'enabling');
        assert.isFalse(btContext.enabled);
        assert.isTrue(btContext._syncWithSettingsKey.calledWith(
          btContext.enabled));
      });
    });

    suite('enabled = true, state = "enabled", ' +
      '_updateStatus with "disabled" ', function() {
      setup(function() {
        btContext.enabled = true;
        btContext.state = 'enabled';
        this.sinon.stub(btContext, '_syncWithSettingsKey');
      });

      test('new state will be enabled = false, state = "disabled"', function() {
        btContext._updateStatus('disabled');
        assert.equal(btContext.state, 'disabled');
        assert.isFalse(btContext.enabled);
        assert.isTrue(btContext._syncWithSettingsKey.calledWith(
          btContext.enabled));
      });
    });

    suite('enabled = true, state = "enabled", ' +
      '_updateStatus with "disabling" ', function() {
      setup(function() {
        btContext.enabled = true;
        btContext.state = 'enabled';
        this.sinon.stub(btContext, '_syncWithSettingsKey');
      });

      test('new state will be enabled = false, state = "disabled"', function() {
        btContext._updateStatus('disabling');
        assert.equal(btContext.state, 'disabling');
        assert.isTrue(btContext.enabled);
        assert.isTrue(btContext._syncWithSettingsKey.calledWith(
          btContext.enabled));
      });
    });
  });

  suite('_syncWithSettingsKey > ', function() {
    var reqStub, settingsSetSpy, mockEnabled;
    suite('set with different state ', function() {
      setup(function() {
        mockEnabled = true;
        reqStub = {
          onsuccess: null,
          result: {
            'bluetooth.enabled': !mockEnabled
          }
        };
        settingsSetSpy = this.sinon.spy();
        var newCreateLock = function() {
          return {
            get: function() {
              return reqStub;
            },
            set: settingsSetSpy
          };
        };
        this.sinon.stub(navigator.mozSettings, 'createLock', newCreateLock);
      });

      test('"bluetooth.enabled" settings key should be set with new state ',
      function() {
        btContext._syncWithSettingsKey(mockEnabled);
        reqStub.onsuccess();
        assert.isTrue(settingsSetSpy.calledWith(
          {'bluetooth.enabled': mockEnabled}));
      });
    });

    suite('set with same state ', function() {
      setup(function() {
        mockEnabled = true;
        reqStub = {
          onsuccess: null,
          result: {
            'bluetooth.enabled': mockEnabled
          }
        };
        settingsSetSpy = this.sinon.spy();
        var newCreateLock = function() {
          return {
            get: function() {
              return reqStub;
            },
            set: settingsSetSpy
          };
        };
        this.sinon.stub(navigator.mozSettings, 'createLock', newCreateLock);
      });

      test('"bluetooth.enabled" settings key should not be set ', function() {
        btContext._syncWithSettingsKey(mockEnabled);
        reqStub.onsuccess();
        assert.isFalse(settingsSetSpy.called);
      });
    });
  });

  suite('setEnabled > ', function() {
    suite('enabled = false, state = "disabled", setEnabled with true, ' +
          'in resolved case ', function() {
      var mockAdapter, mockAdapterEnablePromise, mockAdapterDisablePromise;
      setup(function() {
        btContext.enabled = false;
        btContext.state = 'disabled';
        mockAdapterEnablePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapterDisablePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          enable: function() {return mockAdapterEnablePromise;},
          disable: function() {return mockAdapterDisablePromise;}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'enable');
        this.sinon.spy(btContext._defaultAdapter, 'disable');
      });

      test('_defaultAdapter.enable() should be called, ' +
           '_defaultAdapter.disable() should not be called ', function(done) {
        btContext.setEnabled(true).then(function() {
          assert.isTrue(btContext._defaultAdapter.enable.called);
          assert.isFalse(btContext._defaultAdapter.disable.called);
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('enabled = true, state = "enabled", setEnabled with false, ' +
          'in resolved case ', function() {
      var mockAdapter, mockAdapterEnablePromise, mockAdapterDisablePromise;
      setup(function() {
        btContext.enabled = true;
        btContext.state = 'enabled';
        mockAdapterEnablePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapterDisablePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          enable: function() {return mockAdapterEnablePromise;},
          disable: function() {return mockAdapterDisablePromise;}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'enable');
        this.sinon.spy(btContext._defaultAdapter, 'disable');
      });

      test('_defaultAdapter.enable() should not be called ' +
           '_defaultAdapter.disable() should be called ', function(done) {
        btContext.setEnabled(false).then(function() {
          assert.isFalse(btContext._defaultAdapter.enable.called);
          assert.isTrue(btContext._defaultAdapter.disable.called);
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('enabled = true, state = "enabled", setEnabled with true, ' +
          'in reject case ', function() {
      var mockAdapter;
      setup(function() {
        btContext.enabled = true;
        btContext.state = 'enabled';
        mockAdapter = {
          enable: function() {},
          disable: function() {}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'enable');
        this.sinon.spy(btContext._defaultAdapter, 'disable');
      });

      test('_defaultAdapter.enable() should not be called ' +
           '_defaultAdapter.disable() should not be called ' +
           'will reject with reason "state transition!!" ', function(done) {
        btContext.setEnabled(true).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'state transition!!');
          assert.isFalse(btContext._defaultAdapter.enable.called);
          assert.isFalse(btContext._defaultAdapter.disable.called);
        }).then(done, done);
      });
    });

    suite('enabled = true, state = "enabled", default adapter = null, ' +
          'setEnabled with false, in reject case ', function() {
      setup(function() {
        btContext.enabled = true;
        btContext.state = 'enabled';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.setEnabled(false).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('setDiscoverable > ', function() {
    suite('discoverable = false, setDiscoverable with true ', function() {
      var mockAdapter, mockAdapterSetDiscoverablePromise;
      setup(function() {
        btContext.discoverable = false;
        btContext.state = 'enabled';
        mockAdapterSetDiscoverablePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          setDiscoverable: function() {
            return mockAdapterSetDiscoverablePromise;
          }
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'setDiscoverable');
      });

      test('_defaultAdapter.setDiscoverable() should be called with true ',
      function(done) {
        btContext.setDiscoverable(true).then(function() {
          assert.isTrue(
          btContext._defaultAdapter.setDiscoverable.calledWith(true));
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('discoverable = false, setDiscoverable with true ' +
          'while state is disabled, in reject case ', function() {
      var mockAdapter;
      setup(function() {
        btContext.discoverable = false;
        btContext.state = 'disabled';
        mockAdapter = {
          setDiscoverable: function() {}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'setDiscoverable');
      });

      test('will reject with reason ' +
           '"same state or Bluetooth is disabled!!" ', function(done) {
        btContext.setDiscoverable(true).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.isFalse(btContext._defaultAdapter.setDiscoverable.called);
          assert.equal(reason, 'same state or Bluetooth is disabled!!');
        }).then(done, done);
      });
    });

    suite('discoverable = false, setDiscoverable with true ' +
          'default adapter = null, in reject case ', function() {
      setup(function() {
        btContext.discoverable = false;
        btContext.state = 'enabled';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.setDiscoverable(true).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('setName > ', function() {
    suite('setName a different name ', function() {
      var mockAdapter, newName, mockAdapterSetNamePromise;
      setup(function() {
        btContext.name = 'device-01';
        newName = 'device-02';
        mockAdapterSetNamePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          setName: function() {return mockAdapterSetNamePromise;}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'setName');
      });

      test('_defaultAdapter.setName() should be called with a new name ',
      function(done) {
        btContext.setName(newName).then(function() {
          assert.isTrue(btContext._defaultAdapter.setName.calledWith(newName));
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('setName the same name, in reject case ', function() {
      var mockAdapter, oldName, sameName;
      setup(function() {
        sameName = oldName = btContext.name = 'device-01';
        mockAdapter = {
          setName: function() {}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'setName');
      });

      test('_defaultAdapter.setName() should not be called, ' +
           'will reject with reason "same name!!" ', function() {
        btContext.setName(sameName).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.isFalse(btContext._defaultAdapter.setName.called);
          assert.equal(reason, 'same name!!');
        });
      });
    });

    suite('setName a different name, default adapter = null, ' +
          'in reject case ', function() {
      var newName;
      setup(function() {
        btContext.name = 'device-01';
        newName = 'device-02';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.setName(newName).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('startDiscovery > ', function() {
    suite('discovering = false, trigger startDiscovery ', function() {
      var mockAdapter, mockHandle, mockAdapterStartDiscoveryPromise;
      setup(function() {
        btContext.discovering = false;
        btContext.state = 'enabled';
        mockHandle = {};
        mockAdapterStartDiscoveryPromise = new Promise(function(resolve) {
          resolve(mockHandle);
        });
        mockAdapter = {
          startDiscovery: function() {return mockAdapterStartDiscoveryPromise;}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'startDiscovery');
        this.sinon.stub(btContext, '_setDiscoveryHandler');
      });

      test('_defaultAdapter.startDiscovery() should be called, ' +
           '_setDiscoveryHandler() should be called with handle ',
           function(done) {
        btContext.startDiscovery().then(function() {
          assert.isTrue(btContext._defaultAdapter.startDiscovery.called);
          // test _defaultAdapter.startDiscovery resolved
          mockAdapterStartDiscoveryPromise.then(function(handle) {
            assert.isTrue(btContext._setDiscoveryHandler.calledWith(handle));
          });
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('discovering = true, trigger startDiscovery, ' +
          'in reject case ', function() {
      var mockAdapter;
      setup(function() {
        btContext.discovering = true;
        btContext.state = 'enabled';
        mockAdapter = {
          startDiscovery: function() {}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.stub(btContext._defaultAdapter, 'startDiscovery');
        this.sinon.stub(btContext, '_setDiscoveryHandler');
      });

      test('_defaultAdapter.startDiscovery() should not be called, ' +
           '_setDiscoveryHandler() should not be called, ' +
           'will reject with reason ' +
           '"same state or Bluetooth is disabled!!" ', function(done) {
        btContext.startDiscovery().then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'same state or Bluetooth is disabled!!');
          assert.isFalse(btContext._defaultAdapter.startDiscovery.called);
          assert.isFalse(btContext._setDiscoveryHandler.called);
        }).then(done, done);
      });
    });

    suite('discovering = false, trigger startDiscovery, ' +
      'default adapter = null, in reject case ', function() {
      setup(function() {
        btContext.discovering = false;
        btContext.state = 'enabled';
        btContext._defaultAdapter = null;
        this.sinon.stub(btContext, '_setDiscoveryHandler');
      });

      test('_defaultAdapter.startDiscovery() should not be called, ' +
           'will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.startDiscovery().then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
          assert.isFalse(btContext._setDiscoveryHandler.called);
        }).then(done, done);
      });
    });
  });

  suite('stopDiscovery > ', function() {
    suite('discovering = true, trigger stopDiscovery ', function() {
      var mockAdapter, mockAdapterStopDiscoveryPromise;
      setup(function() {
        btContext.discovering = true;
        btContext.state = 'enabled';
        mockAdapterStopDiscoveryPromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          stopDiscovery: function() {return mockAdapterStopDiscoveryPromise;}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'stopDiscovery');
      });

      test('_defaultAdapter.stopDiscovery() should be called ', function(done) {
        btContext.stopDiscovery().then(function() {
          assert.isTrue(btContext._defaultAdapter.stopDiscovery.called);
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('discovering = false, trigger stopDiscovery, ' +
          'in reject case ', function() {
      var mockAdapter;
      setup(function() {
        btContext.discovering = false;
        btContext.state = 'enabled';
        mockAdapter = {
          stopDiscovery: function() {}
        };
        btContext._defaultAdapter = mockAdapter;
        this.sinon.stub(btContext._defaultAdapter, 'stopDiscovery');
      });

      test('_defaultAdapter.stopDiscovery() should not be called, ' +
           'will reject with reason ' +
           '"same state" ', function(done) {
        btContext.stopDiscovery().then(function(reason) {
          // resolve case
          assert.equal(reason, 'same state');
          assert.isFalse(btContext._defaultAdapter.stopDiscovery.called);
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('discovering = true, state = disabled, ' +
          'trigger stopDiscovery, ' + 'in reject case ', function() {
      setup(function() {
        btContext.discovering = true;
        btContext.state = 'disabled';
      });

      test('will reject with reason ' +
           '"Bluetooth is disabled!!" ', function(done) {
        btContext.stopDiscovery().then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'Bluetooth is disabled!!');
        }).then(done, done);
      });
    });

    suite('discovering = true, default adapter = null, ' +
          'trigger stopDiscovery, ' + 'in reject case ', function() {
      setup(function() {
        btContext.discovering = true;
        btContext.state = 'enabled';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.stopDiscovery().then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('_setDiscoveryHandler > ', function() {
    var mockHandle;
    setup(function() {
      mockHandle = {
        ondevicefound: {}
      };
      this.sinon.stub(btContext, '_onDeviceFound');
    });

    teardown(function() {
      btContext._discoveryHandler = null;
    });

    test('_discoveryHandler should be regedit a callback _onDeviceFound() ',
    function() {
      btContext._setDiscoveryHandler(mockHandle);
      assert.isDefined(btContext._discoveryHandler);
      assert.isDefined(btContext._discoveryHandler.ondevicefound);
      btContext._discoveryHandler.ondevicefound();
      assert.isTrue(btContext._onDeviceFound.called);
    });
  });

  suite('_onDeviceFound > ', function() {
    var mockEvt;
    setup(function() {
      mockEvt = {
        device: {}
      };
      this.sinon.stub(btContext, '_saveDevice');
    });

    test('_saveDevice should be called with evt.device ', function() {
      btContext._onDeviceFound(mockEvt);
      assert.isTrue(btContext._saveDevice.calledWith(mockEvt.device));
    });
  });

  suite('_saveDevice > ', function() {
    suite('found out a new device ', function() {
      var mockFoundDevice, mockPairedDvices, mockRemoteDevices,
      mockLenghtOfRemoteDevices;
      setup(function() {
        mockFoundDevice = {
          address: 'AA:BB:CC:00:11:04',
          name: 'device-04',
          paired: false
        };
        mockPairedDvices = observableArray([
          {address: '00:11:22:AA:BB:03',
           name: 'device-03',
           paired: true}]);

        mockRemoteDevices = observableArray([
          {address: 'AA:BB:CC:00:11:01',
           name: 'device-01',
           paired: false},
          {address: 'AA:BB:CC:00:11:02',
           name: 'device-02',
           paired: false}]);

        mockLenghtOfRemoteDevices = mockRemoteDevices.length;
        this.sinon.stub(btContext,
          'getPairedDevices').returns(mockPairedDvices);
        this.sinon.stub(btContext,
          'getRemoteDevices').returns(mockRemoteDevices);
      });

      test('getPairedDevices() should not be called ' +
           'getRemoteDevices() should be called ' +
           'and increased one device item ', function() {
        btContext._saveDevice(mockFoundDevice);
        assert.isFalse(btContext.getPairedDevices.called);
        assert.isTrue(btContext.getRemoteDevices.called);
        assert.equal(btContext.getRemoteDevices().length,
          mockLenghtOfRemoteDevices + 1);
      });
    });

    suite('found out an existed device ', function() {
      var mockFoundDevice, mockPairedDvices, mockRemoteDevices,
      mockLenghtOfRemoteDevices;
      setup(function() {
        mockFoundDevice = {
          address: 'AA:BB:CC:00:11:01',
          name: 'device-01',
          paired: false
        };
        mockPairedDvices = observableArray([
          {address: '00:11:22:AA:BB:03',
           name: 'device-03',
           paired: true}]);

        mockRemoteDevices = observableArray([
          {address: 'AA:BB:CC:00:11:01',
           name: 'device-01',
           paired: false},
          {address: 'AA:BB:CC:00:11:02',
           name: 'device-02',
           paired: false}]);

        mockLenghtOfRemoteDevices = mockRemoteDevices.length;
        this.sinon.stub(btContext,
          'getPairedDevices').returns(mockPairedDvices);
        this.sinon.stub(btContext,
          'getRemoteDevices').returns(mockRemoteDevices);
      });

      test('getPairedDevices() should not be called ' +
           'getRemoteDevices() should be called ' +
           'and no device item created ', function() {
        btContext._saveDevice(mockFoundDevice);
        assert.isFalse(btContext.getPairedDevices.called);
        assert.isTrue(btContext.getRemoteDevices.called);
        assert.equal(btContext.getRemoteDevices().length,
          mockLenghtOfRemoteDevices);
      });
    });
  });

  suite('_findDeviceByAddress > ', function() {
    var mockPairedDvices, mockRemoteDevices;
    setup(function() {
      mockPairedDvices = observableArray([
        {address: '00:11:22:AA:BB:03',
         name: 'device-03',
         paired: true},
        {address: '00:21:22:AA:BB:03',
         name: 'device-04',
         paired: true}]);

      mockRemoteDevices = observableArray([
        {address: 'AA:BB:CC:00:11:01',
         name: 'device-01',
         paired: false},
        {address: 'AA:BB:CC:00:11:02',
         name: 'device-02',
         paired: false}]);
    });
    suite('found out an existed device ', function() {
      var inputOptions;
      setup(function() {
        inputOptions = {
          address: '00:11:22:AA:BB:03',
          paired: true
        };
        this.sinon.stub(btContext,
          'getPairedDevices').returns(mockPairedDvices);
        this.sinon.stub(btContext,
          'getRemoteDevices').returns(mockRemoteDevices);
      });

      test('getPairedDevices() should be called ' +
           'getRemoteDevices() should not be called ' +
           'and return expected device item ', function() {
        var foundOutDevice = btContext._findDeviceByAddress(inputOptions);
        assert.isTrue(btContext.getPairedDevices.called);
        assert.isFalse(btContext.getRemoteDevices.called);
        assert.equal(foundOutDevice, mockPairedDvices.get(0));
      });
    });

    suite('did not find out match device ', function() {
      var inputOptions;
      setup(function() {
        inputOptions = {
          address: '00:11:22:AA:BB:04',
          paired: false
        };
        this.sinon.stub(btContext,
          'getPairedDevices').returns(mockPairedDvices);
        this.sinon.stub(btContext,
          'getRemoteDevices').returns(mockRemoteDevices);
      });

      test('getPairedDevices() should not be called ' +
           'getRemoteDevices() should be called ' +
           'and return expected device item ', function() {
        var foundOutDevice = btContext._findDeviceByAddress(inputOptions);
        assert.isFalse(btContext.getPairedDevices.called);
        assert.isTrue(btContext.getRemoteDevices.called);
        assert.isNull(foundOutDevice);
      });
    });
  });

  suite('_matchDeviceByAddress > ', function() {
    var address, mockDevice;
    suite('address matched ', function() {
      setup(function() {
        address = 'AA:BB:CC:00:11:22';
        mockDevice = {address: 'AA:BB:CC:00:11:22'};
      });

      test('should return ture ', function() {
        assert.isTrue(btContext._matchDeviceByAddress(address, mockDevice));
      });
    });

    suite('address does not match ', function() {
      setup(function() {
        address = 'AA:BB:CC:00:11:22';
        mockDevice = {address: '00:11:22:AA:BB:CC'};
      });

      test('should return false ', function() {
        assert.isFalse(btContext._matchDeviceByAddress(address, mockDevice));
      });
    });
  });

  suite('pair > ', function() {
    suite('has default adapter, trigger pair ', function() {
      var mockAdapter, address, mockAdapterPairPromise,
      mockStopDiscoveryPromise;
      setup(function() {
        mockStopDiscoveryPromise = new Promise(function(resolve) {
          resolve();
        });
        this.sinon.stub(btContext, 'stopDiscovery').returns(
          mockStopDiscoveryPromise);
        mockAdapterPairPromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          pair: function() {return mockAdapterPairPromise;}
        };
        address = 'AA:BB:CC:00:11:22';
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'pair');
      });

      test('_defaultAdapter.pair() should be called with address ',
      function(done) {
        btContext.pair(address).then(function() {
          assert.isTrue(btContext.stopDiscovery.called);
          mockStopDiscoveryPromise.then(function() {
            assert.isTrue(btContext._defaultAdapter.pair.calledWith(address));
          }, function() {
            // reject case
          });
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('has default adapter, trigger pair, ' +
      'stopDiscovery in reject case ', function() {
      var mockAdapter, address, mockStopDiscoveryPromise, mockReason;
      setup(function() {
        mockReason = 'stopDiscovery in reject';
        mockStopDiscoveryPromise = Promise.reject(mockReason);
        this.sinon.stub(btContext, 'stopDiscovery').returns(
          mockStopDiscoveryPromise);
        mockAdapter = {
          pair: function() {}
        };
        address = 'AA:BB:CC:00:11:22';
        btContext._defaultAdapter = mockAdapter;
        this.sinon.stub(btContext._defaultAdapter, 'pair');
      });

      test('_defaultAdapter.pair() should not be called ',
      function(done) {
        btContext.pair(address).then(function() {
        }, function(reason) {
          assert.isTrue(btContext.stopDiscovery.called);
          assert.isFalse(btContext._defaultAdapter.pair.called);
          assert.equal(reason, mockReason);
        }).then(done, done);
      });
    });

    suite('default adapter = null, trigger pair, in reject case ', function() {
      var address;
      setup(function() {
        address = 'AA:BB:CC:00:11:22';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.pair(address).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('unpair > ', function() {
    suite('has default adapter, trigger unpair ', function() {
      var mockAdapter, address, mockAdapterUnpairPromise;
      setup(function() {
        mockAdapterUnpairPromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          unpair: function() {return mockAdapterUnpairPromise;}
        };
        address = 'AA:BB:CC:00:11:22';
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'unpair');
      });

      test('_defaultAdapter.unpair() should be called with addrss',
      function(done) {
        btContext.unpair(address).then(function() {
          assert.isTrue(btContext._defaultAdapter.unpair.calledWith(address));
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('default adapter = null, trigger unpair, in reject case ',
    function() {
      var address;
      setup(function() {
        address = 'AA:BB:CC:00:11:22';
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.unpair(address).then(function() {
          // resolve case
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('sendFile > ', function() {
    suite('has default adapter, trigger unpair ', function() {
      var mockAdapter, address, blob, mockAdapterSendFilePromise;
      setup(function() {
        mockAdapterSendFilePromise = new Promise(function(resolve) {
          resolve();
        });
        mockAdapter = {
          sendFile: function() {return mockAdapterSendFilePromise;}
        };
        address = 'AA:BB:CC:00:11:22';
        blob = {};
        btContext._defaultAdapter = mockAdapter;
        this.sinon.spy(btContext._defaultAdapter, 'sendFile');
      });

      test('_defaultAdapter.sendFile() should be called with addrss, blob, ',
      function(done) {
        btContext.sendFile(address, blob).then(function() {
          assert.equal(btContext._defaultAdapter.sendFile.args[0][0], address);
          assert.equal(btContext._defaultAdapter.sendFile.args[0][1], blob);
        }, function() {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('default adapter = null, trigger sendFile, in reject case ',
    function() {
      var address, blob;
      setup(function() {
        address = 'AA:BB:CC:00:11:22';
        blob = {};
        btContext._defaultAdapter = null;
      });

      test('will reject with reason ' +
           '"default adapter is not existed!!" ', function(done) {
        btContext.sendFile(address, blob).then(function() {
          // resolve case
          assert.isTrue(false);
        }, function(reason) {
          // reject case
          assert.equal(reason, 'default adapter is not existed!!');
        }).then(done, done);
      });
    });
  });

  suite('_initConnectingDevices > ', function() {
    suite('there is no connecting device ', function() {
      setup(function() {
        connectionManager.connectingAddress = null;
        this.sinon.stub(btContext, '_findDeviceByAddress');
      });

      test('_findDeviceByAddress() should not be called ', function() {
        btContext._initConnectingDevices();
        assert.isFalse(btContext._findDeviceByAddress.called);
      });
    });

    suite('Has connecting device ', function() {
      var findConnectingDeviceOptions, updateOptions, mockExistedDevice;
      setup(function() {
        connectionManager.connectingAddress = 'AA:BB:CC:00:11:22';
        findConnectingDeviceOptions = {
          paired: true,
          address: connectionManager.connectingAddress
        };
        updateOptions = {
          connectionStatus: 'connecting'
        };
        mockExistedDevice = {
          updateConnectionInfo: function() {}
        };
        this.sinon.stub(mockExistedDevice, 'updateConnectionInfo');
        this.sinon.stub(btContext, '_findDeviceByAddress').returns(
          mockExistedDevice);
      });

      test('_findDeviceByAddress() should be called, ' +
           'updateConnectionInfo() should be called with options', function() {
        btContext._initConnectingDevices();
        assert.isTrue(btContext._findDeviceByAddress.calledWith(
          findConnectingDeviceOptions));
        assert.isTrue(mockExistedDevice.updateConnectionInfo.calledWith(
          updateOptions));
      });
    });
  });

  suite('_initConnectedDevices > ', function() {
    suite('there is no connected device ', function() {
      var mockGetConnectedDevicesPromise, mockConnectedDevices;
      setup(function() {
        mockConnectedDevices = {};
        mockGetConnectedDevicesPromise = Promise.resolve(mockConnectedDevices);
        this.sinon.stub(connectionManager, 'getConnectedDevices').returns(
          mockGetConnectedDevicesPromise);
        this.sinon.stub(btContext, '_findDeviceByAddress');
      });

      test('_findDeviceByAddress() should not be called ', function(done) {
        btContext._initConnectedDevices();
        mockGetConnectedDevicesPromise.then(() => {
          assert.isFalse(btContext._findDeviceByAddress.called);
        }, () => {
          // reject case
        }).then(done, done);
      });
    });

    suite('has connected device ', function() {
      var mockGetConnectedDevicesPromise, mockConnectedDevices,
      findConnectingDeviceOptions, updateOptions, mockExistedDevice;
      setup(function() {
        mockConnectedDevices = {
          'AA:BB:CC:00:11:22': {
            connectedProfiles: {}
          }
        };
        mockGetConnectedDevicesPromise = Promise.resolve(mockConnectedDevices);
        this.sinon.stub(connectionManager, 'getConnectedDevices').returns(
          mockGetConnectedDevicesPromise);

        findConnectingDeviceOptions = {
          paired: true,
          address: 'AA:BB:CC:00:11:22'
        };
        updateOptions = {
          connectionStatus: 'connected',
          profiles: mockConnectedDevices['AA:BB:CC:00:11:22'].connectedProfiles
        };
        mockExistedDevice = {
          updateConnectionInfo: function() {}
        };
        this.sinon.stub(mockExistedDevice, 'updateConnectionInfo');
        this.sinon.stub(btContext, '_findDeviceByAddress').returns(
          mockExistedDevice);
      });

      test('_findDeviceByAddress() should be called, ' +
           'updateConnectionInfo() should be called with options',
           function(done) {
        btContext._initConnectedDevices();
        mockGetConnectedDevicesPromise.then(() => {
          assert.isTrue(btContext._findDeviceByAddress.calledWith(
            findConnectingDeviceOptions));
          assert.isTrue(mockExistedDevice.updateConnectionInfo.calledWith(
            updateOptions));
        }, () => {
          // reject case
        }).then(done, done);
      });
    });
  });

  suite('_updateDeviceConnectionInfo > ', function() {
    suite('"disconnected" event is coming from connectionManager ', function() {
      var mockEvent, findConnectingDeviceOptions, updateOptions,
      mockExistedDevice;
      setup(function() {
        mockEvent = {
          type: 'disconnected',
          detail: {
            address: 'AA:BB:CC:00:11:22'
          }
        };
        findConnectingDeviceOptions = {
          paired: true,
          address: mockEvent.detail.address
        };
        updateOptions = {
          connectionStatus: mockEvent.type
        };
        mockExistedDevice = {
          updateConnectionInfo: function() {}
        };
        this.sinon.stub(mockExistedDevice, 'updateConnectionInfo');
        this.sinon.stub(btContext, '_findDeviceByAddress').returns(
          mockExistedDevice);
      });

      test('_findDeviceByAddress() should be called with options, ' +
           'updateConnectionInfo() should be called with options', function() {
        btContext._updateDeviceConnectionInfo(mockEvent);
        assert.isTrue(btContext._findDeviceByAddress.calledWith(
          findConnectingDeviceOptions));
        assert.isTrue(mockExistedDevice.updateConnectionInfo.calledWith(
          updateOptions));
      });
    });

    suite('"profileChanged" event is coming from connectionManager ',
    function() {
      var mockEvent, findConnectingDeviceOptions, updateOptions,
      mockExistedDevice;
      setup(function() {
        mockEvent = {
          type: 'profileChanged',
          detail: {
            address: 'AA:BB:CC:00:11:22',
            profiles: {}
          }
        };
        findConnectingDeviceOptions = {
          paired: true,
          address: mockEvent.detail.address
        };
        updateOptions = {
          profiles: mockEvent.detail.profiles
        };
        mockExistedDevice = {
          updateConnectionInfo: function() {}
        };
        this.sinon.stub(mockExistedDevice, 'updateConnectionInfo');
        this.sinon.stub(btContext, '_findDeviceByAddress').returns(
          mockExistedDevice);
      });

      test('_findDeviceByAddress() should be called with options, ' +
           'updateConnectionInfo() should be called with options', function() {
        btContext._updateDeviceConnectionInfo(mockEvent);
        assert.isTrue(btContext._findDeviceByAddress.calledWith(
          findConnectingDeviceOptions));
        assert.isTrue(mockExistedDevice.updateConnectionInfo.calledWith(
          updateOptions));
      });
    });
  });
});
