'use strict';

suite('about hardware info >', function() {
  var hardwareInfo;
  var MockVersionDetector;
  var MockBluetooth;
  var realSettingsListener;

  var modules = [
    'shared_mocks/mock_settings_listener',
    'panels/about_more_info/hardware_info'
  ];

  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/bluetooth/bluetooth_context': 'MockBluetooth'
    }
  };

  var elements = {
    deviceInfoMac: document.createElement('li'),
    btAddr: document.createElement('li')
  };

  setup(function(done) {
    var requireCtx = testRequire([], maps, function() {});

    define('MockVersionDetector', function() {
      return MockVersionDetector;
    });

    MockBluetooth = {
      observe: function() {},
      address: ''
    };
    define('MockBluetooth', function() {
      return MockBluetooth;
    });

    requireCtx(modules, function(MockSettingsListener, HardwareInfo) {
      realSettingsListener = window.SettingsListener;
      window.SettingsListener = MockSettingsListener;

      hardwareInfo = HardwareInfo();
      hardwareInfo._elements = elements;
      done();
    });
  });

  suiteTeardown(function() {
    window.SettingsListener = realSettingsListener;
  });

  suite('Initialization >', function() {
    setup(function() {
      this.sinon.stub(hardwareInfo, '_loadMacAddress');
      this.sinon.stub(hardwareInfo, '_loadBluetoothAddress');
      hardwareInfo.init(elements);
    });

    test('function called', function() {
      assert.ok(hardwareInfo._loadMacAddress.called);
      assert.ok(hardwareInfo._loadBluetoothAddress.called);
    });
  });

  suite('loadBluetoothAddress >', function() {
    test('should show bluetooth address', function() {
      var fakeAddress = 'fakeAddress';
      MockBluetooth.address = fakeAddress;
      this.sinon.stub(MockBluetooth, 'observe');
      this.sinon.spy(hardwareInfo, '_refreshBluetoothAddress');

      hardwareInfo._loadBluetoothAddress();
      assert.ok(MockBluetooth.observe.calledWith('address'));
      assert.equal(hardwareInfo._refreshBluetoothAddress.args[0][0],
        fakeAddress);

      // Ensure the observer works
      var fakeAddress2 = 'fakeAddress2';
      MockBluetooth.observe.args[0][1](fakeAddress2);
      assert.equal(hardwareInfo._refreshBluetoothAddress.args[1][0],
        fakeAddress2);
    });

    suite('should use correct bluetooth module', function() {
      setup(function() {
        this.sinon.stub(MockBluetooth, 'observe');
      });

      test('bluetooth', function() {
        hardwareInfo._loadBluetoothAddress();
        assert.isTrue(MockBluetooth.observe.called);
      });
    });
  });
});
