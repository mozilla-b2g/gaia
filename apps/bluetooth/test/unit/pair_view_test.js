/* global MocksHelper, MockL10n, Pairview, PairManager */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('bluetooth/test/unit/mock_l10n.js');
requireApp('bluetooth/test/unit/mock_pair_manager.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

var mocksForTransferHelper = new MocksHelper([
  'PairManager'
]).init();

suite('Bluetooth app > Pairview ', function() {
  var realL10n;

  mocksForTransferHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    loadBodyHTML('./_onpair.html');

    requireApp('bluetooth/js/pair_view.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite('init > ', function() {
    var device = {
      address: '00:11:22:AA:BB:CC',
      name: 'device-01',
      icon: 'device'
    };
    setup(function() {
      this.sinon.stub(Pairview, 'show');
      this.sinon.stub(Pairview, '_pairMode');
      this.sinon.stub(Pairview, '_pairMethod');
      this.sinon.stub(Pairview, '_device');
      this.sinon.stub(Pairview, '_passkey');
      Pairview.init('passive', 'passkey', device, 123456);
    });

    test('pairing info should be inited after init() ', function() {
      assert.equal(Pairview._pairMode, 'passive');
      assert.equal(Pairview._pairMethod, 'passkey');
      assert.equal(Pairview._device, device);
      assert.equal(Pairview._passkey, 123456);
    });

    test('pair view should be showing after mozL10n.once callback', function() {
      assert.isTrue(Pairview.show.called);
    });
  });

  suite('show > pair method in three methods > ', function() {
    var realGetTruncated, device = {
      address: '00:11:22:AA:BB:CC',
      name: 'device-01',
      icon: 'device'
    };

    setup(function() {
      realGetTruncated = window.getTruncated;
      window.getTruncated = this.sinon.stub();
      window.getTruncated.returns({
        addEventListener: this.sinon.stub()
      });
    });

    suite('confirmation > ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMode', 'passive');
        this.sinon.stub(Pairview, '_pairMethod', 'confirmation');
        this.sinon.stub(Pairview, '_device', device);
        this.sinon.stub(Pairview, '_passkey', 123456);
        Pairview.show();
      });

      teardown(function() {
        Pairview.nameLabel.textContent = undefined;
        Pairview.pairview.hidden = true;
        Pairview.pairDescription.textContent = undefined;
        Pairview.passkey.textContent = undefined;
        Pairview.comfirmationItem.hidden = true;
        Pairview.pinInputItem.hidden = true;
        Pairview.passkeyInputItem.hidden = true;
      });

      test('nameLabel should be defined after show() ', function() {
        assert.isDefined(Pairview.nameLabel.textContent);
      });
      test('view should not be hidden after show() ', function() {
        assert.isFalse(Pairview.pairview.hidden);
      });
      test('description should be defined after show() ', function() {
        assert.isDefined(Pairview.pairDescription.textContent);
      });
      test('passkey textContent should be displayed and ' +
          'same with pairing info from system message ', function() {
        assert.equal(Pairview.passkey.textContent, 123456);
      });
      test('comfirmation method should not be hidden after show()', function() {
        assert.isFalse(Pairview.comfirmationItem.hidden);
      });
      test('pin input field should be hidden after show() ', function() {
        assert.isTrue(Pairview.pinInputItem.hidden);
      });
      test('passkey input field should be hidden after show() ', function() {
        assert.isTrue(Pairview.passkeyInputItem.hidden);
      });
    });

    suite('pincode > ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMode', 'passive');
        this.sinon.stub(Pairview, '_pairMethod', 'pincode');
        this.sinon.stub(Pairview, '_device', device);
        this.sinon.stub(Pairview, '_passkey', 123456);
        Pairview.show();
      });

      teardown(function() {
        Pairview.nameLabel.textContent = undefined;
        Pairview.pairview.hidden = true;
        Pairview.pairDescription.textContent = undefined;
        Pairview.comfirmationItem.hidden = true;
        Pairview.pinInputItem.hidden = true;
        Pairview.passkeyInputItem.hidden = true;
      });

      test('nameLabel should be defined after show() ', function() {
        assert.isDefined(Pairview.nameLabel.textContent);
      });
      test('view should not be hidden after show() ', function() {
        assert.isFalse(Pairview.pairview.hidden);
      });
      test('description should be defined after show() ', function() {
        assert.isDefined(Pairview.pairDescription.textContent);
      });
      test('pin input field should not be hidden after show() ', function() {
        assert.isFalse(Pairview.pinInputItem.hidden);
      });
      test('comfirmation method should be hidden after show() ', function() {
        assert.isTrue(Pairview.comfirmationItem.hidden);
      });
      test('passkey input field should be hidden after show() ', function() {
        assert.isTrue(Pairview.passkeyInputItem.hidden);
      });
    });

    suite('passkey > ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMode', 'passive');
        this.sinon.stub(Pairview, '_pairMethod', 'passkey');
        this.sinon.stub(Pairview, '_device', device);
        this.sinon.stub(Pairview, '_passkey', 123456);
        Pairview.show();
      });

      teardown(function() {
        Pairview.nameLabel.textContent = undefined;
        Pairview.pairview.hidden = true;
        Pairview.pairDescription.textContent = undefined;
        Pairview.comfirmationItem.hidden = true;
        Pairview.pinInputItem.hidden = true;
        Pairview.passkeyInputItem.hidden = true;
      });

      test('nameLabel should be defined after show() ', function() {
        assert.isDefined(Pairview.nameLabel.textContent);
      });
      test('view should not be hidden after show() ', function() {
        assert.isFalse(Pairview.pairview.hidden);
      });
      test('description should be defined after show() ', function() {
        assert.isDefined(Pairview.pairDescription.textContent);
      });
      test('passkey input field should not be hidden after show()', function() {
        assert.isFalse(Pairview.passkeyInputItem.hidden);
      });
      test('comfirmation method should be hidden after show() ', function() {
        assert.isTrue(Pairview.comfirmationItem.hidden);
      });
      test('pin input field should be hidden after show() ', function() {
        assert.isTrue(Pairview.pinInputItem.hidden);
      });
    });
  });

  suite('handleEvent > ', function() {
    var fakePreventDefault = function() {/* do nothing here.. */};

    var stubWindowClose, device = {
      address: '00:11:22:AA:BB:CC'
    };
    suiteSetup(function() {
      var MockOpener = {
        PairManager: PairManager
      };
      switchReadOnlyProperty(window, 'opener', MockOpener);
      stubWindowClose = sinon.stub(window, 'close');
      Pairview._device = device;
      Pairview.pairButton.disabled = false;
      Pairview.closeButton.disabled = false;
      Pairview.pairDescription.textContent = undefined;
    });

    suiteTeardown(function() {
      switchReadOnlyProperty(window, 'opener', null);
      stubWindowClose.restore();
      Pairview._device = null;
      Pairview.pairButton.disabled = false;
      Pairview.closeButton.disabled = false;
      Pairview.pairDescription.textContent = undefined;
    });

    suite('click pair button > pair method: confirmation ', function() {
      var pmSetConfirmationSpy;

      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'confirmation');
        pmSetConfirmationSpy = this.sinon.spy(PairManager, 'setConfirmation');
        Pairview.handleEvent({target: {id: 'button-pair'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      test('description should be defined after clicked pair button',
        function() {
        assert.isDefined(Pairview.pairDescription.textContent);
      });
      test('pair button should be disabled after clicked event ', function() {
        assert.isTrue(Pairview.pairButton.disabled);
      });
      test('close button should be disabled after clicked event ', function() {
        assert.isTrue(Pairview.closeButton.disabled);
      });
      test('set confirmation should be set after clicked event', function() {
        assert.isTrue(pmSetConfirmationSpy.calledWith(device.address, true));
      });
      test('window should be closed after clicked event', function() {
        assert.isTrue(stubWindowClose.called);
      });
    });

    suite('click pair button > pair method: pincode ', function() {
      var pmSetPinCodeSpy, pincode = 'SixteenTxtLength';

      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'pincode');
        Pairview.pinInput.value = pincode;
        pmSetPinCodeSpy = this.sinon.spy(PairManager, 'setPinCode');
        Pairview.handleEvent({target: {id: 'button-pair'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      teardown(function() {
        Pairview.pinInput.value = '';
      });

      test('set pin code should be set after clicked event', function() {
        assert.isTrue(pmSetPinCodeSpy.calledWith(device.address, pincode));
      });
    });

    suite('click pair button > pair method: passkey ', function() {
      var pmSetPasskeySpy, passkey = '123456';

      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'passkey');
        Pairview.passkeyInput.value = passkey;
        pmSetPasskeySpy = this.sinon.spy(PairManager, 'setPasskey');
        Pairview.handleEvent({target: {id: 'button-pair'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      teardown(function() {
        Pairview.passkeyInput.value = '';
      });

      test('set pass key should be set after clicked event', function() {
        assert.isTrue(pmSetPasskeySpy.calledWith(device.address, passkey));
      });
    });

    suite('click close button > ', function() {
      var pairviewCloseSpy, pmSetConfirmationSpy;

      setup(function() {
        pairviewCloseSpy = this.sinon.spy(Pairview, 'close');
        pmSetConfirmationSpy = this.sinon.spy(PairManager, 'setConfirmation');
        Pairview.handleEvent({target: {id: 'button-close'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      test('close() method should be called after clicked close ', function() {
        assert.isTrue(pairviewCloseSpy.called);
      });
      test('set confirmation should be set after clicked close ', function() {
        assert.isTrue(pmSetConfirmationSpy.calledWith(device.address, false));
      });
    });

    suite('received "resize" event > ', function() {
      var pairviewCloseSpy, pmSetConfirmationSpy;

      setup(function() {
        pairviewCloseSpy = this.sinon.spy(Pairview, 'close');
        pmSetConfirmationSpy = this.sinon.spy(PairManager, 'setConfirmation');
        switchReadOnlyProperty(window, 'innerHeight', 150);
        Pairview.handleEvent({target: {},
                              type: 'resize',
                              preventDefault: fakePreventDefault});
      });

      teardown(function() {
        switchReadOnlyProperty(window, 'innerHeight', null);
      });

      test('close() method should be called after clicked close ', function() {
        assert.isTrue(pairviewCloseSpy.called);
      });
      test('set confirmation should be set after clicked close ', function() {
        assert.isTrue(pmSetConfirmationSpy.calledWith(device.address, false));
      });
    });
  });

  suite(' closeInput > ', function() {
    var pairviewPinInputSpy, pairviewPasskeyInputSpy;
    setup(function() {
      pairviewPinInputSpy = this.sinon.spy(Pairview.pinInput, 'blur');
      pairviewPasskeyInputSpy = this.sinon.spy(Pairview.passkeyInput, 'blur');
      Pairview.pinInputItem.hidden = false;
      Pairview.passkeyInputItem.hidden = false;
      Pairview.closeInput();
    });

    teardown(function() {
      pairviewPinInputSpy.restore();
      pairviewPasskeyInputSpy.restore();
      Pairview.pinInputItem.hidden = true;
      Pairview.passkeyInputItem.hidden = true;
    });

    test('pin input should be blurred after closeInput() ', function() {
      assert.isTrue(pairviewPinInputSpy.called);
    });
    test('pass key input should be blurred after closeInput() ', function() {
      assert.isTrue(pairviewPasskeyInputSpy.called);
    });
  });

});
