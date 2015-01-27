/* global BluetoothTransferIcon, MockBluetooth */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_transfer_icon.js');
requireApp('system/test/unit/mock_bluetooth.js');

suite('system/BluetoothTransferIcon', function() {
  var subject;

  setup(function() {
    subject = new BluetoothTransferIcon(MockBluetooth);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Bluetooth transfer is ongoing', function() {
    MockBluetooth.mExpectedProfile = MockBluetooth.Profiles.OPP;
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Bluetooth transfer is done', function() {
    MockBluetooth.mExpectedProfile = '';
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
