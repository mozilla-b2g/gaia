'use strict';

/* global IMESwitcher, MocksHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
require('/js/ime_switcher.js');

var mocksForIMESwitcher = new MocksHelper([
  'L10n'
]).init();

suite('IMESwitcher', function() {
  mocksForIMESwitcher.attachTestHelpers();

  test('init()', function() {
    var imeSwitcher = new IMESwitcher();
    var spyCallback = this.sinon.spy();

    var fakeNotifIMEContainer = {
      querySelector: this.sinon.stub()
    };

    var fakeNoti = {
      querySelector: this.sinon.stub(),
      addEventListener: this.sinon.stub()
    };

    fakeNotifIMEContainer.querySelector.returns(fakeNoti);

    fakeNoti.querySelector.onFirstCall().returns('msgElem')
                          .onSecondCall().returns('tipElem');

    var stubGetElement =
      this.sinon.stub(document, 'getElementById')
      .returns(fakeNotifIMEContainer);

    imeSwitcher.init(spyCallback);

    assert.isTrue(stubGetElement.calledWith('keyboard-show-ime-list'));
    assert.equal(imeSwitcher._notifIMEContainer, fakeNotifIMEContainer);
    assert.equal(imeSwitcher._fakenoti, fakeNoti);
    assert.isTrue(
      fakeNotifIMEContainer.querySelector.calledWith('.fake-notification')
    );
    assert.equal(imeSwitcher._fakenotiMessage, 'msgElem');
    assert.equal(imeSwitcher._fakenotiTip, 'tipElem');
    assert.equal(fakeNoti.querySelector.args[0][0], '.message');
    assert.equal(fakeNoti.querySelector.args[1][0], '.tip');

    assert.equal(fakeNoti.addEventListener.args[0][0], 'mousedown');

    var evt = {
      preventDefault: this.sinon.spy()
    };

    assert.isFalse(spyCallback.called);

    fakeNoti.addEventListener.callArgWith(1, evt);

    assert.isTrue(spyCallback.called);
    assert.isTrue(evt.preventDefault.called);
  });

  suite('show() and hide()', function(){
    var oldCustomEvent = window.CustomEvent;
    var stubDispatchEvent;
    var imeSwitcher;
    suiteSetup(function() {
      window.CustomEvent = function MockCustomEvent(type_){
        return {type: type_};
      };
    });

    suiteTeardown(function() {
      window.CustomEvent = oldCustomEvent;
    });

    setup(function() {
      stubDispatchEvent = this.sinon.stub(window, 'dispatchEvent');

      imeSwitcher = new IMESwitcher();

      imeSwitcher._fakenoti = {
        classList: {
          add: this.sinon.spy(),
          remove: this.sinon.spy()
        }
      };
    });

    teardown(function() {
      stubDispatchEvent.restore();
    });

    test('show()', function(){
      imeSwitcher._fakenotiMessage = {
        textContent: ''
      };

      imeSwitcher._fakenotiTip = {
        textContent: ''
      };

      var realMozL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      imeSwitcher.show('DummyKBApp', 'DummyKBKB');

      assert.isTrue(stubDispatchEvent.calledWith({
        type: 'keyboardimeswitchershow'
      }));

      assert.equal(
        imeSwitcher._fakenotiMessage.textContent,
        MockL10n.get('ime-switching-title', {
          appName: 'DummyKBApp',
          name: 'DummyKBKB'
        })
      );
      assert.equal(
        imeSwitcher._fakenotiTip.textContent,
        MockL10n.get('ime-switching-tip')
      );

      assert.isTrue(
        imeSwitcher._fakenoti.classList.add.calledWith('activated')
      );

      navigator.mozL10n = realMozL10n;

    });

    test('hide()', function(){
      imeSwitcher.hide();
      assert.isTrue(
        imeSwitcher._fakenoti.classList.remove.calledWith('activated')
      );
      assert.isTrue(stubDispatchEvent.calledWith({
        type: 'keyboardimeswitcherhide'
      }));
    });

  });
});
