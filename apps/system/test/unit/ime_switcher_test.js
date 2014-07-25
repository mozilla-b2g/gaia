'use strict';

/* global IMESwitcher, MocksHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/js/ime_switcher.js');

var mocksForIMESwitcher = new MocksHelper([
  'L10n'
]).init();

suite('IMESwitcher', function() {
  mocksForIMESwitcher.attachTestHelpers();

  test('start()', function() {
    var imeSwitcher = new IMESwitcher();

    var fakeUtilityTrayContainer = {
      querySelector: this.sinon.stub()
    };

    var notificationContainer = {
      querySelector: this.sinon.stub(),
      addEventListener: this.sinon.stub()
    };

    fakeUtilityTrayContainer.querySelector.returns(notificationContainer);

    notificationContainer.querySelector.onFirstCall().returns('msgElem')
                         .onSecondCall().returns('tipElem');

    var stubGetElement =
      this.sinon.stub(document, 'getElementById')
      .returns(fakeUtilityTrayContainer);

    imeSwitcher.start();

    assert.isTrue(stubGetElement.calledWith('keyboard-show-ime-list'));
    assert.equal(imeSwitcher._utilityTrayContainer, fakeUtilityTrayContainer);
    assert.equal(imeSwitcher._notificationContainer, notificationContainer);
    assert.isTrue(
      fakeUtilityTrayContainer.querySelector.calledWith('.fake-notification')
    );
    assert.equal(imeSwitcher._notificationTitle, 'msgElem');
    assert.equal(imeSwitcher._notificationTip, 'tipElem');
    assert.equal(notificationContainer.querySelector.args[0][0], '.message');
    assert.equal(notificationContainer.querySelector.args[1][0], '.tip');

    assert.isTrue(
      notificationContainer.addEventListener.calledWith(
        'mousedown', imeSwitcher
      )
    );
  });

  test('stop()', function() {
    var imeSwitcher = new IMESwitcher();

    var notificationContainer = {
      removeEventListener: this.sinon.stub()
    };

    imeSwitcher._notificationContainer = notificationContainer;

    imeSwitcher._utilityTrayContainer = 'UTC';
    imeSwitcher._notificationTitle = 'NT';
    imeSwitcher._notificationTip = 'NTP';
    imeSwitcher.ontap = 'OT';

    imeSwitcher.stop();

    assert.isTrue(
      notificationContainer.removeEventListener.calledWith(
        'mousedown', imeSwitcher
      )
    );

    assert.strictEqual(imeSwitcher._utilityTrayContainer, null);
    assert.strictEqual(imeSwitcher._notificationContainer, null);
    assert.strictEqual(imeSwitcher._notificationTitle, null);
    assert.strictEqual(imeSwitcher._notificationTip, null);
    assert.strictEqual(imeSwitcher.ontap, undefined);
  });

  suite('show() and hide()', function() {
    var oldCustomEvent = window.CustomEvent;
    var stubDispatchEvent;
    var imeSwitcher;
    suiteSetup(function() {
      window.CustomEvent = function MockCustomEvent(type) {
        return {type: type};
      };
    });

    suiteTeardown(function() {
      window.CustomEvent = oldCustomEvent;
    });

    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      imeSwitcher = new IMESwitcher();

      imeSwitcher._notificationContainer = {
        classList: {
          add: this.sinon.spy(),
          remove: this.sinon.spy()
        }
      };
    });

    teardown(function() {
      stubDispatchEvent.restore();
    });

    test('show()', function() {
      imeSwitcher._notificationTitle = document.createElement('div');

      imeSwitcher._notificationTip = document.createElement('div');

      var realMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      imeSwitcher.show('DummyKBApp', 'DummyKBKB');

      assert.isTrue(stubDispatchEvent.calledWith({
        type: 'keyboardimeswitchershow'
      }));

      assert.equal(
        imeSwitcher._notificationTitle.dataset.l10nId,
        'ime-switching-title'
      );
      assert.equal(
        imeSwitcher._notificationTitle.dataset.l10nArgs,
        JSON.stringify({
          appName: 'DummyKBApp',
          name: 'DummyKBKB'
        })
      );

      assert.equal(
        imeSwitcher._notificationTip.dataset.l10nId,
        'ime-switching-tip'
      );

      assert.isTrue(
        imeSwitcher._notificationContainer.classList.add.calledWith('activated')
      );

      navigator.mozL10n = realMozL10n;
    });

    test('hide()', function() {
      imeSwitcher.hide();
      assert.isTrue(
        imeSwitcher._notificationContainer.classList.remove
        .calledWith('activated')
      );
      assert.isTrue(stubDispatchEvent.calledWith({
        type: 'keyboardimeswitcherhide'
      }));
    });
  });

  test('handleEvent()', function() {
    var imeSwitcher = new IMESwitcher();

    imeSwitcher.ontap = this.sinon.spy();

    var evt = {
      preventDefault: this.sinon.spy()
    };

    imeSwitcher.handleEvent(evt);

    assert.isTrue(evt.preventDefault.called);
    assert.isTrue(imeSwitcher.ontap.called);
  });

});
