/* global MockL10n, MockNavigatormozSetMessageHandler, MockNavigatorSettings,
   MockNavigatormozApps, MockMozBluetooth */

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

suite('Bluetooth app > PairManager ', function() {
  var realL10n;
  var realSetMessageHandler;
  var realMozSettings;
  var realMozApps;
  var realMozBluetooth;
  var AdapterManager;
  var BtContext;
  var PairManager;
  var PairExpiredDialog;
  var Pairview;

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozBluetooth = navigator.mozBluetooth;
    switchReadOnlyProperty(navigator, 'mozBluetooth', MockMozBluetooth);

    MockNavigatormozSetMessageHandler.mSetup();

    var modules = [
      'unit/mock_pair_expired_dialog',
      'unit/mock_pair_view',
      'modules/bluetooth/bluetooth_adapter_manager',
      'modules/bluetooth/bluetooth_context',
      'modules/pair_manager'
    ];

    var maps = {
      '*': {
        'views/pair_expired_dialog': 'unit/mock_pair_expired_dialog',
        'modules/bluetooth/bluetooth_adapter_manager': 'MockAdapterManager',
        'modules/bluetooth/bluetooth_context': 'MockBluetoothContext'
      }
    };

    this.MockAdapterManager = {
      defaultAdapter: {},
      observe: function() {}
    };

    define('MockAdapterManager', function() {
      return this.MockAdapterManager;
    }.bind(this));

    this.MockBluetoothContext = {
      callbacks: {
        'enabled': []
      },
      observe: function(eventName, callback) {
        this.callbacks[eventName].push(callback);
      }
    };

    define('MockBluetoothContext', function() {
      return this.MockBluetoothContext;
    }.bind(this));

    var requireCtx = testRequire([], maps, function() {});
    requireCtx(modules, function(pairExpiredDialog, pairview, adapterManager, 
                                 btContext, pairManager) {
      PairExpiredDialog = pairExpiredDialog;
      Pairview = pairview;
      AdapterManager = adapterManager;
      BtContext = btContext;
      PairManager = pairManager;
      done();
    }.bind(this));
  });

  suiteTeardown(function() {
    MockNavigatormozApps.mTeardown();
    switchReadOnlyProperty(navigator, 'mozBluetooth', realMozBluetooth);
    navigator.mozApps = realMozApps;
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozL10n = realL10n;
  });

  suite('init > ', function() {
    setup(function() {
      this.sinon.stub(AdapterManager, 'observe');
      this.sinon.spy(BtContext, 'observe');
      this.sinon.stub(PairManager, '_onDefaultAdapterChanged');
      this.sinon.stub(PairManager, '_watchOndisplaypasskeyreq');
      this.sinon.stub(PairManager, '_watchOnenterpincodereq');
      this.sinon.stub(PairManager, '_watchOnpairingconfirmationreq');
      this.sinon.stub(PairManager, '_watchOnpairingconsentreq');
      this.sinon.stub(PairManager, '_watchOnpairingaborted');
      this.sinon.stub(PairManager, '_onRequestPairingFromSystemMessage');
      this.sinon.stub(PairManager, 'showPendingPairing');
      this.sinon.stub(PairManager, 'onBluetoothDisabled');
      PairManager.init();
    });

    teardown(function() {
      MockNavigatorSettings.mTeardown();
    });

    suite('observe "defaultAdapter" from AdapterManager > ', function() {
      test('AdapterManager "defaultAdapter" property should be observed, ' +
           'and access defaultAdapter from AdapterManager manually ', 
      function() {
        assert.isTrue(AdapterManager.observe.calledWith('defaultAdapter'));
        assert.isTrue(PairManager._onDefaultAdapterChanged.calledWith(
          AdapterManager.defaultAdapter));
      });
    });

    suite('should watch pairing request events from dom event > ', function() {
      test('"_watchOndisplaypasskeyreq", "_watchOnenterpincodereq", ' +
           '"_watchOnpairingconfirmationreq", "_watchOnpairingconsentreq", ' +
           '"_watchOnpairingaborted" should be called ', function() {
        assert.isTrue(PairManager._watchOndisplaypasskeyreq.called);
        assert.isTrue(PairManager._watchOnenterpincodereq.called);
        assert.isTrue(PairManager._watchOnpairingconfirmationreq.called);
        assert.isTrue(PairManager._watchOnpairingconsentreq.called);
        assert.isTrue(PairManager._watchOnpairingaborted.called);
      });
    });

    suite('fire "bluetooth-pairing-request" event > ', function() {
      var message, eventName;
      setup(function() {
        message = {};
        eventName = 'bluetooth-pairing-request';
        MockNavigatormozSetMessageHandler.mTrigger(eventName, message);
      });

      test('handle event with _onRequestPairingFromSystemMessage()',
      function() {
        assert.isTrue(
          PairManager._onRequestPairingFromSystemMessage.calledWith(message),
        'the "_onRequestPairingFromSystemMessage" should be called with ' +
        '"message" object after received "bluetooth-pairing-request" event ');
      });
    });

    suite('screen locked status change > ', function() {
      var lockscreenKey = 'lockscreen.locked';
      setup(function() {
        MockNavigatorSettings.mTriggerObservers(lockscreenKey,
                                                {settingValue: false});
      });

      test('observes settings key "lockscreen.locked"', function() {
        assert.equal(MockNavigatorSettings.mObservers[lockscreenKey].length, 1);
      });

      test('showPendingPairing() should be called with arg event while ' +
           'lockscreen.locked settings key value changed ', function() {
        assert.isTrue(PairManager.showPendingPairing.calledWith(false));
      });
    });

    suite('observe "enabled" from BtContext > ', function() {
      var property;
      setup(function() {
        property = 'enabled';
      });
      test('BtContext "enabled" property should be observed, ' +
           'onBluetoothDisabled() should be called ' +
           'while BtContext "enabled" property changed to false ', function() {
        assert.isTrue(BtContext.observe.calledWith(property));
        BtContext.callbacks[property][0](false);
        assert.isTrue(PairManager.onBluetoothDisabled.called);
      });

      test('onBluetoothDisabled() should not be called ' +
           'while BtContext "enabled" property changed to true ', function() {
        BtContext.callbacks[property][0](true);
        assert.isFalse(PairManager.onBluetoothDisabled.called);
      });
    });
  });

  suite('_onDefaultAdapterChanged > ', function() {
    var mockNewAdapter;
    setup(function() {
      mockNewAdapter = {};
      PairManager._defaultAdapter = null;
    });

    test('_defaultAdapter should be defined ', function() {
      PairManager._onDefaultAdapterChanged(mockNewAdapter);
      assert.equal(PairManager._defaultAdapter, mockNewAdapter);
    });
  });

  suite('_watchOndisplaypasskeyreq > ', function() {
    setup(function() {
      PairManager._defaultAdapter = {
        pairingReqs: {
          ondisplaypasskeyreq: null
        }
      };
    });

    test('pairingReqs.ondisplaypasskeyreq should be accessed with callback',
    function() {
      PairManager._watchOndisplaypasskeyreq();
      assert.isDefined(
        PairManager._defaultAdapter.pairingReqs.ondisplaypasskeyreq);
    });
  });

  suite('_watchOnpairingaborted > ', function() {
    var mockDefaultAdapter, mockEvent;
    setup(function() {
      mockDefaultAdapter = {
        addEventListener: function() {}
      };
      PairManager._defaultAdapter = mockDefaultAdapter;
      this.sinon.stub(PairManager._defaultAdapter, 'addEventListener');
      this.sinon.stub(PairManager, '_onPairingAborted');
      mockEvent = {};
    });

    test('_defaultAdapter.onpairingaborted should be registered callback ' +
         'function ', function() {
      PairManager._watchOnpairingaborted();
      assert.equal(PairManager._defaultAdapter.addEventListener.args[0][0],
        'pairingaborted');
      PairManager._defaultAdapter.addEventListener.args[0][1](mockEvent);
      assert.isTrue(PairManager._onPairingAborted.calledWith(mockEvent));
    });
  });

  suite('_onPairingAborted > ', function() {
    var mockEvent;
    setup(function() {
      this.sinon.stub(Pairview, 'closeInput');
      PairManager.pendingPairing = {};
      PairManager.childWindow = {
        Pairview: Pairview,
        close: this.sinon.spy()
      };
      switchReadOnlyProperty(PairExpiredDialog, 'isVisible', true);
      this.sinon.stub(PairExpiredDialog, 'close');
      this.sinon.stub(window, 'close');
    });

    test('Pairview.closeInput() should be called, childWindow should be close' +
         'window.close() should be called, pendingPairing should be null, ' +
         'PairExpiredDialog.close() should be called ', function() {
        PairManager._onPairingAborted(mockEvent);
        assert.isTrue(PairManager.childWindow.Pairview.closeInput.called);
        assert.isTrue(PairManager.childWindow.close.called);
        assert.isNull(PairManager.pendingPairing);
        assert.isTrue(PairExpiredDialog.close.called);
        assert.isTrue(window.close.called);
    });
  });

  suite('_onRequestPairing > ', function() {
    var pairingInfo = {
      method: 'confirmation',
      evt: {}
    };
    suite('screen locked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'fireNotification');
        this.sinon.stub(PairManager, 'cleanPendingPairing');
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = true;
        PairManager._onRequestPairing(pairingInfo);
        setTimeout(done);
      });

      test('handle showPairview() from _onRequestPairing() ', function() {
        assert.isTrue(PairManager.fireNotification.calledWith(pairingInfo),
        'fireNotification() should be called after do _onRequestPairing() ' +
        'in screen lock mode');
        assert.isFalse(PairManager.cleanPendingPairing.called,
        'cleanPendingPairing() should not be called after do ' +
        '_onRequestPairing() in screen lock mode');
        assert.isFalse(PairManager.showPairview.called,
        'showPairview() should not be called after do _onRequestPairing() ' +
        'in screen lock mode');
      });
    });

    suite('screen unlocked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'fireNotification');
        this.sinon.stub(PairManager, 'cleanPendingPairing');
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = false;
        PairManager._onRequestPairing(pairingInfo);
        setTimeout(done);
      });

      test('handle showPairview() from _onRequestPairing() ', function() {
        assert.isFalse(PairManager.fireNotification.called,
        'fireNotification() should not be called after ' +
        'do _onRequestPairing() in screen lock mode');
        assert.isTrue(PairManager.cleanPendingPairing.called,
        'cleanPendingPairing() should not be called after do ' +
        '_onRequestPairing() in screen lock mode');
        assert.isTrue(PairManager.showPairview.calledWith(pairingInfo),
        'showPairview() should be called after do onRequestPairing() ' +
        'in screen unlock mode');
      });
    });
  });

  suite('fireNotification > ', function() {
    var notificationStub, mockNotification, pairingInfo, titleResult,
      optionsResult;
    setup(function() {
      var _ = window.navigator.mozL10n.get;
      this.sinon.stub(PairManager, 'showPairview');
      this.sinon.stub(PairManager, 'pairingRequestExpiredNotificationHandler');
      mockNotification = {};
      notificationStub =
        this.sinon.stub(window, 'Notification').returns(mockNotification);

      PairManager.pendingPairing = null;
      pairingInfo = {
        evt: {
          deviceName: 'device-01'
        }
      };
      titleResult = _('bluetooth-pairing-request-now-title');
      optionsResult = {
        body: pairingInfo.evt.deviceName,
        icon: 'app://bluetooth.gaiamobile.org/style/images/icon_bluetooth.png',
        tag: 'pairing-request'
      };
    });

    test('pendingPairing, new and fired one notification, set notification ' +
      'onclick handler ', function() {
      PairManager.fireNotification(pairingInfo);
      assert.isDefined(PairManager.pendingPairing.showPairviewCallback);
      PairManager.pendingPairing.showPairviewCallback();
      assert.isTrue(PairManager.showPairview.calledWith(pairingInfo));
      assert.isTrue(notificationStub.calledOnce);
      assert.isTrue(notificationStub.calledWithNew());
      assert.equal(notificationStub.firstCall.args[0], titleResult);
      assert.deepEqual(notificationStub.firstCall.args[1], optionsResult);
      assert.isDefined(mockNotification.onclick);
      mockNotification.onclick();
      assert.isTrue(
        PairManager.pairingRequestExpiredNotificationHandler.called);
    });
  });

  suite('pairingRequestExpiredNotificationHandler > ', function() {
    var mockNotification;
    suite('screen locked mode > ', function() {
      setup(function(done) {
        mockNotification = {
          close: function() {/* do something */}
        };
        this.sinon.spy(mockNotification, 'close');
        this.sinon.stub(PairExpiredDialog, 'showConfirm');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = true;
        PairManager.pairingRequestExpiredNotificationHandler(mockNotification);
        setTimeout(done);
      });

      test('notification should not be close, pair expired dialog should not ' +
        'be show with confirmation', function() {
        assert.isFalse(mockNotification.close.called);
        assert.isFalse(PairExpiredDialog.showConfirm.called);
      });
    });

    suite('screen unlocked mode > ', function() {
      setup(function(done) {
        mockNotification = {
          close: function() {/* do something */}
        };
        this.sinon.spy(mockNotification, 'close');
        switchReadOnlyProperty(PairExpiredDialog, 'isVisible', false);
        this.sinon.stub(PairExpiredDialog, 'showConfirm');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = false;
        PairManager.pairingRequestExpiredNotificationHandler(mockNotification);
        setTimeout(done);
      });

      teardown(function() {
        mockNotification = null;
      });

      test('notification should be close, confirm dialog should be called ' +
        'if it is not visible', function() {
        assert.isTrue(mockNotification.close.called);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        assert.isTrue(PairExpiredDialog.showConfirm.called);
      });

      test('notification should be close, confirm dialog should not be called' +
        ' if it is visible', function() {
        switchReadOnlyProperty(PairExpiredDialog, 'isVisible', true);
        assert.isTrue(mockNotification.close.called);
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        assert.isFalse(PairExpiredDialog.showConfirm.called);
      });
    });
  });

  suite('showPendingPairing > ', function() {
    var cleanPendingPairingStub;
    suite('screen unlocked mode > with pending pairing', function() {
      setup(function() {
        cleanPendingPairingStub =
          sinon.stub(PairManager, 'cleanPendingPairing');
        PairManager.pendingPairing.showPairviewCallback = this.sinon.spy();
      });

      test('showPairviewCallback() should be called, cleanPendingPairing() ' +
        'should be called', function() {
          PairManager.showPendingPairing(false);
          assert.isTrue(PairManager.pendingPairing.showPairviewCallback.called);
          assert.isTrue(cleanPendingPairingStub.called);
          cleanPendingPairingStub.restore();
      });
    });

    suite('screen unlocked mode > without pending pairing', function() {
      setup(function() {
        cleanPendingPairingStub =
          sinon.stub(PairManager, 'cleanPendingPairing');
        PairManager.pendingPairing = null;
      });

      test('showPairviewCallback() should not be called, ' +
        'cleanPendingPairing() should not be called', function() {
          PairManager.showPendingPairing(false);
          assert.isFalse(cleanPendingPairingStub.called);
          cleanPendingPairingStub.restore();
      });
    });

    suite('screen locked mode > with pending pairing', function() {
      setup(function() {
        cleanPendingPairingStub =
          sinon.stub(PairManager, 'cleanPendingPairing');
        PairManager.pendingPairing = {
          showPairviewCallback: this.sinon.spy()
        };
      });

      test('showPairviewCallback() should not be called, ' +
      'cleanPendingPairing() should not be called', function() {
        PairManager.showPendingPairing(true);
        assert.isFalse(PairManager.pendingPairing.showPairviewCallback.called);
        assert.isFalse(cleanPendingPairingStub.called);
        cleanPendingPairingStub.restore();
      });
    });
  });

  suite('cleanPendingPairing > ', function() {
    setup(function() {
      this.sinon.stub(PairManager, 'cleanNotifications');
      PairManager.pendingPairing = {};
    });

    test('pendingPairing should be null, cleanNotifications() should be ' +
      'called', function() {
        PairManager.cleanPendingPairing();
        assert.equal(PairManager.pendingPairing, null);
        assert.isTrue(PairManager.cleanNotifications.called);
    });
  });

  suite('cleanNotifications > ', function() {
    var realNotificationGet, mockNotificationGet, mockNotis;
    setup(function() {
      mockNotis = [{
        tag: 'pairing-request',
        close: this.sinon.spy()
      }, {
        tag: 'email-msg',
        close: this.sinon.spy()
      }];

      mockNotificationGet = function() {
        return {
          then: function(callback) {
            callback(mockNotis);
          }
        };
      };
      realNotificationGet = window.Notification.get;
      window.Notification.get = mockNotificationGet;
    });

    teardown(function() {
      window.Notification.get = realNotificationGet;
      mockNotificationGet = null;
      mockNotis = null;
    });

    test('notification with tag "pairing-request" should be closed',
      function() {
        PairManager.cleanNotifications();
        assert.isTrue(mockNotis[0].close.called);
        assert.isFalse(mockNotis[1].close.called);
    });
  });

  suite('showPairview > ', function() {
    var openStub, pairviewInitSpy, pairingInfo;
    suiteSetup(function() {
      pairviewInitSpy = sinon.spy(Pairview, 'init');
      openStub = sinon.stub(window, 'open', function() {
        return {Pairview: Pairview};
      });

      pairingInfo = {
        method: 'confirmation',
        evt: {}
      };

      PairManager.showPairview(pairingInfo);
    });

    suiteTeardown(function() {
      pairviewInitSpy.restore();
      openStub.restore();
    });

    test('should init Pairview after page onloaded ', function() {
      PairManager.childWindow.onload();
      assert.isTrue(pairviewInitSpy.calledWith(pairingInfo.method,
                                               pairingInfo.evt));

    });
  });

  suite('onBluetoothDisabled > ', function() {
    setup(function() {
      this.sinon.stub(Pairview, 'closeInput');
      PairManager.childWindow = {
        Pairview: Pairview,
        close: this.sinon.spy()
      };

      this.sinon.stub(window, 'close');
    });

    test('Pairview.closeInput() should be called, childWindow should be close' +
      'window.close() should be called', function() {
        PairManager.onBluetoothDisabled();
        assert.isTrue(PairManager.childWindow.Pairview.closeInput.called);
        assert.isTrue(PairManager.childWindow.close.called);
        assert.isTrue(window.close.called);
    });
  });
});
