/* global MockNavigatorSettings */

'use strict';
requireApp('settings/test/unit/mock_navigator_settings.js');

suite('Bluetooth > ', function() {
  var realMozsettings;

  suiteSetup(function() {
    realMozsettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozsettings;
  });

  setup(function(done) {
    var modules = [
      'shared_mocks/mock_navigator_moz_bluetooth',
      'shared_mocks/mock_bluetooth_helper',
      'modules/bluetooth'
    ];

    var mockMozBTPath = 'shared_mocks/mock_navigator_moz_bluetooth';
    var maps = {
      'modules/bluetooth': {
        'modules/navigator/mozBluetooth': mockMozBTPath,
        'shared/bluetooth_helper': 'shared_mocks/mock_bluetooth_helper'
      }
    };

    testRequire(modules, maps, function(NavigatorBluetooth,
      BluetoothHelperModule, Bluetooth) {
        this.MockMozBluetooth = NavigatorBluetooth;
        this.bluetoothHelper = new BluetoothHelperModule();
        this.Bluetooth = Bluetooth;
        done();
      }.bind(this));
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  suite('start test bluetooth module > ', function() {
    suite('init while Bluetooth is enabled > ', function() {
      setup(function() {
        this.sinon.stub(this.Bluetooth, '_getEnabled').returns(true);
        this.sinon.stub(this.Bluetooth, '_initPairedDevicesInfo');
        this.sinon.stub(this.Bluetooth, '_initAddressInfo');
        this.sinon.stub(this.Bluetooth, '_watchMozBluetoothAdapteradded');
        this.sinon.stub(this.Bluetooth, '_watchMozBluetoothDisabled');
        this.sinon.stub(this.Bluetooth, '_watchPairedstatuschanged');
      });

      test('device info and event watching > ', function() {
        this.Bluetooth._init();
        assert.isTrue(this.Bluetooth._initPairedDevicesInfo.calledOnce,
          'paired devices info should be inited..');
        assert.isTrue(this.Bluetooth._initAddressInfo.calledOnce,
          'address info should be inited..');
        assert.isTrue(this.Bluetooth._watchMozBluetoothAdapteradded.calledOnce,
          '"adapteradded" event should be watched..');
        assert.isTrue(this.Bluetooth._watchMozBluetoothDisabled.calledOnce,
          '"disabled" event should be watched..');
        assert.isTrue(this.Bluetooth._watchPairedstatuschanged.calledOnce,
          '"pairedstatuschanged" event should be watched..');
      });
    });

    suite('init while Bluetooth is disabled > ', function() {
      setup(function() {
        this.sinon.stub(this.Bluetooth, '_getEnabled').returns(false);
        this.sinon.stub(this.Bluetooth, '_initPairedDevicesInfo');
        this.sinon.stub(this.Bluetooth, '_initAddressInfo');
        this.sinon.stub(this.Bluetooth, '_watchMozBluetoothAdapteradded');
        this.sinon.stub(this.Bluetooth, '_watchMozBluetoothDisabled');
        this.sinon.stub(this.Bluetooth, '_watchPairedstatuschanged');
      });

      test('device info and event watching > ', function() {
        this.Bluetooth._init();
        assert.isFalse(this.Bluetooth._initPairedDevicesInfo.calledOnce,
          'paired devices info should not be inited..');
        assert.isFalse(this.Bluetooth._initAddressInfo.calledOnce,
          'address info should not be inited..');
        assert.isTrue(this.Bluetooth._watchMozBluetoothAdapteradded.calledOnce,
          '"adapteradded" event should be watched..');
        assert.isTrue(this.Bluetooth._watchMozBluetoothDisabled.calledOnce,
          '"disabled" event should be watched..');
        assert.isTrue(this.Bluetooth._watchPairedstatuschanged.calledOnce,
          '"pairedstatuschanged" event should be watched..');
      });
    });
  });

  suite('init paired devices info. > ', function() {
    suite('has inited paired devices info. > ', function() {
      setup(function() {
        this.Bluetooth._hasInitPairedDevicesInfo = true;
        this.sinon.stub(this.Bluetooth, '_refreshPairedDevicesInfo');
        this.Bluetooth._initPairedDevicesInfo();
      });

      test('refresh paired devices info. should not be called..', function() {
        assert.isFalse(this.Bluetooth._refreshPairedDevicesInfo.calledOnce);
      });
    });

    suite('has not inited paired devices info. > ', function() {
      setup(function() {
        this.Bluetooth._hasInitPairedDevicesInfo = false;
        this.sinon.stub(this.Bluetooth, '_refreshPairedDevicesInfo');
        this.Bluetooth._initPairedDevicesInfo();
      });

      test('refresh paired devices info. should be called..', function() {
        assert.isTrue(this.Bluetooth._refreshPairedDevicesInfo.calledOnce);
      });
      test('_hasInitPairedDevicesInfo should be true..', function() {
        assert.isTrue(this.Bluetooth._hasInitPairedDevicesInfo);
      });
    });
  });

  suite('init address info. > ', function() {
    var realAddress, fakeTimer;

    suite('address is recorded > ', function() {
      var stubMockNavigatorSettings;

      setup(function() {
        realAddress = this.Bluetooth.address;
        this.Bluetooth.address = '00:11:22:AA:BB:CC';
        stubMockNavigatorSettings =
          this.sinon.stub(MockNavigatorSettings, 'createLock');
        this.Bluetooth._initAddressInfo();
      });

      teardown(function() {
        this.Bluetooth.address = realAddress;
      });

      test('settings createLock should not be called..', function() {
        assert.isFalse(stubMockNavigatorSettings.calledOnce);
      });
    });

    suite('address is not recorded, but in settings DB > ', function() {
      var address = '00:11:22:AA:BB:CC';
      var stubBTHelperGetAddress;

      setup(function() {
        fakeTimer = this.sinon.useFakeTimers();
        realAddress = this.Bluetooth.address;
        this.Bluetooth.address = null;
        MockNavigatorSettings.mSettings['deviceinfo.bt_address'] = address;
        stubBTHelperGetAddress =
          this.sinon.stub(this.bluetoothHelper, 'getAddress');
      });

      teardown(function() {
        this.Bluetooth.address = realAddress;
      });

      test('address should be got from settings DB..', function() {
        this.Bluetooth._initAddressInfo();
        fakeTimer.tick();
        assert.equal(this.Bluetooth.address, address);
      });
      test('BluetoothHelper.getAddress should not be called..', function() {
        this.Bluetooth._initAddressInfo();
        fakeTimer.tick();
        assert.isFalse(stubBTHelperGetAddress.called);
      });
    });

    suite('address is not recorded, not in settings DB, ' +
      'Bluetooth is enabled > ', function() {
      var address = '00:11:22:AA:BB:CC';
      var realBluetoothEnabled;
      var stubBTHelperGetAddress;

      setup(function() {
        fakeTimer = this.sinon.useFakeTimers();
        realAddress = this.Bluetooth.address;
        this.Bluetooth.address = null;
        realBluetoothEnabled = this.Bluetooth.enabled;
        this.Bluetooth.enabled = true;
        MockNavigatorSettings.mSettings['deviceinfo.bt_address'] = null;
        stubBTHelperGetAddress =
          this.sinon.stub(this.bluetoothHelper, 'getAddress');
      });

      teardown(function() {
        this.Bluetooth.address = realAddress;
        this.Bluetooth.enabled = realBluetoothEnabled;
      });

      test('BluetoothHelper.getAddress() should be called ' +
        'while Bluetooth is enabled..', function() {
        this.Bluetooth._initAddressInfo();
        fakeTimer.tick();
        assert.isTrue(stubBTHelperGetAddress.called);
        var gotAddressCallback = stubBTHelperGetAddress.getCall(0).args[0];
        gotAddressCallback(address);
        assert.equal(this.Bluetooth.address, address);
      });
    });

    suite('address is not recorded, not in settings DB, ' +
      'Bluetooth is disabled > ', function() {
      var realBluetoothEnabled;
      var stubBTHelperGetAddress;

      setup(function() {
        fakeTimer = this.sinon.useFakeTimers();
        realAddress = this.Bluetooth.address;
        this.Bluetooth.address = null;
        realBluetoothEnabled = this.Bluetooth.enabled;
        this.Bluetooth.enabled = false;
        MockNavigatorSettings.mSettings['deviceinfo.bt_address'] = null;
        stubBTHelperGetAddress =
          this.sinon.stub(this.bluetoothHelper, 'getAddress');
      });

      teardown(function() {
        this.Bluetooth.address = realAddress;
        this.Bluetooth.enabled = realBluetoothEnabled;
      });

      test('BluetoothHelper.getAddress() should not be called ' +
        'while Bluetooth is disabled..', function() {
        this.Bluetooth._initAddressInfo();
        fakeTimer.tick();
        assert.isFalse(stubBTHelperGetAddress.called);
      });
    });
  });

  suite('watch MozBluetooth "adapteradded" event > ', function() {
    var realBluetoothEnabled;
    setup(function() {
      realBluetoothEnabled = this.Bluetooth.enabled;
      this.Bluetooth.enabled = false;
      this.sinon.stub(this.Bluetooth, '_initPairedDevicesInfo');
      this.sinon.stub(this.Bluetooth, '_initAddressInfo');
    });

    teardown(function() {
      this.Bluetooth.enabled = realBluetoothEnabled;
    });

    test('init paired devices, address info should be called while receive ' +
      'adapteradded event..', function() {
      this.MockMozBluetooth.triggerEventListeners('adapteradded');
      assert.isTrue(this.Bluetooth.enabled, 'enabled should be set with true');
      assert.isTrue(this.Bluetooth._initPairedDevicesInfo.calledOnce);
      assert.isTrue(this.Bluetooth._initAddressInfo.calledOnce);
    });
  });

  suite('watch MozBluetooth "disabled" event > ', function() {
    var realBluetoothEnabled;
    setup(function() {
      realBluetoothEnabled = this.Bluetooth.enabled;
      this.Bluetooth.enabled = false;
    });

    teardown(function() {
      this.Bluetooth.enabled = realBluetoothEnabled;
    });

    test('disable bluetooth state while receive disabled event..', function() {
      this.MockMozBluetooth.triggerEventListeners('disabled');
      assert.isFalse(this.Bluetooth.enabled,
        'enabled should be set with false');
    });
  });

  suite('watch "onpairedstatuschanged" event > ', function() {
    setup(function() {
      this.sinon.stub(this.Bluetooth, '_refreshPairedDevicesInfo');
      this.Bluetooth._watchPairedstatuschanged();
    });

    test('refresh paired devices info. while receive ' +
      '"onpairedstatuschanged" event..', function() {
      this.bluetoothHelper.onpairedstatuschanged();
      assert.isTrue(this.Bluetooth._refreshPairedDevicesInfo.calledOnce);
    });
  });

  suite('refresh paired devices info. > ', function() {
    var realFirstPairedDeviceName, realNumberOfPairedDevices;
    var stubBTHelperGetPairedDevices;
    setup(function() {
      realFirstPairedDeviceName = this.Bluetooth.firstPairedDeviceName;
      this.Bluetooth.firstPairedDeviceName = '';
      realNumberOfPairedDevices = this.Bluetooth.numberOfPairedDevices;
      this.Bluetooth.numberOfPairedDevices = 0;
      stubBTHelperGetPairedDevices =
        this.sinon.stub(this.bluetoothHelper, 'getPairedDevices');
      this.Bluetooth._refreshPairedDevicesInfo();
    });

    teardown(function() {
      this.Bluetooth.firstPairedDeviceName = realFirstPairedDeviceName;
      this.Bluetooth.numberOfPairedDevices = realNumberOfPairedDevices;
    });

    test('getPairedDevices() should be called..', function() {
      assert.isTrue(stubBTHelperGetPairedDevices.calledOnce,
        'BluetoothHelper.getPairedDevices() should be called..');
      var result = [{name: 'BB_device'}, {name: 'AA_device'}];
      var gotPairedCallback = stubBTHelperGetPairedDevices.getCall(0).args[0];
      gotPairedCallback(result);
      assert.equal(this.Bluetooth.firstPairedDeviceName, 'AA_device');
      assert.equal(this.Bluetooth.numberOfPairedDevices, 2);
    });
  });
});
