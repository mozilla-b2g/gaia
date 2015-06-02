/* global Bluetooth, MockSettingsListener, Service, MockL10n,
   MockNavigatorSettings, MockNavigatormozSetMessageHandler,
   MockMozBluetooth, MockBTAdapter, MocksHelper, MockLazyLoader */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth_v2.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_icon.js');
requireApp('system/js/bluetooth_transfer_icon.js');
requireApp('system/js/bluetooth_headphone_icon.js');
require('/shared/test/unit/mocks/mock_l10n.js');

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

suite('system/bluetooth_v2', function() {
  var realSetMessageHandler;
  var realSettings;
  var realSettingsListener;
  var realMozBluetooth;
  var realL10n;
  mocksForBluetooth.attachTestHelpers();

  suiteSetup(function(done) {
    MockLazyLoader.mLoadRightAway = true;
    sinon.spy(MockLazyLoader, 'load');

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    requireApp('system/js/bluetooth_v2.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    window.SettingsListener = realSettingsListener;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    // instanciate bluetooth module
    window.Bluetooth = new window.Bluetooth2();
  });

  suite('setProfileConnected', function() {
    var profiles = ['hfp', 'opp', 'a2dp', 'sco'];
    setup(function() {
      this.sinon.spy(window, 'dispatchEvent');
      Bluetooth.icon = { update: function() {} };
      this.sinon.stub(Bluetooth.icon, 'update');
    });

    test('nothing is called when wasConnected', function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = true;
        Bluetooth._setProfileConnected(profile, true);
        assert.isFalse(window.dispatchEvent.called);
        assert.isFalse(Bluetooth.icon.update.called);
      });
    });

    test('event is dispatched, Bluetooth icon is updated when disconnected',
         function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = true;
        Bluetooth._setProfileConnected(profile, false);
        assert.ok(window.dispatchEvent.called);
        assert.isTrue(Bluetooth.icon.update.called);
      });
    });

    test('event is dispatched, Bluetooth icon is updated when first connect',
         function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = false;
        Bluetooth._setProfileConnected(profile, true);
        assert.ok(window.dispatchEvent.called);
        assert.isTrue(Bluetooth.icon.update.called);
      });
    });

    test('event is dispatched with right detail object', function(done) {
      Bluetooth._oppConnected = false;
      var handler = function(evt) {
        assert.equal(evt.detail.name, 'opp');
        assert.isTrue(evt.detail.connected);
        done();
      };
      var bindHandler = handler.bind(this);
      window.addEventListener('bluetoothprofileconnectionchange',
        bindHandler);
      Bluetooth._setProfileConnected('opp', true);
      window.removeEventListener('bluetoothprofileconnectionchange',
        bindHandler);
    });

    test('transferIcon is not updated with non-OPP profile',
      function() {
        Bluetooth.transferIcon = { update: function() {} };
        this.sinon.stub(Bluetooth.transferIcon, 'update');
        Bluetooth._setProfileConnected('hfp', false);
        assert.isFalse(Bluetooth.transferIcon.update.called);
        Bluetooth._setProfileConnected('a2dp', false);
        assert.isFalse(Bluetooth.transferIcon.update.called);
        Bluetooth._setProfileConnected('sco', false);
    });

    test('transferIcon is updated with OPP profile', function() {
      Bluetooth.transferIcon = { update: function() {} };
      this.sinon.stub(Bluetooth.transferIcon, 'update');
      Bluetooth._setProfileConnected('opp', false);
      assert.isTrue(Bluetooth.transferIcon.update.called);
      Bluetooth._setProfileConnected('opp', true);
      assert.isTrue(Bluetooth.transferIcon.update.calledTwice);
    });
  });

  suite('isProfileConnected', function() {
    var profiles = ['hfp', 'opp', 'a2dp', 'sco'];

    test('return true when profile is connected', function() {
      profiles.forEach(function(profile) {
        Bluetooth['_' + profile + 'Connected'] = false;
      });
      profiles.forEach(function(profile) {
        assert.isFalse(Bluetooth._isProfileConnected(profile));
      });
    });

    test('return true when profile is connected', function() {
      profiles.forEach(function(profile) {
        Bluetooth['_' + profile + 'Connected'] = true;
      });
      profiles.forEach(function(profile) {
        assert.ok(Bluetooth._isProfileConnected(profile));
      });
    });
  });

  suite('Initialize', function() {
    setup(function() {
      this.sinon.spy(navigator.mozBluetooth, 'addEventListener');
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      this.sinon.stub(Bluetooth, '_initDefaultAdapter');
      this.sinon.spy(window, 'addEventListener');
      this.sinon.spy(window, 'dispatchEvent');
      this.sinon.spy(Service, 'register');
      this.sinon.spy(Service, 'registerState');
      window.BluetoothTransfer = { start: function() {} };
      Bluetooth.start();
    });

    test('initDefaultAdapter is called', function() {
      assert.ok(Bluetooth._initDefaultAdapter.called);
    });

    test('listener called', function() {
      assert.ok(navigator.mozBluetooth.addEventListener.
        calledWith('attributechanged'));
      assert.ok(window.addEventListener
        .calledWith('request-enable-bluetooth'));
      assert.ok(window.addEventListener
        .calledWith('request-disable-bluetooth'));
    });

    test('MessageHandler bluetooth-opp-transfer-start is called',
      function() {
        MockNavigatormozSetMessageHandler.mTrigger(
          'bluetooth-opp-transfer-start', {
            source: {
              data: {}
            }
        });

        assert.ok(Bluetooth._setProfileConnected.called);
        assert.ok(window.dispatchEvent.called);
    });

    test('MessageHandler bluetooth-opp-transfer-complete is called',
      function() {
        MockNavigatormozSetMessageHandler.mTrigger(
          'bluetooth-opp-transfer-complete', {
            source: {
              data: {}
            }
        });

        assert.ok(Bluetooth._setProfileConnected.called);
        assert.ok(window.dispatchEvent.called);
    });

    test('register request', function() {
      assert.ok(Service.register.calledWith('adapter'));
      assert.ok(Service.register.calledWith('pair'));
      assert.ok(Service.register.calledWith('getPairedDevices'));
    });

    test('register state', function() {
      assert.ok(Service.registerState.calledWith('isEnabled'));
      assert.ok(Service.registerState.calledWith('getAdapter'));
      assert.ok(Service.registerState.calledWith('isOPPProfileConnected'));
      assert.ok(Service.registerState.calledWith('isA2DPProfileConnected'));
      assert.ok(Service.registerState.calledWith('isSCOProfileConnected'));
    });

    test('Should lazy load icons', function() {
      assert.isTrue(MockLazyLoader.load.calledWith(
        ['js/bluetooth_transfer.js',
        'js/bluetooth_icon.js',
        'js/bluetooth_transfer_icon.js',
        'js/bluetooth_headphone_icon.js']
      ));
    });
  });

  suite('initDefaultAdapter', function() {
    setup(function() {
      this.sinon.stub(Bluetooth, '_dispatchEnableState');
      Bluetooth._bluetooth = MockMozBluetooth;
    });

    test('defaultAdapter is available', function() {
      Bluetooth._bluetooth.defaultAdapter = MockBTAdapter;
      Bluetooth._initDefaultAdapter();

      assert.equal(Bluetooth._adapter, navigator.mozBluetooth.defaultAdapter);
      assert.ok(Bluetooth._dispatchEnableState.called);
    });

    test('defaultAdapter is not available', function() {
      Bluetooth._bluetooth.defaultAdapter = null;
      Bluetooth._initDefaultAdapter();

      assert.equal(Bluetooth._adapter, null);
    });
  });

  suite('Adapter Available Handler', function() {
    setup(function() {
      Bluetooth._adapter = MockBTAdapter;
      this.sinon.stub(Bluetooth._adapter, 'addEventListener');
      Bluetooth._adapterAvailableHandler();
    });

    test('return true when profile is connected', function() {
      assert.ok(MockBTAdapter.addEventListener.
        calledWith('attributechanged'));
      assert.ok(MockBTAdapter.addEventListener
        .calledWith('hfpstatuschanged'));
      assert.ok(MockBTAdapter.addEventListener
        .calledWith('a2dpstatuschanged'));
      assert.ok(MockBTAdapter.addEventListener
        .calledWith('scostatuschanged'));
    });
  });

  suite('Adapter Unavailable Handler', function() {
    setup(function() {
      Bluetooth._adapter = MockBTAdapter;
      this.sinon.stub(Bluetooth._adapter, 'removeEventListener');
      Bluetooth._adapterUnavailableHandler();
    });

    test('removeEventListener is called', function() {
      assert.ok(Bluetooth._adapter.removeEventListener
        .calledWith('hfpstatuschanged'));
      assert.ok(Bluetooth._adapter.removeEventListener
        .calledWith('a2dpstatuschanged'));
      assert.ok(Bluetooth._adapter.removeEventListener
        .calledWith('scostatuschanged'));
      assert.ok(Bluetooth._adapter.removeEventListener
        .calledWith('attributechanged'));
    });
  });

  suite('handle Bluetooth states', function() {
    setup(function() {
      this.sinon.spy(Bluetooth, '_requestEnableHandler');
      this.sinon.spy(Bluetooth, '_requestDisableHandler');
      this.sinon.spy(Bluetooth, '_dispatchEnableState');
      this.sinon.stub(Bluetooth, '_initDefaultAdapter');

      this.sinon.stub(MockBTAdapter, 'enable', function() {
        return { then: function(resolve) { resolve(); } };
      });
      this.sinon.stub(MockBTAdapter, 'disable', function() {
        return { then: function(resolve) { resolve(); } };
      });
    });

    test('request-enable-bluetooth is called', function() {
      Bluetooth._adapter = MockBTAdapter;
      Bluetooth.start();
      window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));

      assert.ok(Bluetooth._requestEnableHandler.called);
      assert.ok(MockBTAdapter.enable.called);
    });

    test('request-enable-bluetooth is called when adapter is not available',
      function() {
        Bluetooth._adapter = null;
        Bluetooth.start();
        window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));

        assert.ok(Bluetooth._dispatchEnableState.called);
    });

    test('request-disable-bluetooth is called', function() {
      Bluetooth._adapter = MockBTAdapter;
      Bluetooth.start();
      window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));

      assert.ok(Bluetooth._requestDisableHandler.called);
      assert.ok(MockBTAdapter.disable.called);
    });

    test('request-disable-bluetooth is called when adapter is not available',
      function() {
        Bluetooth._adapter = null;
        Bluetooth.start();

        window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));
        assert.ok(Bluetooth._dispatchEnableState.called);
    });
  });

  suite('bluetoothAdapterHandler', function() {
    setup(function() {
      this.sinon.spy(MockNavigatorSettings, 'createLock');
      this.sinon.stub(window, 'dispatchEvent');
      Bluetooth._adapter = MockBTAdapter;
      Bluetooth.icon = { update: function() {} };
      this.sinon.stub(Bluetooth.icon, 'update');
    });

    teardown(function() {
      Bluetooth._adapter = null;
      Bluetooth.icon = null;
    });

    test('bluetooth state is enabled', function() {
      Bluetooth._adapter.state = 'enabled';
      Bluetooth._btAdapterHandler({attrs: ['state']});

      assert.isTrue(Bluetooth._isEnabled);
      assert.ok(window.dispatchEvent.called);
      assert.ok(Bluetooth.icon.update.called);
    });

    test('bluetooth state is disabled', function() {
      Bluetooth._adapter.state = 'disabled';
      Bluetooth._btAdapterHandler({attrs: ['state']});

      assert.isFalse(Bluetooth._isEnabled);
      assert.ok(window.dispatchEvent.called);
      assert.ok(Bluetooth.icon.update.called);
    });
  });

  suite('btManagerHandler', function() {
    setup(function() {
      this.sinon.stub(Bluetooth, '_adapterUnavailableHandler');
      Bluetooth._bluetooth = window.navigator.mozBluetooth;
    });

    teardown(function() {
      Bluetooth._adapter = null;
      MockBTAdapter.state = '';
    });

    test('default adapter and state are updated when defaultAdapter' +
      'is changed', function() {
        var evt = {
          attrs: ['defaultAdapter']
        };
        MockMozBluetooth.defaultAdapter = MockBTAdapter;
        MockBTAdapter.state = 'enabled';
        Bluetooth._btManagerHandler(evt);

        assert.equal(Bluetooth._adapter, MockBTAdapter);
        assert.ok(Bluetooth._isEnabled, true);
    });

    test('functions are not called when defaultAdapter is null',
      function() {
        var evt = {
          attrs: ['defaultAdapter']
        };
        MockMozBluetooth.defaultAdapter = null;
        Bluetooth._btManagerHandler(evt);

        assert.equal(Bluetooth._adapter, null);
        assert.ok(Bluetooth._adapterUnavailableHandler.called);
    });

    test('functions are not called when no matched attribute',
      function() {
        var evt = {
          attrs: []
        };
        MockMozBluetooth.defaultAdapter = null;
        Bluetooth._btManagerHandler(evt);

        assert.equal(Bluetooth._adapter, null);
        assert.ok(!Bluetooth._adapterUnavailableHandler.called);
    });
  });

  suite('oppTransferStartHandler', function() {
    test('event is dispatched with right detail object', function(done) {
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      var transferInfo = this.sinon.stub();
      var handler = function(evt) {
        assert.equal(evt.detail.transferInfo, transferInfo);
        done();
      };
      var bindHandler = handler.bind(this);
      window.addEventListener('bluetooth-opp-transfer-start',
        bindHandler);
      Bluetooth._oppTransferStartHandler(transferInfo);
      assert.ok(Bluetooth._setProfileConnected.called);
      window.removeEventListener('bluetooth-opp-transfer-start',
        bindHandler);
    });
  });

  suite('oppTransferCompleteHandler', function() {
    test('event is dispatched with right detail object', function(done) {
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      var transferInfo = this.sinon.stub();
      var handler = function(evt) {
        assert.equal(evt.detail.transferInfo, transferInfo);
        done();
      };
      var bindHandler = handler.bind(this);
      window.addEventListener('bluetooth-opp-transfer-complete',
        bindHandler);
      Bluetooth._oppTransferCompleteHandler(transferInfo);
      assert.ok(Bluetooth._setProfileConnected.called);
      window.removeEventListener('bluetooth-opp-transfer-complete',
        bindHandler);
    });
  });

  suite('service requests', function() {
    test('request the adapter', function() {
      Bluetooth._adapter = MockBTAdapter;
      Service.request('Bluetooth:adapter').then(function(value) {
        assert.equal(value, Bluetooth._adapter);
      });
    });

    test('request pair', function() {
      Bluetooth._adapter = MockBTAdapter;
      var mac = '01:23:45:67:89:AB';
      this.sinon.spy(MockBTAdapter, 'pair');
      Service.request('Bluetooth:pair', mac).then(function() {
        assert.ok(MockBTAdapter.pair.calledWith(mac));
      });
    });

    test('request getPairedDevices', function() {
      Bluetooth._adapter = MockBTAdapter;
      this.sinon.spy(MockBTAdapter, 'getPairedDevices');
      Service.request('Bluetooth:getPairedDevices')
        .then(function() {
          assert.ok(MockBTAdapter.getPairedDevices.called);
      });
    });
  });
});
