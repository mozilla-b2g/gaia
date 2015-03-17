/* global BluetoothHeadphoneIcon, MockBluetooth */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_headphone_icon.js');
requireApp('system/test/unit/mock_bluetooth.js');

suite('system/BluetoothHeadphoneIcon', function() {
  var subject;

  setup(function() {
    subject = new BluetoothHeadphoneIcon(MockBluetooth);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Bluetooth headset is connected', function() {
    MockBluetooth.mExpectedProfile = 'a2dp';
    assert.isTrue(subject.shouldDisplay());
    subject.update();
    assert.isTrue(subject.isVisible());
  });

  test('Bluetooth headset is disconnected', function() {
    MockBluetooth.mExpectedProfile = '';
    assert.isFalse(subject.shouldDisplay());
    subject.update();
    assert.isFalse(subject.isVisible());
  });
});
