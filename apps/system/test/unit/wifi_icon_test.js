/* global WifiIcon, MockL10n */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/wifi_icon.js');
require('/shared/test/unit/mocks/mock_l10n.js');

suite('system/WifiIcon', function() {
  var subject, manager, realL10n;

  setup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    manager = {
      wifiEnabled: false,
      wifiManager: {
        connection: {
          status: 'disconnected'
        },
        connectionInformation: {
          relSignalStrength: 0
        }
      }
    };
    subject = new WifiIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    navigator.mozL10n = realL10n;
    subject.stop();
  });

  suite('Update wifi signal level', function() {
    test('Wifi is disconnected', function() {
      manager.wifiManager.connection.status = 'disconnected';
      subject.update();
      assert.isFalse(subject.isVisible());
    });

    test('Wifi is connecting', function() {
      manager.wifiManager.connection.status = 'connecting';
      subject.update();
      assert.equal(subject.element.dataset.level, 0);
      assert.equal(subject.element.dataset.connecting, 'true');
      assert.equal(MockL10n.getAttributes(subject.element).id,
        'statusbarWiFiConnecting');
      assert.isTrue(subject.isVisible());
    });

    test('Wifi is connected', function() {
      manager.wifiManager.connection.status = 'connected';
      manager.wifiManager.connectionInformation.relSignalStrength = 75;
      subject.update();
      assert.equal(subject.element.dataset.level, 3);
      assert.equal(subject.element.dataset.connecting, undefined);
      assert.equal(MockL10n.getAttributes(subject.element).id,
        'statusbarWiFiConnected');
      assert.deepEqual(MockL10n.getAttributes(subject.element).args,
        {level: 3});
      assert.isTrue(subject.isVisible());
    });
  });
});
