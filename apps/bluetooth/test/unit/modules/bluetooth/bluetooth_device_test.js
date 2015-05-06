'use strict';

suite('BluetoothDevice', function() {
  var bluetoothDevice, mockBtClassOfDeviceMapper, mockDeviceObj,
  defaultConnectionStatus;

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_device',
      'modules/bluetooth/bluetooth_cod_mapper'
    ];

    var map = {
      'modules/bluetooth': {
        'modules/bluetooth/bluetooth_cod_mapper': 'MockBtClassOfDeviceMapper'
      }
    };

    mockBtClassOfDeviceMapper = {
      getDeviceType: function() {return '';}
    };

    define('MockBtClassOfDeviceMapper', function() {
      return mockBtClassOfDeviceMapper;
    });

    mockDeviceObj = {
      onattributechanged: {},
      name: 'device-01',
      paired: false,
      address: 'AA:BB:CC:00:11:22',
      cod: {}
    };

    defaultConnectionStatus = 'disconnected';

    testRequire(modules, map, function(BluetoothDevice) {
      bluetoothDevice = BluetoothDevice;
      done();
    });
  });

  suite('ctor > ', function() {
    var bluetoothDeviceCreated;
    setup(function() {
      bluetoothDeviceCreated = bluetoothDevice(mockDeviceObj);
    });

    suite('create > ', function() {
      test('Will create BluetoothDevice with "name", "paired", ' +
           '"address", "type", "connectionStatus", "profiles", ' +
           'and "descriptionText" properties. Define getter "data", ' +
           'function "updateConnectionInfo", "updateDescriptionText".',
           function() {
        assert.equal(bluetoothDeviceCreated.name, mockDeviceObj.name);
        assert.equal(bluetoothDeviceCreated.paired, mockDeviceObj.paired);
        assert.equal(bluetoothDeviceCreated.address, mockDeviceObj.address);
        assert.isDefined(bluetoothDeviceCreated.type);
        assert.equal(bluetoothDeviceCreated.connectionStatus,
          defaultConnectionStatus);
        assert.isNull(bluetoothDeviceCreated.profiles);
        assert.isDefined(bluetoothDeviceCreated.descriptionText);
        assert.isDefined(bluetoothDeviceCreated.data);
        assert.isDefined(bluetoothDeviceCreated.updateConnectionInfo);
        assert.isDefined(bluetoothDeviceCreated.updateDescriptionText);
      });
    });

    suite('updateConnectionInfo > ', function() {
      var mockOptions;
      setup(function() {
        mockOptions = {
          connectionStatus: 'connected',
          profiles: {
            'hfp': true,
            'a2dp': false
          }
        };
      });

      test('"connectionStatus" property should be "connected"', function() {
        bluetoothDeviceCreated.updateConnectionInfo(mockOptions);
        assert.equal(bluetoothDeviceCreated.connectionStatus,
          mockOptions.connectionStatus);
        assert.deepEqual(bluetoothDeviceCreated.profiles,
          mockOptions.profiles);
      });
    });

    suite('updateDescriptionText > ', function() {
      suite('"paired" property changed > ', function() {
        var newPairedState;
        setup(function() {
          newPairedState = 'pairing';
          bluetoothDeviceCreated.paired = newPairedState;
        });

        test('"descriptionText" property should be "pairing" ', function() {
          assert.equal(bluetoothDeviceCreated.descriptionText, newPairedState);
        });
      });

      suite('"connectionStatus" property changed > ', function() {
        var newConnectionStatus;
        setup(function() {
          newConnectionStatus = 'connecting';
          bluetoothDeviceCreated.paired = true;
          bluetoothDeviceCreated.connectionStatus = newConnectionStatus;
        });

        test('"descriptionText" property should be "connecting" ', function() {
          assert.equal(bluetoothDeviceCreated.descriptionText,
            newConnectionStatus);
        });
      });

      suite('"profiles" property changed > ', function() {
        var newProfiles, expectedDescriptionText;
        setup(function() {
          newProfiles = {
            'hfp': true,
            'a2dp': true
          };
          expectedDescriptionText = 'connectedWithDeviceMedia';
          bluetoothDeviceCreated.paired = true;
          bluetoothDeviceCreated.connectionStatus = 'connected';
          bluetoothDeviceCreated.profiles = newProfiles;
        });

        test('"descriptionText" property should be "connectedWithDeviceMedia" ',
        function() {
          assert.equal(bluetoothDeviceCreated.descriptionText,
            expectedDescriptionText);
        });
      });
    });

    suite('event > name ', function() {
      var mockEvt, newName;
      setup(function() {
        mockEvt = {
          attrs: ['name']
        };
        newName = 'device-02';
        mockDeviceObj.name = newName;
      });

      test('"onattributechanged" event coming with ' +
           'name property changed ', function() {
        mockDeviceObj.onattributechanged(mockEvt);
        assert.equal(bluetoothDeviceCreated.name, newName);
      });
    });

    suite('event > paired ', function() {
      var mockEvt, newPairedState;
      setup(function() {
        mockEvt = {
          attrs: ['paired']
        };
        newPairedState = true;
        mockDeviceObj.paired = newPairedState;
      });

      test('"onattributechanged" event coming with ' +
           'paired property changed ', function() {
        mockDeviceObj.onattributechanged(mockEvt);
        assert.equal(bluetoothDeviceCreated.paired, newPairedState);
      });
    });

    suite('event > cod ', function() {
      var mockEvt, newCODObject, mockType;
      setup(function() {
        mockEvt = {
          attrs: ['cod']
        };
        mockType = 'audio-card';
        newCODObject = {};
        mockDeviceObj.cod = newCODObject;

        this.sinon.stub(mockBtClassOfDeviceMapper, 'getDeviceType').returns(
          mockType);
      });

      test('"onattributechanged" event coming with ' +
           'cod property changed ', function() {
        mockDeviceObj.onattributechanged(mockEvt);
        assert.isTrue(mockBtClassOfDeviceMapper.getDeviceType.calledWith(
          newCODObject));
        assert.equal(bluetoothDeviceCreated.type, mockType);
      });
    });
  });
});
