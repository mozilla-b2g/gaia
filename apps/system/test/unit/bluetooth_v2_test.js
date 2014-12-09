/* global Bluetooth, Bluetooth2, MockSettingsListener,
   MockNavigatorSettings, MockNavigatormozSetMessageHandler,
   MockMozBluetooth, MockBTAdapter */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth_v2.js');
requireApp('system/js/service.js');

suite('system/bluetooth_transfer_v2', function() {
  var realSetMessageHandler;
  var realSettings;
  var realSettingsListener;
  var realMozBluetooth;

  suiteSetup(function(done) {
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return MockMozBluetooth;
      }
    });

    MockNavigatormozSetMessageHandler.mSetup();
    requireApp('system/js/bluetooth_v2.js', done);
  });

  suiteTeardown(function() {
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    window.SettingsListener = realSettingsListener;
    Object.defineProperty(navigator, 'mozBluetooth', {
      configurable: true,
      get: function() {
        return realMozBluetooth;
      }
    });
  });

  setup(function() {
    window.Bluetooth = window.Bluetooth2;
    // this.sinon.useFakeTimers();
  });

  // teardown(function() {
  //   this.sinon.clock.restore();
  // });

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
      // this.sinon.stub(navigator.mozBluetooth, 'onattributechanged');
      // this.sinon.stub(Bluetooth2, 'isProfileConnected', function() {
      //   return true;
      // });
      // var adapter = Bluetooth2.getAdapter();
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

  suite('Initialize', function() {
    setup(function() {
      this.sinon.spy(navigator.mozBluetooth, 'addEventListener');
      this.sinon.stub(Bluetooth, '_initDefaultAdapter');
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      this.sinon.spy(window, 'addEventListener');
      this.sinon.stub(window, 'dispatchEvent');
      // this.sinon.stub(Bluetooth, '_adapterAddedHandler');
      Bluetooth.start();
    });

    test('listener called', function() {
      assert.equal(MockSettingsListener.mName, 'bluetooth.enabled');
      assert.ok(window.navigator.mozBluetooth
        .addEventListener.calledWith('adapteradded'));
      assert.ok(window.navigator.mozBluetooth
        .addEventListener.calledWith('adapterremoved'));
      assert.ok(window.addEventListener
        .calledWith('request-enable-bluetooth'));
      assert.ok(window.addEventListener
        .calledWith('request-disable-bluetooth'));
    });

    // test ('adapterAddedHandler is called when bluetooth adapter is added',
    //   function() {
    //     window.navigator.mozBluetooth.dispatchEvent(
    //       new CustomEvent('adapteradded'));
    //     assert.ok(Bluetooth._adapterAddedHandler.isCalled);
    // });

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

    test('function called', function() {
      assert.ok(Bluetooth._initDefaultAdapter.called);
    });
  });

  suite('handleEvent', function() {
    setup(function() {
      this.sinon.spy(navigator.mozBluetooth, 'addEventListener');
      this.sinon.spy(window, 'addEventListener');
      this.sinon.spy(window, 'dispatchEvent');
      this.sinon.stub(Bluetooth, '_initDefaultAdapter');
      this.sinon.stub(Bluetooth, '_setProfileConnected');
      this.sinon.stub(MockBTAdapter, 'enable', function() {
        return new Promise(function(resolve) {
          resolve();
        });
      });
      this.sinon.stub(Bluetooth, 'getAdapter', function() {
        return new Promise(function(resolve) {
          resolve(MockBTAdapter);
        });
      });
      Bluetooth.start();
    });

    test('request-enable-bluetooth is called', function() {
      window.dispatchEvent(new CustomEvent('request-enable-bluetooth'));
      assert.ok(Bluetooth.getAdapter.called);
      // this.sinon.clock.tick();
      // assert.ok(MockBTAdapter.enable.called);
      // assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
      //   true);
    });

    test('request-disable-bluetooth is called', function() {
      window.dispatchEvent(new CustomEvent('request-disable-bluetooth'));
      assert.ok(Bluetooth.getAdapter.called);
    //   // this.sinon.clock.tick();
    //   assert.equal(MockNavigatorSettings.mSettings['bluetooth.enabled'],
    //     false);
    });
  });

  suite('initDefaultAdapter', function() {
    setup(function() {
      this.sinon.stub(Bluetooth, '_updateProfileStat');
      this.sinon.stub(Bluetooth, 'getAdapter', function() {
        return new Promise(function(resolve) {
          resolve(MockBTAdapter);
        });
      });
      Bluetooth2._initDefaultAdapter();
    });

    test('getAdapter is called', function() {
      assert.ok(Bluetooth.getAdapter.called);
    });

    // test('_updateProfileStat is called', function() {
    //   assert.ok(Bluetooth._updateProfileStat.called);
    // });
  });

  suite('getAdapter', function() {
    setup(function() {
      // this.sinon.stub(Bluetooth, '_updateProfileStat');
      // this.sinon.stub(Bluetooth, 'getAdapter', function() {
      //   return new Promise(function(resolve) {
      //     resolve(MockBTAdapter);
      //   });
      // });
      // this.sinon.stub(MockBTAdapter, 'onhfpstatuschanged');
      // this.sinon.stub(MockBTAdapter, 'ona2dpstatuschanged');
      // this.sinon.stub(MockBTAdapter, 'onscostatuschanged');
      // this.sinon.stub(Bluetooth, '_setProfileConnected');
      // Bluetooth2._updateProfileStat(MockBTAdapter);
    });

    test('statuschanged is called', function() {
      // window.dispatchEvent(new CustomEvent(''));
      // assert.ok(MockBTAdapter.onhfpstatuschanged.called);
      // assert.ok(MockBTAdapter.ona2dpstatuschanged.called);
      // assert.ok(MockBTAdapter.onscostatuschanged.called);
    });
  });
});
