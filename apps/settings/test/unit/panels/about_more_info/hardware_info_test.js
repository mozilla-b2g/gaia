'use strict';

suite('about hardware info >', function() {
  var hardwareInfo;
  var MockVersionDetector;
  var MockBluetooth1;
  var MockBluetooth2;
  var realSettingsListener;

  var modules = [
    'shared_mocks/mock_settings_listener',
    'panels/about_more_info/hardware_info'
  ];

  var maps = {
    '*': {
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/bluetooth/version_detector': 'MockVersionDetector',
      'modules/bluetooth/bluetooth_v1': 'MockBluetooth1',
      'modules/bluetooth/bluetooth_context': 'MockBluetooth2'
    }
  };

  var elements = {
    deviceInfoMac: document.createElement('li'),
    btAddr: document.createElement('li')
  };

  setup(function(done) {
    var requireCtx = testRequire([], maps, function() {});

    MockVersionDetector = {
      getVersion: function() {}
    };
    define('MockVersionDetector', function() {
      return MockVersionDetector;
    });

    MockBluetooth1 = {
      observe: function() {},
      address: ''
    };
    define('MockBluetooth1', function() {
      return MockBluetooth1;
    });

    MockBluetooth2 = {
      observe: function() {},
      address: ''
    };
    define('MockBluetooth2', function() {
      return MockBluetooth2;
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
    test('should show bluetooth address', function(done) {
      var fakeAddress = 'fakeAddress';
      MockBluetooth1.address = fakeAddress;
      this.sinon.stub(MockBluetooth1, 'observe');
      this.sinon.stub(MockVersionDetector, 'getVersion').returns(1);
      this.sinon.spy(hardwareInfo, '_refreshBluetoothAddress');

      hardwareInfo._loadBluetoothAddress().then(function() {
        sinon.assert.calledWith(MockBluetooth1.observe, 'address');
        assert.equal(hardwareInfo._refreshBluetoothAddress.args[0][0],
          fakeAddress);

        // Ensure the observer works
        var fakeAddress2 = 'fakeAddress2';
        MockBluetooth1.observe.args[0][1](fakeAddress2);
        assert.equal(hardwareInfo._refreshBluetoothAddress.args[1][0],
          fakeAddress2);
      }, function() {
        // This function does not reject.
        assert.isTrue(false);
      }).then(done, done);
    });

    suite('should use correct bluetooth module', function() {
      setup(function() {
        this.sinon.stub(MockBluetooth1, 'observe');
        this.sinon.stub(MockBluetooth2, 'observe');
      });

      test('bluetooth version 1', function(done) {
        this.sinon.stub(MockVersionDetector, 'getVersion').returns(1);

        hardwareInfo._loadBluetoothAddress().then(function() {
          assert.isTrue(MockBluetooth1.observe.called);
          assert.isTrue(MockBluetooth2.observe.notCalled);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });

      test('bluetooth version 2', function(done) {
        this.sinon.stub(MockVersionDetector, 'getVersion').returns(2);

        hardwareInfo._loadBluetoothAddress().then(function() {
          assert.isTrue(MockBluetooth1.observe.notCalled);
          assert.isTrue(MockBluetooth2.observe.called);
        }, function() {
          // This function does not reject.
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });
});

