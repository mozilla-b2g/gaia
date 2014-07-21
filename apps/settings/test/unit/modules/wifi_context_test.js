/* global MockL10n, MockNavigatorSettings, MockNavigatorMozWifiManager, Event */
requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_wifi_manager.js');

mocha.globals(['Settings']);

suite('WifiContext', function() {
  'use strict';

  var realL10n;
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
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    window.Settings = {};
    window.Settings.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
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

    test('when localized, trigger cb', function() {
      var evt = new Event('localized');
      window.dispatchEvent(evt);
      assert.isTrue(fakeCb.called);
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

  suite('wifiStatusText', function() {
    suiteTeardown(function() {
      delete(wifiManager.connection.status);
    });

    test('wifiManager is enabled, get fullstatus', function() {
      wifiManager.enabled = true;
      wifiManager.connection.status = 'disconnected';
      wifiManager.onstatuschange();
      assert.equal(wifiContext.wifiStatusText, 'fullStatus-disconnected');
    });

    test('wifiManager is disabled, get disabled string', function() {
      wifiManager.enabled = false;
      wifiManager.onstatuschange();
      assert.equal(wifiContext.wifiStatusText, 'disabled');
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
    setup(function() {
      this.sinon.spy(wifiManager, 'associate');
    });
    test('will bypass to wifiManager', function() {
      var fakeNetowrk = {};
      wifiContext.associateNetwork(fakeNetowrk);
      assert.isTrue(wifiManager.associate.calledWith(fakeNetowrk));
      assert.equal(wifiContext.currentNetwork, fakeNetowrk);
    });
  });
});
