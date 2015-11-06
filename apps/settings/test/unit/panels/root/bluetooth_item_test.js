'use strict';

suite('BluetoothItem', function() {
  var realL10n;
  var modules = [
    'shared_mocks/mock_l10n',
    'panels/root/bluetooth_item'
  ];
  var map = {
    '*': {
      'modules/settings_service': 'MockSettingsService',
      'modules/bluetooth/bluetooth_context': 'MockBluetooth'
    }
  };

  suiteSetup(function(done) {
    this.MockSettingsService = {
      navigate: function() {}
    };

    this.MockBluetooth = {
      enabled: false,
      numberOfPairedDevices: 0,
      firstPairedDeviceName: null,
      observe: function() {},
      unobserve: function() {}
    };

    var requireCtx = testRequire([], map, function() {});
    define('MockSettingsService', function() {
      return this.MockSettingsService;
    }.bind(this));

    define('MockBluetooth', function() {
      return this.MockBluetooth;
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

  test('when enabled = true', function() {
    this.sinon.stub(this.MockBluetooth, 'observe');
    this.sinon.stub(this.subject, '_boundRefreshMenuDescription');

    this.subject.enabled = true;
    sinon.assert.called(this.subject._boundRefreshMenuDescription);
    sinon.assert.calledTwice(this.MockBluetooth.observe);
    assert.equal(this.MockBluetooth.observe.args[0][0], 'enabled');
    assert.equal(this.MockBluetooth.observe.args[0][1],
      this.subject._boundRefreshMenuDescription);
    assert.equal(this.MockBluetooth.observe.args[1][0],
      'numberOfPairedDevices');
    assert.equal(this.MockBluetooth.observe.args[1][1],
      this.subject._boundRefreshMenuDescription);
  });

  test('when enabled = false', function() {
    this.sinon.stub(this.MockBluetooth, 'unobserve');
    this.sinon.stub(this.subject, '_boundRefreshMenuDescription');
    // The default enabled value is false. Set to true first.
    this.subject.enabled = true;
    this.subject.enabled = false;
    sinon.assert.calledTwice(this.MockBluetooth.unobserve);
    assert.equal(this.MockBluetooth.unobserve.args[0][0], 'enabled');
    assert.equal(this.MockBluetooth.unobserve.args[0][1],
      this.subject._boundRefreshMenuDescription);
    assert.equal(this.MockBluetooth.unobserve.args[1][0],
      'numberOfPairedDevices');
    assert.equal(this.MockBluetooth.unobserve.args[1][1],
      this.subject._boundRefreshMenuDescription);
  });

  suite('_boundRefreshMenuDescription > ', function() {
    suite('when Bluetooth module enabled = true, ' +
      'numberOfPairedDevices = 0', function() {
      setup(function() {
        this.MockBluetooth.enabled = true;
        this.MockBluetooth.numberOfPairedDevices = 0;
      });

      test('should call to localize correctly', function() {
        this.subject._boundRefreshMenuDescription();
        assert.equal(this.element.getAttribute('data-l10n-id'),
          'bt-status-nopaired');
      });
    });

    suite('when Bluetooth module enabled = true, ' +
      'numberOfPairedDevices = 3', function() {
      var resultObj;
      setup(function() {
        this.MockBluetooth.enabled = true;
        this.MockBluetooth.numberOfPairedDevices = 3;
        this.MockBluetooth.firstPairedDeviceName = 'device-A1';
        resultObj = {
          name: this.MockBluetooth.firstPairedDeviceName,
          n: this.MockBluetooth.numberOfPairedDevices - 1
        };
      });

      test('should call to localize correctly', function() {
        this.sinon.stub(this.MockL10n, 'setAttributes');
        this.subject._boundRefreshMenuDescription();
        sinon.assert.calledWith(this.MockL10n.setAttributes, this.element,
          'bt-status-paired', sinon.match(resultObj));
      });
    });

    suite('when Bluetooth module enabled = false', function() {
      test('should call to localize correctly', function() {
        // The default enabled value is false. Set to true first.
        this.MockBluetooth.enabled = true;
        this.MockBluetooth.enabled = false;
        this.subject._boundRefreshMenuDescription();
        assert.equal(this.element.getAttribute('data-l10n-id'),
          'bt-status-turnoff');
      });
    });
  });
});
