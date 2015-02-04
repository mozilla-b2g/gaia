'use strict';

suite('BluetoothDevice', function() {
  var bluetoothDevice, mockDeviceObj;

  setup(function(done) {
    var modules = [
      'modules/bluetooth/bluetooth_device'
    ];
    var map = {};
    mockDeviceObj = {
      onattributechanged: {},
      name: 'device-01',
      paired: false,
      address: 'AA:BB:CC:00:11:22',
      cod: {}
    };

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
           '"address", and "cod" properties. ', function() {
        assert.equal(bluetoothDeviceCreated.name, mockDeviceObj.name);
        assert.equal(bluetoothDeviceCreated.paired, mockDeviceObj.paired);
        assert.equal(bluetoothDeviceCreated.address, mockDeviceObj.address);
        assert.equal(bluetoothDeviceCreated.cod, mockDeviceObj.cod);
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
  });
});
