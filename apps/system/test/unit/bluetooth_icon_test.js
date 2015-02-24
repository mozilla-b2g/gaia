/* global BluetoothIcon, MockBluetooth, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_icon.js');
requireApp('system/test/unit/mock_bluetooth.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/BluetoothIcon', function() {
  var subject, realL10n;

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    subject = new BluetoothIcon(MockBluetooth);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  test('Bluetooth is enabled', function() {
    MockBluetooth._settingsEnabled = true;
    MockBluetooth.connected = false;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.equal(subject.element.dataset.active, 'false');
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOn-bluetooth');
  });

  test('Bluetooth is enabled and connected', function() {
    MockBluetooth._settingsEnabled = true;
    MockBluetooth.connected = true;
    subject.update();
    assert.isTrue(subject.isVisible());
    assert.equal(subject.element.dataset.active, 'true');
    assert.equal(MockL10n.getAttributes(subject.element).id,
      'statusbarIconOnActive-bluetooth');
  });

  test('Bluetooth is disabled', function() {
    MockBluetooth._settingsEnabled = false;
    MockBluetooth.connected = false;
    subject.update();
    assert.isFalse(subject.isVisible());
    assert.equal(subject.element.dataset.active, 'false');
  });
});
