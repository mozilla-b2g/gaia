/* global MockNavigatorSettings, MockNavigatorMozWifiManager */
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

suite('WifiContext', function() {
  'use strict';

  var realSettings;
  var wifiHelper;
  var wifiContext;
  var wifiManager;
  var map = {
    '*': {
      'modules/settings_cache': 'unit/mock_settings_cache',
      'shared/wifi_helper': 'shared_mocks/mock_wifi_helper'
    }
  };

  suiteSetup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    window.Settings = {};
    window.Settings.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realSettings;
  });

  setup(function(done) {
    testRequire([
      'modules/wifi_context',
      'shared/wifi_helper'
    ], map, function(WifiContext, MockWifiHelper) {
      wifiContext = WifiContext;
      wifiHelper = MockWifiHelper;
      wifiManager = wifiHelper.getWifiManager();

      MockNavigatorSettings.mSetup();
      MockNavigatorMozWifiManager.mSetup();
      done();
    });
  });

  suite('WifiStatusTextChange', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      wifiContext.addEventListener('wifiStatusTextChange', fakeCb);
    });

    teardown(function() {
      wifiContext.removeEventListener('wifiStatusTextChange', fakeCb);
    });

    test('when wifiManger.onenabled, trigger cb', function() {
      wifiManager.onenabled();
      assert.isTrue(fakeCb.called);
    });

    test('when wifiManger.ondisabled, trigger cb', function() {
      wifiManager.ondisabled();
      assert.isTrue(fakeCb.called);
    });

    test('when wifiManger.onstatuschange, trigger cb', function() {
      wifiManager.onstatuschange();
      assert.isTrue(fakeCb.called);
    });
  });

  suite('WifiEnabled', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      wifiContext.addEventListener('wifiEnabled', fakeCb);
    });

    teardown(function() {
      wifiContext.removeEventListener('wifiEnabled', fakeCb);
    });

    test('when wifiManager.onenabled, trigger cb', function() {
      wifiManager.onenabled();
      assert.isTrue(fakeCb.called);
    });
  });

  suite('WifiStatusChange', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      wifiContext.addEventListener('wifiStatusChange', fakeCb);
    });

    teardown(function() {
      wifiContext.removeEventListener('wifiStatusChange', fakeCb);
    });

    test('when wifiManager.onstatuschange, trigger cb', function() {
      wifiManager.onstatuschange();
      assert.isTrue(fakeCb.called);
    });
  });

  suite('WifiConnectionInfoUpdate', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      wifiContext.addEventListener('wifiConnectionInfoUpdate', fakeCb);
    });

    teardown(function() {
      wifiContext.removeEventListener('wifiConnectionInfoUpdate', fakeCb);
    });

    test('when wifiManager.onconnectioninfoupdate, trigger cb', function() {
      wifiManager.onconnectioninfoupdate();
      assert.isTrue(fakeCb.called);
    });
  });

  suite('wifiStatusText', function() {
    suiteTeardown(function() {
      delete(wifiManager.connection.status);
    });

    test('wifiManager is enabled, get fullstatus', function() {
      wifiManager.enabled = true;
      wifiManager.connection.status = 'disconnected';
      wifiManager.onstatuschange();
      assert.equal(wifiContext.wifiStatusText.id, 'fullStatus-disconnected');
    });

    test('wifiManager is disabled, get disabled string', function() {
      wifiManager.enabled = false;
      wifiManager.onstatuschange();
      assert.equal(wifiContext.wifiStatusText.id, 'disabled');
    });
  });

  suite('forgetNetwork', function() {
    setup(function() {
      this.sinon.spy(wifiManager, 'forget');
    });
    test('will bypass to wifiManager', function() {
      wifiContext.forgetNetwork({});
      assert.isTrue(wifiManager.forget.called);
      assert.isNull(wifiContext.currentNetwork);
    });
  });

  suite('associateNetwork', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      this.sinon.spy(wifiManager, 'associate');
      this.sinon.spy(wifiManager, 'forget');
      wifiContext.addEventListener('wifiWrongPassword', fakeCb);
    });

    test('will bypass to wifiManager', function() {
      var fakeNetwork = {
        known: false,
        password: '1234',
        ssid: 'fake-network'
      };
      wifiContext.associateNetwork(fakeNetwork);

      assert.isTrue(wifiManager.associate.calledWith(fakeNetwork));
      assert.equal(wifiContext.currentNetwork, fakeNetwork);

      wifiManager.enabled = true;
      wifiManager.connection.status = 'connected';
      wifiManager.onstatuschange({
        network: {
          ssid: fakeNetwork.ssid
        },
        status: wifiManager.connection.status
      });
      assert.isFalse(fakeCb.calledWith());
      assert.isFalse(wifiManager.forget.calledWith(fakeNetwork));
    });
  });

  suite('Connecting failed', function() {
    var fakeCb;

    setup(function() {
      fakeCb = sinon.spy();
      this.sinon.spy(wifiManager, 'associate');
      this.sinon.spy(wifiManager, 'forget');
      wifiContext.addEventListener('wifiWrongPassword', fakeCb);
    });

    teardown(function() {
      wifiContext.removeEventListener('wifiWrongPassword', fakeCb);
    });

    test('when connectingfailed, trigger cb', function() {
      var fakeNetwork = {
        known: false,
        password: '1234',
        ssid: 'fake-network'
      };
      wifiContext.associateNetwork(fakeNetwork);

      wifiManager.enabled = true;
      wifiManager.connection.status = 'connectingfailed';
      wifiManager.onstatuschange({
        network: {
          ssid: fakeNetwork.ssid
        },
        status: wifiManager.connection.status
      });
      assert.isTrue(fakeCb.calledWith());
      assert.isTrue(wifiManager.forget.calledWith(fakeNetwork));
    });
  });
});
