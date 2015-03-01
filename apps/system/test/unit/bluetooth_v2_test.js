/* global Bluetooth, MockSettingsListener, Service,
   MockNavigatorSettings, MockNavigatormozSetMessageHandler,
   MockMozBluetooth, MockBTAdapter, MocksHelper, MockLazyLoader */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth_v2.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/bluetooth_icon.js');
requireApp('system/js/bluetooth_transfer_icon.js');
requireApp('system/js/bluetooth_headphone_icon.js');

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
  mocksForBluetooth.attachTestHelpers();

  suiteSetup(function(done) {
    sinon.spy(MockLazyLoader, 'load');
    MockLazyLoader.mLoadRightAway = true;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    requireApp('system/js/bluetooth_v2.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    window.SettingsListener = realSettingsListener;
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
  });

  setup(function() {
    // instanciate bluetooth module
    window.Bluetooth = new window.Bluetooth2();
  });

  suite('default variables', function() {
    test('profiles', function() {
      assert.equal(Bluetooth.Profiles.HFP, 'hfp');
      assert.equal(Bluetooth.Profiles.OPP, 'opp');
      assert.equal(Bluetooth.Profiles.A2DP, 'a2dp');
      assert.equal(Bluetooth.Profiles.SCO, 'sco');
    });
  });

  suite('setProfileConnected', function() {
    var profiles = ['hfp', 'opp', 'a2dp', 'sco'];
    setup(function() {
      this.sinon.stub(window, 'dispatchEvent');
    });

    test('nothing is called when wasConnected', function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = true;
        Bluetooth._setProfileConnected(profile, true);
        assert.isFalse(window.dispatchEvent.called);
      });
    });

    test('event is dispatched when disconnected', function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = true;
        Bluetooth._setProfileConnected(profile, false);
        assert.ok(window.dispatchEvent.called);
      });
    });

    test('event is dispatched when first connect', function() {
      profiles.forEach(function(profile){
        Bluetooth['_' + profile + 'Connected'] = false;
        Bluetooth._setProfileConnected(profile, true);
        assert.ok(window.dispatchEvent.called);
      });
    });
  });

  suite('isProfileConnected', function() {
    var profiles = ['hfp', 'opp', 'a2dp', 'sco'];

    test('return true when profile is connected', function() {
      profiles.forEach(function(profile) {
        Bluetooth['_' + profile + 'Connected'] = false;
      });
      profiles.forEach(function(profile) {
        assert.isFalse(Bluetooth.isProfileConnected(profile));
      });
    });

    test('return true when profile is connected', function() {
      profiles.forEach(function(profile) {
        Bluetooth['_' + profile + 'Connected'] = true;
      });
      profiles.forEach(function(profile) {
        assert.ok(Bluetooth.isProfileConnected(profile));
      });
    });
  });

  suite('updateProfileStat', function() {
    setup(function() {
      this.sinon.stub(MockBTAdapter, 'addEventListener');
      Bluetooth._updateProfileStat(MockBTAdapter);
    });

    test('return true when profile is connected', function() {
      assert.ok(MockBTAdapter.addEventListener.calledWith('hfpstatuschanged'));
      assert.ok(MockBTAdapter.addEventListener.calledWith('a2dpstatuschanged'));
      assert.ok(MockBTAdapter.addEventListener.calledWith('scostatuschanged'));
    });
  });

  suite('Initialize', function() {
    setup(function() {
      this.sinon.spy(navigator.mozBluetooth, 'addEventListener');
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      this.sinon.spy(window, 'addEventListener');
      this.sinon.spy(window, 'dispatchEvent');
      this.sinon.stub(Service, 'registerState');
      Bluetooth.start();
    });

    test('defaultAdapter is called', function() {
      assert.equal(Bluetooth._adapter, navigator.mozBluetooth.defaultAdapter);
    });

    test('listener called', function() {
      assert.equal(MockSettingsListener.mName, 'bluetooth.enabled');
      assert.ok(window.navigator.mozBluetooth
        .addEventListener.calledWith('adapterremoved'));
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

    test('register state', function() {
      assert.ok(Service.registerState.calledWith('isEnabled'));
    });

    // test('Should lazy load icons', function() {
    //   assert.isTrue(MockLazyLoader.load.calledWith(
    //     ['js/bluetooth_icon.js',
    //     'js/bluetooth_transfer_icon.js',
    //     'js/bluetooth_headphone_icon.js']
    //   ));
    // });

    // test('Update bluetooth icon when bluetooth is enabled', function() {
    //   this.sinon.stub(Bluetooth.icon, 'update');
    //   MockMozBluetooth.triggerEventListeners('enabled');
    //   assert.isTrue(Bluetooth.icon.update.called);
    // });

    // test('Update bluetooth icon when bluetooth is disabled', function() {
    //   this.sinon.stub(Bluetooth.icon, 'update');
    //   MockMozBluetooth.triggerEventListeners('disabled');
    //   assert.isTrue(Bluetooth.icon.update.called);
    // });

    // test('Update transfer icon on system message', function() {
    //   this.sinon.stub(Bluetooth.transferIcon, 'update');
    //   MockNavigatormozSetMessageHandler.mTrigger(
    //     'bluetooth-opp-transfer-start', {});
    //   assert.isTrue(Bluetooth.transferIcon.update.called);
    //   MockNavigatormozSetMessageHandler.mTrigger(
    //     'bluetooth-opp-transfer-complete', {});
    //   assert.isTrue(Bluetooth.transferIcon.update.calledTwice);
    // });

    // test('Update headset icon on adapter notifying', function() {
    //   this.sinon.stub(Bluetooth.headphoneIcon, 'update');
    //   MockMozBluetooth.triggerOnGetAdapterSuccess();
    //   MockBTAdapter.ona2dpstatuschanged({status: true});
    //   assert.isTrue(Bluetooth.headphoneIcon.update.called);
    //   MockBTAdapter.ona2dpstatuschanged({status: false});
    //   assert.isTrue(Bluetooth.headphoneIcon.update.calledTwice);
    // });
  });

  suite('handle Bluetooth states', function() {
    setup(function() {
      this.sinon.spy(Bluetooth, '_enableHandler');
      this.sinon.spy(Bluetooth, '_disableHandler');
      this.sinon.spy(Bluetooth, '_updateProfileStat');
      this.sinon.spy(MockNavigatorSettings, 'createLock');
      this.sinon.stub(Bluetooth, 'getAdapter', function() {
        return { then: function(resolve) { resolve(MockBTAdapter); } };
      });
      this.sinon.stub(MockBTAdapter, 'enable', function() {
        return { then: function(resolve) { resolve(); } };
      });
      this.sinon.stub(MockBTAdapter, 'disable', function() {
        return { then: function(resolve) { resolve(); } };
      });
      Bluetooth.start();
    });

    test('request-enable-bluetooth is called', function() {
      window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));
      assert.ok(Bluetooth._enableHandler.called);
      assert.ok(MockBTAdapter.enable.called);
      assert.ok(Bluetooth._updateProfileStat.called);
      assert.ok(MockNavigatorSettings.createLock.called);
    });

    test('request-disable-bluetooth is called', function() {
      window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));
      assert.ok(Bluetooth._disableHandler.called);
      assert.ok(MockBTAdapter.disable.called);
      assert.ok(MockNavigatorSettings.createLock.called);
    });
  });

  suite('getAdapter', function() {
    setup(function() {
      this.sinon.spy(MockMozBluetooth, 'addEventListener');
      this.sinon.stub(Bluetooth, '_bluetoothAttrChangeHandler');
      Bluetooth._bluetooth = window.navigator.mozBluetooth;
    });

    test('addEventListener is called when adapter is not ready', function() {
      Bluetooth._adapter = null;
      Bluetooth.getAdapter();
      assert.equal(Bluetooth._adapter, null);
      assert.ok(MockMozBluetooth.addEventListener
        .calledWith('attributechanged'));
    });

    test('addEventListener is not called when adapter is ready', function() {
      Bluetooth._adapter = MockBTAdapter;
      Bluetooth.getAdapter();
      assert.ok(!MockMozBluetooth.addEventListener.called);
      assert.equal(Bluetooth._adapter, MockBTAdapter);
    });
  });

  suite('_bluetoothAttrChangeHandler', function() {
    setup(function() {
      this.sinon.stub(Bluetooth, '_updateProfileStat');
      Bluetooth._bluetooth = window.navigator.mozBluetooth;
    });

    teardown(function() {
      Bluetooth._adapter = null;
    });

    test('updateProfileStat is called when defaultAdapter is matched',
      function() {
        var evt = {
          attrs: ['defaultAdapter']
        };
        MockMozBluetooth.defaultAdapter = MockBTAdapter;
        Bluetooth._bluetoothAttrChangeHandler(evt);
        assert.equal(Bluetooth._adapter, MockBTAdapter);
        assert.ok(Bluetooth._updateProfileStat.called);
    });

    test('addEventListener is not called when no matched attribute',
      function() {
        var evt = {
          attrs: []
        };
        MockMozBluetooth.defaultAdapter = null;
        Bluetooth._bluetoothAttrChangeHandler(evt);
        assert.equal(Bluetooth._adapter, null);
        assert.isFalse(Bluetooth._updateProfileStat.called);
    });
  });
});
