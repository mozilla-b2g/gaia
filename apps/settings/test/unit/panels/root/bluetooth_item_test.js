'use strict';

suite('BluetoothItem', function() {
  var realL10n;
  var modules = [
    'shared_mocks/mock_l10n',
    'panels/root/bluetooth_item'
  ];
  var map = {
    '*': {
      'modules/bluetooth/version_detector': 'MockVersionDetector',
      'modules/settings_service': 'MockSettingsService',
      'modules/bluetooth/bluetooth_v1': 'MockBluetooth_v1',
      'modules/bluetooth/bluetooth': 'MockBluetooth_v2'
    }
  };

  suiteSetup(function(done) {
    this.MockVersionDetector = {
      _mVersion: 1,
      getVersion: function() {return this._mVersion;}
    };

    this.MockSettingsService = {
      navigate: function() {}
    };

    this.MockBluetooth_v1 = {
      enabled: false,
      numberOfPairedDevices: 0,
      firstPairedDeviceName: null,
      observe: function() {},
      unobserve: function() {}
    };

    this.MockBluetooth_v2 = {
      enabled: false,
      numberOfPairedDevices: 0,
      firstPairedDeviceName: null,
      observe: function() {},
      unobserve: function() {}
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockVersionDetector', function() {
      return this.MockVersionDetector;
    }.bind(this));

    define('MockSettingsService', function() {
      return this.MockSettingsService;
    }.bind(this));

    define('MockBluetooth_v1', function() {
      return this.MockBluetooth_v1;
    }.bind(this));

    define('MockBluetooth_v2', function() {
      return this.MockBluetooth_v2;
    }.bind(this));

    requireCtx(modules, function(MockL10n, BluetoothItem) {
      realL10n = window.navigator.mozL10n;
      this.MockL10n = MockL10n;
      window.navigator.mozL10n = MockL10n;

      this.BluetoothItem = BluetoothItem;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  setup(function() {
    this.liElement = document.createElement('li');
    this.element = document.createElement('div');
    this.liElement.appendChild(this.element);
    this.subject = this.BluetoothItem(this.element);
  });

  test('when enabled = true', function(done) {
    this.sinon.stub(this.MockBluetooth_v1, 'observe');
    this.sinon.stub(this.subject, '_boundRefreshMenuDescription');
    var mockPromise = new Promise(function(resolve) {
      resolve(this.MockBluetooth_v1);
    }.bind(this));
    this.sinon.stub(this.subject, '_getBluetooth').returns(mockPromise);

    this.subject.enabled = true;
    mockPromise.then(function() {
      sinon.assert.called(this.subject._boundRefreshMenuDescription);
      sinon.assert.calledTwice(this.MockBluetooth_v1.observe);
      assert.equal(this.MockBluetooth_v1.observe.args[0][0], 'enabled');
      assert.equal(this.MockBluetooth_v1.observe.args[0][1],
        this.subject._boundRefreshMenuDescription);
      assert.equal(this.MockBluetooth_v1.observe.args[1][0],
        'numberOfPairedDevices');
      assert.equal(this.MockBluetooth_v1.observe.args[1][1],
        this.subject._boundRefreshMenuDescription);
    }.bind(this), function() {
      // should not reject here..
      assert.ok(false);
    }).then(done, done);
  });

  test('when enabled = false', function(done) {
    this.sinon.stub(this.MockBluetooth_v1, 'unobserve');
    this.sinon.stub(this.subject, '_boundRefreshMenuDescription');
    // The default enabled value is false. Set to true first.
    this.subject.enabled = true;

    var mockPromise = new Promise(function(resolve) {
      resolve(this.MockBluetooth_v1);
    }.bind(this));
    this.sinon.stub(this.subject, '_getBluetooth').returns(mockPromise);

    this.subject.enabled = false;
    mockPromise.then(function() {
      sinon.assert.calledTwice(this.MockBluetooth_v1.unobserve);
      assert.equal(this.MockBluetooth_v1.unobserve.args[0][0], 'enabled');
      assert.equal(this.MockBluetooth_v1.unobserve.args[0][1],
        this.subject._boundRefreshMenuDescription);
      assert.equal(this.MockBluetooth_v1.unobserve.args[1][0],
        'numberOfPairedDevices');
      assert.equal(this.MockBluetooth_v1.unobserve.args[1][1],
        this.subject._boundRefreshMenuDescription);
    }.bind(this), function() {
      // should not reject here..
      assert.ok(false);
    }).then(done, done);
  });

  suite('_boundRefreshMenuDescription > ', function() {
    var mockPromise;

    suite('when Bluetooth module enabled = true, ' +
      'numberOfPairedDevices = 0', function() {
      setup(function() {
        this.MockBluetooth_v1.enabled = true;
        this.MockBluetooth_v1.numberOfPairedDevices = 0;
        mockPromise = new Promise(function(resolve) {
          resolve(this.MockBluetooth_v1);
        }.bind(this));
        this.sinon.stub(this.subject, '_getBluetooth').returns(mockPromise);
      });

      test('should call to localize correctly', function(done) {
        this.subject._boundRefreshMenuDescription();
        mockPromise.then(function() {
          assert.equal(this.element.getAttribute('data-l10n-id'),
            'bt-status-nopaired');
        }.bind(this), function() {
          // should not reject here..
          assert.ok(false);
        }).then(done, done);
      });
    });

    suite('when Bluetooth module enabled = true, ' +
      'numberOfPairedDevices = 3', function() {
      var resultObj;
      setup(function() {
        this.MockBluetooth_v1.enabled = true;
        this.MockBluetooth_v1.numberOfPairedDevices = 3;
        this.MockBluetooth_v1.firstPairedDeviceName = 'device-A1';
        resultObj = {
          name: this.MockBluetooth_v1.firstPairedDeviceName,
          n: this.MockBluetooth_v1.numberOfPairedDevices - 1
        };
        mockPromise = new Promise(function(resolve) {
          resolve(this.MockBluetooth_v1);
        }.bind(this));
        this.sinon.stub(this.subject, '_getBluetooth').returns(mockPromise);
      });

      test('should call to localize correctly', function(done) {
        this.sinon.stub(this.MockL10n, 'setAttributes');
        this.subject._boundRefreshMenuDescription();
        mockPromise.then(function() {
          sinon.assert.calledWith(this.MockL10n.setAttributes, this.element,
            'bt-status-paired', sinon.match(resultObj));
        }.bind(this), function() {
          // should not reject here..
          assert.ok(false);
        }).then(done, done);
      });
    });

    suite('when Bluetooth module enabled = false', function() {
      setup(function() {
        this.MockBluetooth_v1.enabled = false;
        mockPromise = new Promise(function(resolve) {
          resolve(this.MockBluetooth_v1);
        }.bind(this));
        this.sinon.stub(this.subject, '_getBluetooth').returns(mockPromise);
      });

      test('should call to localize correctly', function(done) {
        this.subject._boundRefreshMenuDescription();
        mockPromise.then(function() {
          assert.equal(this.element.getAttribute('data-l10n-id'),
            'bt-status-turnoff');
        }.bind(this), function() {
          // should not reject here..
          assert.ok(false);
        }).then(done, done);
      });
    });
  });

  suite('_getBluetooth() > ', function() {
    var mockPromise;

    suite('already requested get Bluetooth with promise > ', function() {
      mockPromise = new Promise(function() {});

      setup(function() {
        this.subject._getBluetoothPromise = mockPromise;
      });

      test('should return the requested promise..', function() {
        assert.equal(this.subject._getBluetooth(), mockPromise);
      });
    });

    suite('have not requested _getBluetooth() with promise > ', function() {
      setup(function() {
        this.subject._getBluetoothPromise = null;
      });

      test('should return a new promise, require bluetooth_v1..', function() {
        this.subject._getBluetooth().then(function(bluetooth) {
          assert.ok(this.subject._getBluetooth);
          assert.equal(bluetooth, this.MockBluetooth_v1);
        }.bind(this));
      });
    });

    suite('have not requested _getBluetooth() with promise > ', function() {
      setup(function() {
        this.subject._getBluetoothPromise = null;
        this.sinon.stub(this.subject, '_APIVersion').returns(2);
      });

      test('should return a new promise, require bluetooth_v2..', function() {
        this.subject._getBluetooth().then(function(bluetooth) {
          assert.ok(this.subject._getBluetooth);
          assert.equal(bluetooth, this.MockBluetooth_v2);
        }.bind(this));
      });
    });
  });
});
