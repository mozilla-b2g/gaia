/* global MocksHelper, MockL10n, Pairview */
'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('bluetooth/test/unit/mock_pair_manager.js');

function switchReadOnlyProperty(originObject, propName, targetObj) {
  Object.defineProperty(originObject, propName, {
    configurable: true,
    get: function() { return targetObj; }
  });
}

var mocksForPairviewHelper = new MocksHelper([
  'PairManager'
]).init();

suite('Bluetooth app > Pairview ', function() {
  var realL10n;

  mocksForPairviewHelper.attachTestHelpers();

  suiteSetup(function(done) {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    loadBodyHTML('./_onpair.html');

    requireApp('bluetooth/js/views/pair_view.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    document.body.innerHTML = '';
  });

  suite('isFullAttentionMode > ', function() {
    var realWindowInnerHeight;
    suiteSetup(function() {
      realWindowInnerHeight = window.innerHeight;
    });

    suiteTeardown(function() {
      switchReadOnlyProperty(window, 'innerHeight', realWindowInnerHeight);
    });

    suite('window.innerHeight is 200 > ', function() {
      setup(function() {
        switchReadOnlyProperty(window, 'innerHeight', 200);
      });

      test('getting the mode of full attention should be false ' +
         'after isFullAttentionMode() is called ', function() {
        assert.isFalse(Pairview.isFullAttentionMode);
      });
    });

    suite('window.innerHeight is 201 > ', function() {
      setup(function() {
        switchReadOnlyProperty(window, 'innerHeight', 201);
      });

      test('getting the mode of full attention should be true ' +
         'after isFullAttentionMode() is called ', function() {
        assert.isTrue(Pairview.isFullAttentionMode);
      });
    });
  });

  suite('init > ', function() {
    var mockPairMethod, mockOptions;
    setup(function(done) {
      mockPairMethod = 'displaypasskey';
      mockOptions = {
        deviceName: 'device-01',
        handle: {
          passkey: 123456
        }
      };
      this.sinon.stub(Pairview, 'show');
      this.sinon.stub(Pairview, '_pairMethod');
      this.sinon.stub(Pairview, '_remoteDeviceName');
      this.sinon.stub(Pairview, '_passkey');
      Pairview.init(mockPairMethod, mockOptions);
      setTimeout(done);
    });

    test('pairing info should be inited after init() ', function() {
      assert.equal(Pairview._pairMethod, mockPairMethod);
      assert.equal(Pairview._remoteDeviceName, mockOptions.deviceName);
      assert.equal(Pairview._passkey, 123456);
    });

    test('pair view should be showing after mozL10n.once callback', function() {
      assert.isTrue(Pairview.show.called);
    });
  });

  suite('show > pair method in three methods > ', function() {
    var realGetTruncated;
    var mockDeviceName = 'device-01';
    var mockPasskey = 123456;

    setup(function() {
      realGetTruncated = window.getTruncated;
      window.getTruncated = this.sinon.stub();
      window.getTruncated.returns({
        addEventListener: this.sinon.stub()
      });
    });

    suite('early return > ', function() {
      var realWindowInnerHeight;

      setup(function() {
        realWindowInnerHeight = window.innerHeight;
        switchReadOnlyProperty(window, 'innerHeight', 200);
        this.sinon.stub(Pairview, 'close');
        Pairview.show();
      });

      teardown(function() {
        switchReadOnlyProperty(window, 'innerHeight', realWindowInnerHeight);
      });

      test('isFullAttentionMode() should be false', function() {
        assert.isFalse(Pairview.isFullAttentionMode);
      });

      test('close() should be called while attention sceen is not in full ' +
        'screen mode ', function() {
        assert.isTrue(Pairview.close.called);
      });

      test('getTruncated() should not be called since early return',
        function() {
        assert.isFalse(window.getTruncated.called);
      });
    });

    suite('confirmation, displaypasskey > ', function() {
      ['confirmation', 'displaypasskey'].forEach((mockPairMethod) => {
        setup(function() {
          this.sinon.stub(Pairview, '_pairMethod', mockPairMethod);
          this.sinon.stub(Pairview, '_remoteDeviceName', mockDeviceName);
          this.sinon.stub(Pairview, '_passkey', mockPasskey);
          Pairview.show();
        });

        teardown(function() {
          Pairview.nameLabel.textContent = undefined;
          Pairview.pairview.hidden = true;
          Pairview.pairDescription.textContent = undefined;
          Pairview.passkey.textContent = undefined;
          Pairview.comfirmationItem.hidden = true;
          Pairview.pinInputItem.hidden = true;
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
          assert.equal(Pairview.passkey.textContent, mockPasskey);
        });
        test('comfirmation method should not be hidden after show()',
        function() {
          assert.isFalse(Pairview.comfirmationItem.hidden);
        });
        test('pin input field should be hidden after show() ', function() {
          assert.isTrue(Pairview.pinInputItem.hidden);
        });
      });
    });

    suite('enterpincode > ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'enterpincode');
        this.sinon.stub(Pairview, '_remoteDeviceName', mockDeviceName);
        Pairview.show();
      });

      teardown(function() {
        Pairview.nameLabel.textContent = undefined;
        Pairview.pairview.hidden = true;
        Pairview.pairDescription.textContent = undefined;
        Pairview.comfirmationItem.hidden = true;
        Pairview.pinInputItem.hidden = true;
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
    });

    suite('consent > ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'consent');
        this.sinon.stub(Pairview, '_remoteDeviceName', mockDeviceName);
        Pairview.show();
      });

      teardown(function() {
        Pairview.nameLabel.textContent = undefined;
        Pairview.pairview.hidden = true;
        Pairview.pairDescription.textContent = undefined;
        Pairview.comfirmationItem.hidden = true;
        Pairview.pinInputItem.hidden = true;
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
      test('comfirmation method should not be hidden after show()', function() {
        assert.isFalse(Pairview.comfirmationItem.hidden);
      });
      test('pin input field should be hidden after show() ', function() {
        assert.isTrue(Pairview.pinInputItem.hidden);
      });
    });
  });

  suite('handleEvent > ', function() {
    var fakePreventDefault = function() {/* do nothing here.. */};

    var stubWindowClose;
    suiteSetup(function() {
      stubWindowClose = sinon.stub(window, 'close');
      Pairview.pairButton.disabled = false;
      Pairview.closeButton.disabled = false;
      Pairview.pairDescription.textContent = undefined;
    });

    suiteTeardown(function() {
      stubWindowClose.restore();
      Pairview.pairButton.disabled = false;
      Pairview.closeButton.disabled = false;
      Pairview.pairDescription.textContent = undefined;
    });

    suite('click pair button > pair method: displaypasskey ', function() {
      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'displaypasskey');
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
      test('window should be closed after clicked event', function() {
        assert.isTrue(stubWindowClose.called);
      });
    });

    suite('click pair button > pair method: enterpincode ', function() {
      var mockOptions, pincode = 'SixteenTxtLength';

      setup(function() {
        this.sinon.stub(Pairview, '_pairMethod', 'enterpincode');
        Pairview.pinInput.value = pincode;
        mockOptions = {
          handle: {
            setPinCode: function() {return Promise.resolve();}
          }
        };
        this.sinon.spy(mockOptions.handle, 'setPinCode');
        this.sinon.stub(Pairview, '_options', mockOptions);
        Pairview.handleEvent({target: {id: 'button-pair'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      teardown(function() {
        Pairview.pinInput.value = '';
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
      test('set pin code should be set after clicked event', function() {
        assert.isTrue(Pairview._options.handle.setPinCode.calledWith(pincode));
      });
      test('window should be closed after setPinCode resolve ', function(done) {
        mockOptions.handle.setPinCode(pincode).then(() => {
          assert.isTrue(stubWindowClose.called);
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('click pair button > pair method: confirmation, consent ',
          function() {
      var mockOptions;

      ['confirmation', 'consent'].forEach((mockPairMethod) => {
        setup(function() {
          this.sinon.stub(Pairview, '_pairMethod', mockPairMethod);
          mockOptions = {
            handle: {
              accept: function() {return Promise.resolve();}
            }
          };
          this.sinon.spy(mockOptions.handle, 'accept');
          this.sinon.stub(Pairview, '_options', mockOptions);
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
        test('close button should be disabled after clicked event', function() {
          assert.isTrue(Pairview.closeButton.disabled);
        });
        test('handle.accept should be set after clicked event', function() {
          assert.isTrue(Pairview._options.handle.accept.called);
        });
        test('window should be closed after accept resolve', function(done) {
          mockOptions.handle.accept().then(() => {
            assert.isTrue(stubWindowClose.called);
          }, () => {
            // reject case
            assert.isTrue(false);
          }).then(done, done);
        });
      });
    });

    suite('click close button > ', function() {
      var pairviewCloseSpy, mockOptions;

      setup(function() {
        pairviewCloseSpy = this.sinon.spy(Pairview, 'close');
        mockOptions = {
          handle: {
            reject: function() {return Promise.resolve();}
          }
        };
        this.sinon.spy(mockOptions.handle, 'reject');
        this.sinon.stub(Pairview, '_options', mockOptions);
        Pairview.handleEvent({target: {id: 'button-close'},
                              type: 'click',
                              preventDefault: fakePreventDefault});
      });

      test('close() method should be called after clicked close ', function() {
        assert.isTrue(pairviewCloseSpy.called);
      });
      test('handle.reject should be set after clicked close ', function(done) {
        mockOptions.handle.reject().then(() => {
          assert.isTrue(stubWindowClose.called);
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });

    suite('received "resize" event > ', function() {
      var pairviewCloseSpy, mockOptions;

      setup(function() {
        pairviewCloseSpy = this.sinon.spy(Pairview, 'close');
        mockOptions = {
          handle: {
            reject: function() {return Promise.resolve();}
          }
        };
        this.sinon.spy(mockOptions.handle, 'reject');
        this.sinon.stub(Pairview, '_options', mockOptions);
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
      test('handle.reject should be set after clicked close ', function(done) {
        mockOptions.handle.reject().then(() => {
          assert.isTrue(stubWindowClose.called);
        }, () => {
          // reject case
          assert.isTrue(false);
        }).then(done, done);
      });
    });
  });

  suite('closeInput > ', function() {
    var pairviewPinInputSpy;
    setup(function() {
      pairviewPinInputSpy = this.sinon.spy(Pairview.pinInput, 'blur');
      Pairview.pinInputItem.hidden = false;
      Pairview.closeInput();
    });

    teardown(function() {
      pairviewPinInputSpy.restore();
      Pairview.pinInputItem.hidden = true;
    });

    test('pin input should be blurred after closeInput() ', function() {
      assert.isTrue(pairviewPinInputSpy.called);
    });
  });
});
