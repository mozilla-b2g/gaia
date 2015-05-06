'use strict';

suite('BluetoothContext', function() {
  var adapterManager;
  var asyncStorage;
  var connectionManager;

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_adapter_manager',
      'shared/async_storage',
      'modules/bluetooth/bluetooth_connection_manager'
    ];

    var map = {
      '*': {
        'modules/bluetooth/bluetooth_adapter_manager': 'MockAdapterManager',
        'shared/async_storage': 'MockAsyncStorage'
      }
    };

    this.MockAdapterManager = {
      defaultAdapter: {
        state: 'enabled',
        addEventListener: function() {},
        removeEventListener: function() {},
        getPairedDevices: function() {return [];},
        stopDiscovery: function() {},
        connect: function() {},
        disconnect: function() {},
        getConnectedDevices: function() {}
      },
      observe: function() {}
    };

    define('MockAdapterManager', function() {
      return this.MockAdapterManager;
    }.bind(this));

    this.MockAsyncStorage = {
      getItem: function() {},
      setItem: function() {},
      removeItem: function() {}
    };

    define('MockAsyncStorage', function() {
      return this.MockAsyncStorage;
    }.bind(this));

    testRequire(modules, map, function(AdapterManager, AsyncStorage, 
                                       ConnectionManager) {
      adapterManager = AdapterManager;
      asyncStorage = AsyncStorage;
      connectionManager = ConnectionManager;
      done();
    });
  });

  suite('Init > ', function() {
    setup(function() {
      this.sinon.stub(adapterManager, 'observe');
      this.sinon.stub(connectionManager, '_onDefaultAdapterChanged');
    });

    test('AdapterManager "defaultAdapter" property should be observed, ' +
         'and access defaultAdapter from AdapterManager manually ', function() {
      connectionManager._init();
      assert.isTrue(adapterManager.observe.calledWith('defaultAdapter'));
      assert.isTrue(connectionManager._onDefaultAdapterChanged.calledWith(
        adapterManager.defaultAdapter));
    });
  });

  suite('_onDefaultAdapterChanged > ', function() {
    var newAdapter, oldAdapter;
    setup(function() {
      oldAdapter = {};
      connectionManager._defaultAdapter = null;
      this.sinon.stub(connectionManager, '_unwatchProfilesStatuschanged');
      this.sinon.stub(connectionManager,
        '_unwatchDefaultAdapterOnattributechanged');
      this.sinon.stub(connectionManager, '_watchProfilesStatuschanged');
      this.sinon.stub(connectionManager,
        '_watchDefaultAdapterOnattributechanged');
      this.sinon.stub(connectionManager, '_restoreConnection');
      this.sinon.stub(connectionManager, '_resetConnectionInfo');
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
        connectionManager._onDefaultAdapterChanged(newAdapter, oldAdapter);
        // test default adapter updated
        assert.equal(connectionManager._defaultAdapter, newAdapter);
        // test unwatch events
        assert.isTrue(
          connectionManager._unwatchProfilesStatuschanged.calledWith(
            oldAdapter));
        assert.isTrue(
          connectionManager._unwatchDefaultAdapterOnattributechanged.calledWith(
            oldAdapter));
        // test watch events
        assert.isTrue(
          connectionManager._watchProfilesStatuschanged.calledWith(newAdapter));
        assert.isTrue(
          connectionManager._watchDefaultAdapterOnattributechanged.calledWith(
            newAdapter));
        // test restore connection
        assert.isTrue(connectionManager._restoreConnection.called);
        // test reset properties
        assert.isFalse(connectionManager._resetConnectionInfo.called);
      });
    });

    suite('changed with new/old adapter, ' +
          'in case of new adapter is null > ', function() {
      suiteSetup(function() {
        newAdapter = null;
      });

      test('should unwatch events from old adapter, ' +
         'then watch events from new adapter ', function() {
        connectionManager._onDefaultAdapterChanged(newAdapter, oldAdapter);
        // test default adapter updated
        assert.isNull(connectionManager._defaultAdapter);
        // test unwatch events
        assert.isTrue(
          connectionManager._unwatchProfilesStatuschanged.calledWith(
            oldAdapter));
        assert.isTrue(
          connectionManager._unwatchDefaultAdapterOnattributechanged.calledWith(
            oldAdapter));
        // test watch events
        assert.isFalse(
          connectionManager._watchProfilesStatuschanged.calledWith(newAdapter));
        assert.isFalse(
          connectionManager._watchDefaultAdapterOnattributechanged.calledWith(
            newAdapter));
        // test restore connection
        assert.isFalse(connectionManager._restoreConnection.called);
        // test reset properties
        assert.isTrue(connectionManager._resetConnectionInfo.called);
      });
    });
  });

  suite('_initConnectedDevicesInfo > ', function() {
    suite('has default adapter, init connected devices info ', function() {
      var mockAdapter, mockGetConnectedDevicesFromPlatformPromise,
      mockConnectedDevicesByProfile;
      setup(function() {
        mockAdapter = {};
        connectionManager._defaultAdapter = mockAdapter;

        mockConnectedDevicesByProfile = {};
        mockGetConnectedDevicesFromPlatformPromise =
          Promise.resolve(mockConnectedDevicesByProfile);
        this.sinon.stub(connectionManager,
          '_getConnectedDevicesFromPlatform').returns(
            mockGetConnectedDevicesFromPlatformPromise);
        this.sinon.stub(connectionManager, '_constructDeviceItemsMap');
      });

      test('_constructDeviceItemsMap() should be called while ' +
           '_getConnectedDevicesFromPlatform is resolved ',
      function(done) {
        connectionManager._initConnectedDevicesInfo().then(function() {
          assert.isTrue(
            connectionManager._getConnectedDevicesFromPlatform.called);
          mockGetConnectedDevicesFromPlatformPromise.then(() => {
            assert.isTrue(
              connectionManager._constructDeviceItemsMap.calledWith(
                mockConnectedDevicesByProfile));
          }, () => {
            //reject case
          });
        }, function() {
          // reject case
        }).then(done, done);
      });
    });

    suite('has no default adapter, init connected devices info ', function() {
      setup(function() {
        connectionManager._defaultAdapter = null;
        this.sinon.stub(connectionManager, '_getConnectedDevicesFromPlatform');
        this.sinon.stub(connectionManager, '_constructDeviceItemsMap');
      });

      test('_getConnectedDevicesFromPlatform() should not be called, ' +
           '_constructDeviceItemsMap() should not be called',
      function(done) {
        connectionManager._initConnectedDevicesInfo().then(function() {
          // resolve case
        }, function() {
          assert.isFalse(
            connectionManager._getConnectedDevicesFromPlatform.called);
          assert.isFalse(
              connectionManager._constructDeviceItemsMap.called);
        }).then(done, done);
      });
    });
  });

  suite('_constructDeviceItemsMap > ', function() {
    var mockConnectedDevices, expectedConectionDeviceInfo;
    setup(function() {
      mockConnectedDevices = {
        'hfp': [{address: 'AA:BB:CC:00:11:22'}],
        'a2dp': [{address: 'AA:BB:CC:00:11:22'}]
      };

      expectedConectionDeviceInfo = {
        address: mockConnectedDevices.hfp[0].address,
        connected: true,
        profileID: 'hfp',
        device: mockConnectedDevices.hfp[0]
      };
      this.sinon.stub(connectionManager, '_initConnectedDevicesCache');
    });

    test('_initConnectedDevicesCache should be called ', function() {
      connectionManager._constructDeviceItemsMap(mockConnectedDevices);
      assert.isTrue(connectionManager._initConnectedDevicesCache.called);
      assert.deepEqual(connectionManager._initConnectedDevicesCache.args[0][0],
        expectedConectionDeviceInfo);
    });
  });

  suite('_initConnectedDevicesCache > ', function() {
    var mockConnectedDevicesInfo, options;
    suite('the updating device has info > ', function() {
      setup(function() {
        mockConnectedDevicesInfo = {
          'AA:BB:CC:00:11:22': {
            'device': {},
            'connectedProfiles': {
              'hfp': false,
              'a2dp': true
            }
          }
        };

        options = {
          address: 'AA:BB:CC:00:11:22',
          connected: true,
          profileID: 'hfp',
          device: {}
        };
        connectionManager._connectedDevicesInfo = mockConnectedDevicesInfo;
        this.sinon.stub(connectionManager,
          '_hasConnectedProfileByAddress').returns(true);
      });

      test('the specific profile of connected device info should be ' +
           'updated, Ex: "hfp": true ', function() {
        var newCache = connectionManager._initConnectedDevicesCache(options);
        assert.isTrue(newCache[options.address].connectedProfiles.hfp);
      });
    });

    suite('the updating device has no info > ', function() {
      setup(function() {
        mockConnectedDevicesInfo = {};

        options = {
          address: 'AA:BB:CC:00:11:22',
          connected: true,
          profileID: 'hfp',
          device: {}
        };
        connectionManager._connectedDevicesInfo = mockConnectedDevicesInfo;
        this.sinon.stub(connectionManager,
          '_hasConnectedProfileByAddress').returns(true);
      });

      test('the specific profile of connected device info should be ' +
           'updated, Ex: "hfp": true, "device": options.device ', function() {
        var newCache = connectionManager._initConnectedDevicesCache(options);
        assert.isTrue(newCache[options.address].connectedProfiles.hfp);
        assert.equal(newCache[options.address].device, options.device);
      });
    });

    suite('the updating device has no connected profile > ', function() {
      setup(function() {
        mockConnectedDevicesInfo = {
          'AA:BB:CC:00:11:22': {
            'device': {},
            'connectedProfiles': {
              'hfp': true,
              'a2dp': false
            }
          }
        };

        options = {
          address: 'AA:BB:CC:00:11:22',
          connected: false,
          profileID: 'hfp',
          device: {}
        };
        connectionManager._connectedDevicesInfo = mockConnectedDevicesInfo;
        this.sinon.stub(connectionManager,
          '_hasConnectedProfileByAddress').returns(false);
      });

      test('the device info should be removed from cache ', function() {
        var newCache = connectionManager._initConnectedDevicesCache(options);
        assert.isUndefined(newCache[options.address]);
      });
    });
  });

  suite('getConnectedDevices > ', function() {
    suite('already requested getConnectedDevices() with promise > ',
          function() {
      var mockPromise;
      setup(function() {
        mockPromise = new Promise(function() {});
        connectionManager._getConnectedDevicesPromise = mockPromise;
      });

      test('should return the requested promise..', function() {
        assert.equal(connectionManager.getConnectedDevices(), mockPromise);
      });
    });

    suite('have not requested getConnectedDevices() with promise > ',
          function() {
      var mockConnectedDevicesInfoPromise, mockConnectedDevicesInfo;
      setup(function() {
        connectionManager._getConnectedDevicesPromise = null;
        mockConnectedDevicesInfo = {'AA:BB:CC:00:11:22': {}};
        connectionManager._connectedDevicesInfo = mockConnectedDevicesInfo;
        mockConnectedDevicesInfoPromise = Promise.resolve();
        this.sinon.stub(connectionManager,
          '_initConnectedDevicesInfo').returns(mockConnectedDevicesInfoPromise);
      });

      test('should return connected device cached while promise resolve ',
           function(done) {
        connectionManager.getConnectedDevices().then((connectedDevicesInfo) => {
          assert.equal(connectedDevicesInfo, mockConnectedDevicesInfo);
        }, () => {
          // reject case
        }).then(done, done);
      });
    });

    suite('have not requested getConnectedDevices() with promise > ',
          function() {
      var mockConnectedDevicesInfoPromise;
      setup(function() {
        connectionManager._getConnectedDevicesPromise = null;
        mockConnectedDevicesInfoPromise = Promise.reject();
        this.sinon.stub(connectionManager,
          '_initConnectedDevicesInfo').returns(mockConnectedDevicesInfoPromise);
      });

      test('should clean up instance of cache while promise reject ',
           function(done) {
        connectionManager.getConnectedDevices().then(() => {
          assert.isNull(connectionManager._getConnectedDevicesPromise);
        }, () => {
          // reject case
        }).then(done, done);
      });
    });
  });

  suite('_resetConnectionInfo > ', function() {
    setup(function() {
      connectionManager.connectingAddress = 'AA:BB:CC:00:11:22';
      connectionManager._getConnectedDevicesPromise = Promise.resolve();
    });

    test('connecting address, instance of cache should be reset ', function() {
      connectionManager._resetConnectionInfo();
      assert.isNull(connectionManager.connectingAddress);
      assert.isNull(connectionManager._getConnectedDevicesPromise);
    });
  });

  suite('_watchDefaultAdapterOnattributechanged > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        addEventListener: function() {}
      };
      this.sinon.stub(mockAdapter, 'addEventListener');
      this.sinon.stub(connectionManager, '_onAdapterAttributeChanged');
    });

    test('attributechanged should be registered callback function', function() {
      connectionManager._watchDefaultAdapterOnattributechanged(mockAdapter);
      assert.equal(mockAdapter.addEventListener.args[0][0], 'attributechanged');
      mockAdapter.addEventListener.args[0][1]();
      assert.isTrue(connectionManager._onAdapterAttributeChanged.calledWith(
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
      this.sinon.stub(connectionManager, '_onAdapterAttributeChanged');
    });

    test('onattributechanged should be unregistered ', function() {
      connectionManager._unwatchDefaultAdapterOnattributechanged(mockAdapter);
      assert.equal(mockAdapter.removeEventListener.args[0][0], 
        'attributechanged');
      assert.equal(mockAdapter.removeEventListener.args[0][1], 
        connectionManager._onAdapterAttributeChanged);
    });
  });

  suite('_onAdapterAttributeChanged > ', function() {
    var mockAdapter, evt;
    setup(function() {
      mockAdapter = {
        state: 'enabled'
      };
    });

    suite('state changed in enabled ', function() {
      setup(function() {
        evt = {
          attrs: ['state']
        };
        this.sinon.stub(connectionManager, '_restoreConnection');
      });

      test('_restoreConnection() should be called ', function() {
        connectionManager._onAdapterAttributeChanged(mockAdapter, evt);
        assert.isTrue(connectionManager._restoreConnection.called);
      });

      ['enabling', 'disabling', 'disabled'].forEach(function(state) {
        test('_restoreConnection() should not be called when ' + state, 
          function() {
          mockAdapter.state = state;
          connectionManager._onAdapterAttributeChanged(mockAdapter, evt);
          assert.isTrue(connectionManager._restoreConnection.notCalled);
        });
      });
    });
  });

  suite('_watchProfilesStatuschanged > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {};
    });

    test('profile status callback of adapter should be registered', function() {
      connectionManager._watchProfilesStatuschanged(mockAdapter);
      assert.isDefined(mockAdapter.onhfpstatuschanged);
      assert.isDefined(mockAdapter.ona2dpstatuschanged);
    });
  });

  suite('_unwatchProfilesStatuschanged > ', function() {
    var mockAdapter;
    setup(function() {
      mockAdapter = {
        onhfpstatuschanged: function() {},
        ona2dpstatuschanged: function() {}
      };
    });

    test('profile status callback of adapter should be null ', function() {
      connectionManager._unwatchProfilesStatuschanged(mockAdapter);
      assert.isNull(mockAdapter.onhfpstatuschanged);
      assert.isNull(mockAdapter.ona2dpstatuschanged);
    });
  });

  suite('_onProfileStatuschangeHandler > ', function() {
    var mockProfileID, mockEvt, resultOptions;
    setup(function() {
      mockProfileID = 'hfp';
      mockEvt = {
        address: 'AA:BB:CC:00:11:22',
        status: true
      };
      resultOptions = {
        address: mockEvt.address,
        connected: mockEvt.status,
        profileID: mockProfileID
      };
      this.sinon.stub(connectionManager, '_updateConnectionStatus');
    });

    test('_updateConnectionStatus() should be called with options', function() {
      connectionManager._onProfileStatuschangeHandler(mockProfileID, mockEvt);
      assert.isTrue(
        connectionManager._updateConnectionStatus.calledWith(resultOptions));
    });
  });

  suite('_recordConnection > ', function() {
    var action, address;
    var itemKey = 'device.connected';
    suite('action: set > ', function() {
      setup(function() {
        action = 'set';
        address = 'AA:BB:CC:00:11:22';
        this.sinon.stub(asyncStorage, 'setItem');
        this.sinon.stub(asyncStorage, 'removeItem');
      });

      test('should set item in async storage ', function() {
        connectionManager._recordConnection(action, address);
        assert.equal(asyncStorage.setItem.args[0][0], itemKey);
        assert.equal(asyncStorage.setItem.args[0][1], address);
        assert.isFalse(asyncStorage.removeItem.called);
      });
    });

    suite('action: remove > ', function() {
      var mockAdapter;
      setup(function() {
        action = 'remove';
        address = 'AA:BB:CC:00:11:22';
        mockAdapter = {
          state: 'enabled'
        };
        connectionManager._defaultAdapter = mockAdapter;
        this.sinon.stub(asyncStorage, 'setItem');
        this.sinon.stub(asyncStorage, 'removeItem');
      });

      test('should remove item in async storage ', function() {
        connectionManager._recordConnection(action, address);
        assert.isTrue(asyncStorage.removeItem.calledWith(itemKey));
        assert.isFalse(asyncStorage.setItem.called);
      });
    });
  });
});
