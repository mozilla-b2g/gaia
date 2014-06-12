/* global MocksHelper, MockL10n, MockNavigatormozSetMessageHandler,
   MockNavigatorSettings, MockBluetoothHelperInstance, MockNavigatormozApps,
   MockMozBluetooth, PairManager, Pairview, PairExpiredDialog */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('bluetooth/test/unit/mock_l10n.js');
requireApp('bluetooth/test/unit/mock_pair_view.js');
requireApp('bluetooth/test/unit/mock_pair_expired_dialog.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_bluetooth_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_bluetooth.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

mocha.globals(['PairManager', 'BluetoothHelper', 'open', 'Pairview',
               'PairExpiredDialog']);

var mocksForPairManagerHelper = new MocksHelper([
  'BluetoothHelper',
  'Pairview',
  'PairExpiredDialog'
]).init();

suite('Bluetooth app > PairManager ', function() {
  var realL10n;
  var realSetMessageHandler;
  var realMozSettings;
  var realMozApps;
  var realMozBluetooth;

  mocksForPairManagerHelper.attachTestHelpers();

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

    requireApp('bluetooth/js/pair_manager.js', done);
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
      this.sinon.stub(PairManager, 'onRequestPairing');
      this.sinon.stub(PairManager, 'onBluetoothCancel');
      this.sinon.stub(PairManager, 'bluetoothHelper');
      this.sinon.stub(PairManager, 'showPendingPairing');
      this.sinon.stub(PairManager, 'onBluetoothDisabled');
      PairManager.init();
    });

    teardown(function() {
      MockNavigatorSettings.mTeardown();
    });

    test('bluetoothHelper is existed >', function() {
      assert.isDefined(PairManager.bluetoothHelper);
    });

    suite('fire "bluetooth-pairing-request" event > ', function() {
      var message, eventName;
      setup(function() {
        message = {};
        eventName = 'bluetooth-pairing-request';
        MockNavigatormozSetMessageHandler.mTrigger(eventName, message);
      });

      test('handle event with onRequestPairing()', function() {
        assert.isTrue(PairManager.onRequestPairing.calledWith(message),
        'the "onRequestPairing" should be called with "message" object ' +
        'after received "bluetooth-pairing-request" event');
      });
    });

    suite('fire "bluetooth-cancel" event > ', function() {
      var message, eventName;
      setup(function() {
        message = {};
        eventName = 'bluetooth-cancel';
        MockNavigatormozSetMessageHandler.mTrigger(eventName, message);
      });

      test('handle event with onBluetoothCancel()', function() {
        assert.isTrue(PairManager.onBluetoothCancel.calledWith(message),
        'the "onBluetoothCancel" should be called with "message" object ' +
        'after received "bluetooth-cancel" event');
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

    suite('mozBluetooth fire ondisabled event > ', function() {
      test('mozBluetooth.ondisabled should be define with callback ' +
           'onBluetoothDisabled()', function() {
        assert.isDefined(navigator.mozBluetooth.ondisabled);
        navigator.mozBluetooth.ondisabled();
        assert.isTrue(PairManager.onBluetoothDisabled.called);
      });
    });

    suite('bluetooth enabled status change > ', function() {
      var btEnabledKey = 'bluetooth.enabled';
      suite('bluetooth enabled changed to be false > ', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers(btEnabledKey,
                                                  {settingValue: false});
        });

        test('observes settings key "bluetooth.enabled"', function() {
          assert.equal(MockNavigatorSettings.mObservers[btEnabledKey].length,
                       1);
        });

        test('onBluetoothDisabled() should be called while bluetooth.enabled ' +
             'settings key value changed with false', function() {
          assert.isTrue(PairManager.onBluetoothDisabled.called);
        });
      });

      suite('bluetooth enabled changed to be true > ', function() {
        setup(function() {
          MockNavigatorSettings.mTriggerObservers(btEnabledKey,
                                                  {settingValue: true});
        });

        test('observes settings key "bluetooth.enabled"', function() {
          assert.equal(MockNavigatorSettings.mObservers[btEnabledKey].length,
                       1);
        });

        test('onBluetoothDisabled() should not be called while bluetooth' +
             '.enabled settings key value changed with true', function() {
          assert.isFalse(PairManager.onBluetoothDisabled.called);
        });
      });
    });
  });

  suite('onRequestPairing > ', function() {
    var pairingInfo = {};
    suite('screen locked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'fireNotification');
        this.sinon.stub(PairManager, 'cleanPendingPairing');
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = true;
        PairManager.onRequestPairing(pairingInfo);
        setTimeout(done);
      });

      test('handle showPairview() from onRequestPairing() ', function() {
        assert.isTrue(PairManager.fireNotification.calledWith(pairingInfo),
        'fireNotification() should be called after do onRequestPairing() ' +
        'in screen lock mode');
        assert.isFalse(PairManager.cleanPendingPairing.called,
        'cleanPendingPairing() should not be called after do ' +
        'onRequestPairing() in screen lock mode');
        assert.isFalse(PairManager.showPairview.called,
        'showPairview() should not be called after do onRequestPairing() ' +
        'in screen lock mode');
      });
    });

    suite('screen unlocked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'fireNotification');
        this.sinon.stub(PairManager, 'cleanPendingPairing');
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = false;
        PairManager.onRequestPairing(pairingInfo);
        setTimeout(done);
      });

      test('handle showPairview() from onRequestPairing() ', function() {
        assert.isFalse(PairManager.fireNotification.called,
        'fireNotification() should not be called after do onRequestPairing() ' +
        'in screen lock mode');
        assert.isTrue(PairManager.cleanPendingPairing.called,
        'cleanPendingPairing() should not be called after do ' +
        'onRequestPairing() in screen lock mode');
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
        name: 'device-01'
      };
      titleResult = _('bluetooth-pairing-request-now-title');
      optionsResult = {
        body: pairingInfo.name,
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
    var openStub, pairviewInitSpy, pairingInfo, resultDevice;
    suiteSetup(function() {
      pairviewInitSpy = sinon.spy(Pairview, 'init');
      openStub = sinon.stub(window, 'open', function() {
        return {Pairview: Pairview};
      });

      pairingInfo = {
        address: '00:11:22:AA:BB:CC',
        name: 'device-01',
        icon: 'device',
        passkey: 123456,
        method: 'passkey'
      };

      resultDevice = {
        address: '00:11:22:AA:BB:CC',
        name: 'device-01',
        icon: 'device'
      };
      PairManager.showPairview(pairingInfo);
    });

    suiteTeardown(function() {
      pairviewInitSpy.restore();
      openStub.restore();
    });

    test('should init Pairview after page onloaded ', function() {
      PairManager.childWindow.onload();
      assert.isTrue(pairviewInitSpy.calledWith('passive', pairingInfo.method,
                                               resultDevice,
                                               pairingInfo.passkey));

    });
  });

  suite('onBluetoothCancel > ', function() {
    setup(function() {
      this.sinon.stub(Pairview, 'closeInput');
      PairManager.childWindow = {
        Pairview: Pairview,
        close: this.sinon.spy()
      };

      PairManager.pendingPairing = {/* something here */};
      switchReadOnlyProperty(PairExpiredDialog, 'isVisible', true);
      this.sinon.stub(PairExpiredDialog, 'close');
      this.sinon.stub(window, 'close');
    });

    teardown(function() {
      switchReadOnlyProperty(PairExpiredDialog, 'isVisible', false);
    });

    test('Pairview.closeInput() should be called, childWindow should be close' +
      ', pendingPairing should be null, ' +
      'window.close() should be called', function() {
        PairManager.onBluetoothCancel('message');
        assert.isTrue(PairManager.childWindow.Pairview.closeInput.called);
        assert.isTrue(PairManager.childWindow.close.called);
        assert.equal(PairManager.pendingPairing, null);
        assert.isTrue(PairExpiredDialog.close.called);
        assert.isTrue(window.close.called);
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

  suite('inform pairing interface > ', function() {
    suite('setPairingConfirmationSpy > ', function() {
      var setPairingConfirmationSpy;
      setup(function() {
        PairManager.init();
      });

      teardown(function() {
        setPairingConfirmationSpy.restore();
      });

      test('should inform bluetooth to setPairingConfirmation ', function() {
        var address = '00:11:22:AA:BB:CC';
        var confirmed = true;
        setPairingConfirmationSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'setPairingConfirmation');
        PairManager.setConfirmation(address, confirmed);
        assert.isTrue(setPairingConfirmationSpy.calledWith(address, confirmed));
      });
    });

    suite('setPinCodeSpy > ', function() {
      var setPinCodeSpy;
      setup(function() {
        PairManager.init();
      });

      teardown(function() {
        setPinCodeSpy.restore();
      });

      test('should inform bluetooth to setPinCode ', function() {
        var address = '00:11:22:AA:BB:CC';
        var pincode = 'SixteenTxtLength';
        setPinCodeSpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'setPinCode');
        PairManager.setPinCode(address, pincode);
        assert.isTrue(setPinCodeSpy.calledWith(address, pincode));
      });
    });

    suite('setPasskeySpy > ', function() {
      var setPasskeySpy;
      setup(function() {
        PairManager.init();
      });

      teardown(function() {
        setPasskeySpy.restore();
      });

      test('should inform bluetooth to setPasskey ', function() {
        var address = '00:11:22:AA:BB:CC';
        var passkey = 123456;
        setPasskeySpy = this.sinon.spy(
          MockBluetoothHelperInstance, 'setPasskey');
        PairManager.setPasskey(address, passkey);
        assert.isTrue(setPasskeySpy.calledWith(address, parseInt(passkey, 10)));
      });
    });
  });
});
