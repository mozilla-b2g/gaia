/* global MocksHelper, MockL10n, MockNavigatormozSetMessageHandler,
   MockNavigatorSettings, MockBluetoothHelperInstance, PairManager, Pairview */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
requireApp('bluetooth/test/unit/mock_l10n.js');
requireApp('bluetooth/test/unit/mock_pair_view.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_bluetooth_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');

var mocksForPairManagerHelper = new MocksHelper([
  'BluetoothHelper',
  'Pairview'
]).init();

suite('Bluetooth app > PairManager ', function() {
  var realL10n;
  var realSetMessageHandler;
  var realMozSettings;

  mocksForPairManagerHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    MockNavigatormozSetMessageHandler.mSetup();

    requireApp('bluetooth/js/pair_manager.js', done);
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    navigator.mozL10n = realL10n;
  });

  suite('init > ', function() {
    setup(function() {
      this.sinon.stub(PairManager, 'onRequestPairing');
      this.sinon.stub(PairManager, 'onBluetoothCancel');
      this.sinon.stub(PairManager, 'bluetoothHelper');
      PairManager.init();
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
  });

  suite('onRequestPairing > ', function() {
    var message = {};
    suite(' screen unlocked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = false;
        PairManager.onRequestPairing(message);
        setTimeout(done);
      });

      test('handle showPairview() from onRequestPairing() ', function() {
        assert.isTrue(PairManager.showPairview.calledWith(message),
        'showPairview() should be called after do onRequestPairing() ' +
        'in screen unlock mode');
      });
    });

    suite(' screen locked mode > ', function() {
      setup(function(done) {
        this.sinon.stub(PairManager, 'showPairview');
        MockNavigatorSettings.mSettings['lockscreen.locked'] = true;
        PairManager.onRequestPairing(message);
        setTimeout(done);
      });

      test('handle showPairview() from onRequestPairing() ', function() {
        assert.isFalse(PairManager.showPairview.called,
        'showPairview() should not be called after do onRequestPairing() ' +
        'in screen lock mode');
      });
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

  suite('inform pairing interface > ', function() {
    suite(' setPairingConfirmationSpy > ', function() {
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

    suite(' setPinCodeSpy > ', function() {
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

    suite(' setPasskeySpy > ', function() {
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
