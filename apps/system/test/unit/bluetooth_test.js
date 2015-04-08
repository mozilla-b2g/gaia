/* global MockMozBluetooth, Bluetooth, MockBTAdapter,
          MockNavigatormozSetMessageHandler, MocksHelper, MockLazyLoader */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_icon.js');
requireApp('system/js/bluetooth_transfer_icon.js');
requireApp('system/js/bluetooth_headphone_icon.js');
requireApp('system/js/bluetooth.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

var mocksForBluetooth = new MocksHelper([
  'SettingsListener',
  'LazyLoader'
]).init();

suite('system/BluetoothCore', function() {
  var realMozBluetooth, realSetMessageHandler;
  mocksForBluetooth.attachTestHelpers();

  suiteSetup(function(done) {
    sinon.spy(MockLazyLoader, 'load');
    MockLazyLoader.mLoadRightAway = true;
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    requireApp('system/js/bluetooth.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  setup(function() {
    // instanciate bluetooth module
    window.Bluetooth = window.Bluetooth1;
    window.BluetoothTransfer = { start: function() {} };
    Bluetooth.init();
  });

  test('Should lazy load icons', function() {
    assert.isTrue(MockLazyLoader.load.calledWith(
      ['js/bluetooth_transfer.js',
      'js/bluetooth_icon.js',
      'js/bluetooth_transfer_icon.js',
      'js/bluetooth_headphone_icon.js']
    ));
  });

  test('Update bluetooth icon when bluetooth is enabled', function() {
    this.sinon.stub(Bluetooth.icon, 'update');
    MockMozBluetooth.triggerEventListeners('enabled');
    assert.isTrue(Bluetooth.icon.update.called);
  });

  test('Update bluetooth icon when bluetooth is disabled', function() {
    this.sinon.stub(Bluetooth.icon, 'update');
    MockMozBluetooth.triggerEventListeners('disabled');
    assert.isTrue(Bluetooth.icon.update.called);
  });

  test('Update transfer icon on system message', function() {
    this.sinon.stub(Bluetooth.transferIcon, 'update');
    MockNavigatormozSetMessageHandler.mTrigger(
      'bluetooth-opp-transfer-start', {});
    assert.isTrue(Bluetooth.transferIcon.update.called);
    MockNavigatormozSetMessageHandler.mTrigger(
      'bluetooth-opp-transfer-complete', {});
    assert.isTrue(Bluetooth.transferIcon.update.calledTwice);
  });

  test('Update headset icon on adapter notifying', function() {
    this.sinon.stub(Bluetooth.headphoneIcon, 'update');
    MockMozBluetooth.triggerOnGetAdapterSuccess();
    MockBTAdapter.ona2dpstatuschanged({status: true});
    assert.isTrue(Bluetooth.headphoneIcon.update.called);
    MockBTAdapter.ona2dpstatuschanged({status: false});
    assert.isTrue(Bluetooth.headphoneIcon.update.calledTwice);
  });
});
