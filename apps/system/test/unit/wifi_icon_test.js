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

  suite('iconchanged', function() {
    test('Should publish iconchanged from connected to connecting',
      function() {
        manager.wifiManager.connection.status = 'connected';
        subject.update();
        manager.wifiManager.connection.status = 'connecting';
        this.sinon.stub(subject, 'publish');
        subject.update();
        assert.isTrue(subject.publish.calledWith('changed'));
      });

    test('Should not publish iconchanged from associated to connecting',
      function() {
        manager.wifiManager.connection.status = 'associated';
        subject.update();
        manager.wifiManager.connection.status = 'connecting';
        this.sinon.stub(subject, 'publish');
        subject.update();
        assert.isFalse(subject.publish.calledWith('changed'));
      });

    test('Should publish iconchanged from connecting to connected',
      function() {
        manager.wifiManager.connection.status = 'connecting';
        subject.update();
        manager.wifiManager.connection.status = 'connected';
        this.sinon.stub(subject, 'publish');
        subject.update();
        assert.isTrue(subject.publish.calledWith('changed'));
      });

    test('Should publish iconchanged if strength changes over 1 level',
      function() {
        manager.wifiManager.connection.status = 'connected';
        manager.wifiManager.connectionInformation.relSignalStrength = 60;
        subject.update();
        manager.wifiManager.connectionInformation.relSignalStrength = 90;
        this.sinon.stub(subject, 'publish');
        subject.update();
        assert.isTrue(subject.publish.calledWith('changed'));
      });

    test('Should not publish iconchanged if strength changes within 1 level',
      function() {
        manager.wifiManager.connection.status = 'connected';
        manager.wifiManager.connectionInformation.relSignalStrength = 70;
        subject.update();
        manager.wifiManager.connectionInformation.relSignalStrength = 71;
        this.sinon.stub(subject, 'publish');
        subject.update();
        assert.isFalse(subject.publish.calledWith('changed'));
      });
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
