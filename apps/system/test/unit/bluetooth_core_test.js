/* global MockMozBluetooth, BaseModule, MocksHelper, MockLazyLoader */
'use strict';

requireApp('system/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');

var mocksForBluetoothCore = new MocksHelper([
  'LazyLoader'
]).init();

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('system/BluetoothCore', function() {
  var realMozBluetooth;
  mocksForBluetoothCore.attachTestHelpers();

  setup(function(done) {
    window.Bluetooth1 = {
      start: this.sinon.spy()
    };
    MockLazyLoader.mLoadRightAway = true;
    this.sinon.spy(MockLazyLoader, 'load');

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    requireApp('system/js/bluetooth_core.js', done);
  });

  teardown(function() {
    delete window.Bluetooth1;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  suite('BluetoothCore API', function() {
    var subject;
    setup(function() {
      subject = BaseModule.instantiate('BluetoothCore');
    });

    teardown(function() {
      subject.stop();
    });

    test('Start', function(done) {
      subject.start().then(() => {
        assert.isTrue(window.Bluetooth1.start.called);
        done();
      });
    });
  });
});
