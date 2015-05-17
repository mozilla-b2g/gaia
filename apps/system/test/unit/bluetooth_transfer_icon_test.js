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
    MockBluetooth.mExpectedProfile = 'opp';
    assert.isTrue(subject.shouldDisplay());
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Bluetooth transfer is done', function() {
    MockBluetooth.mExpectedProfile = '';
    assert.isFalse(subject.shouldDisplay());
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
