/* globals MockGaiaMenu, MocksHelper, MockL10n, MockNavigatorMozIccManager,
           MockTelephonyHelper */

'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/elements/gaia_menu/mock_gaia_menu.js');
require('/shared/test/unit/mocks/dialer/mock_telephony_helper.js');

require('/shared/js/component_utils.js');
require('/shared/elements/gaia_sim_picker/script.js');

var mocksHelperForGaiaSimPicker = new MocksHelper([
  'LazyLoader'
]).init();

suite('GaiaSimPicker', function() {
  var subject;
  var realMozIccManager;
  var realL10n;
  var realTelephonyHelper;
  var menu;
  var header;

  mocksHelperForGaiaSimPicker.attachTestHelpers();

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    navigator.mozIccManager.mTeardown();

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realTelephonyHelper = window.TelephonyHelper;
    window.TelephonyHelper = null;
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozL10n = realL10n;

    window.TelephonyHelper = realTelephonyHelper;
  });

  setup(function() {
    this.sinon.spy(MockGaiaMenu, 'show');
    this.sinon.stub(MockL10n, 'ready');
    this.sinon.stub(MockL10n, 'once');
    this.sinon.useFakeTimers();

    this.container = document.createElement('div');
    this.container.innerHTML =
      '<gaia-sim-picker></gaia-sim-picker>';
    subject = this.container.firstElementChild;
    subject._menu = MockGaiaMenu;

    this.sinon.spy(subject, 'focus');

    navigator.mozIccManager.addIcc(0, {});
    navigator.mozIccManager.addIcc(1, {});

    subject.getOrPick(0, '1111');

    header = subject.shadowRoot.querySelector('#sim-picker-dial-via');
    menu = subject.shadowRoot.querySelector('gaia-menu');
  });

  teardown(function() {
    navigator.mozIccManager.mTeardown();
  });

  suite('getOrPick/getInUseSim', function() {
    test('header should contain phone number when getter provided', function() {
      this.sinon.spy(MockL10n, 'setAttributes');
      this.sinon.spy(MockL10n, 'translateFragment');
      subject.getOrPick(0, '1111');
      sinon.assert.calledWith(MockL10n.setAttributes,
                              header,
                              'gaia-sim-picker-dial-via-with-number',
                              {phoneNumber: '1111'});
      sinon.assert.calledWith(MockL10n.translateFragment, subject.shadowRoot);
    });

    test('header should not contain phone number when getter not provided',
         function() {
      this.sinon.spy(MockL10n, 'translateFragment');
      subject.getOrPick(0, null);
      assert.equal(header.getAttribute('data-l10n-id'),
                   'gaia-sim-picker-select-sim');
      sinon.assert.calledWith(MockL10n.translateFragment, subject.shadowRoot);
    });

    test('show the menu twice with different args', function() {
      this.sinon.spy(MockL10n, 'setAttributes');
      this.sinon.spy(MockL10n, 'translateFragment');

      subject.getOrPick(0, '1111');
      sinon.assert.calledWith(MockL10n.setAttributes,
                              header,
                              'gaia-sim-picker-dial-via-with-number',
                              {phoneNumber: '1111'});

      var buttons = menu.querySelectorAll('button');
      assert.equal(buttons.length, 2);

      subject.getOrPick(0, '2222');
      sinon.assert.calledWith(MockL10n.setAttributes,
                              header,
                              'gaia-sim-picker-dial-via-with-number',
                              {phoneNumber: '2222'});
      assert.equal(buttons.length, 2);
      sinon.assert.alwaysCalledWith(
        MockL10n.translateFragment, subject.shadowRoot
      );
      sinon.assert.calledTwice(MockL10n.translateFragment);
    });

    test('should show the menu after l10n is ready', function() {
      MockL10n.once.yield();
      sinon.assert.calledOnce(MockGaiaMenu.show);
    });

    test('should focus on self after l10n is ready', function() {
      MockL10n.once.yield();
      sinon.assert.calledOnce(subject.focus);
    });

    test('should retranslate after a language change', function() {
      this.sinon.stub(MockL10n, 'translateFragment');
      MockL10n.ready.yield();
      sinon.assert.calledWith(MockL10n.translateFragment, subject.shadowRoot);
    });
  });

  suite('buttons', function() {
    test('should have 2 option buttons', function() {
      var buttons = menu.querySelectorAll('button');
      assert.equal(buttons.length, 2);
    });

    test('should mark default SIM', function() {
      var buttons = menu.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        assert.equal(buttons[i].classList.contains('is-default'), i === 0);
      }
    });

    test('should not mark default SIM when none is set', function() {
      subject.getOrPick(undefined, '2222');

      var buttons = menu.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        assert.isFalse(buttons[i].classList.contains('is-default'));
      }
    });
  });

  suite('callbacks and functions', function() {
    var domEventStub;
    var callbackStub;
    var passedEvent;
    var buttons;

    // We must do this because sinon doesn't deep-copy the passed event, which
    // excludes its `detail` attr in its stub.args array.
    var copyPassedEvent = function(e) {
      passedEvent = e;
      domEventStub(e);
    };

    setup(function() {
      domEventStub = this.sinon.stub();
      callbackStub = this.sinon.stub();

      subject.addEventListener('gaiasimpicker-simselected', copyPassedEvent);
      subject.getOrPick(0, '1111', callbackStub);

      // The first child is the header.
      buttons = menu.querySelectorAll('button');
    });

    teardown(function() {
      subject.removeEventListener('gaiasimpicker-simselected', domEventStub);
    });

    [0, 1].forEach(function(cardIndex) {
      test('should dispatch DOM event when SIM ' + cardIndex + ' is selected',
      function() {
        buttons[cardIndex].click();

        sinon.assert.calledOnce(domEventStub);
        assert.equal(passedEvent.detail.cardIndex, cardIndex);
        assert.equal(menu.hidden, true);
      });

      test('should fire callback when SIM ' + cardIndex + ' is selected',
      function() {
        buttons[cardIndex].click();

        sinon.assert.calledWith(callbackStub, cardIndex);
      });

      test('should not fire callback if DOM event is preventDefaulted on SIM ' +
           cardIndex,
      function() {
        var callbackStub2 = this.sinon.stub();

        subject.addEventListener('gaiasimpicker-simselected', function _(e) {
          subject.removeEventListener('gaiasimpicker-simselected', _);
          e.preventDefault();
        });

        subject.getOrPick(0, '1111', callbackStub2);
        buttons[cardIndex].click();

        sinon.assert.notCalled(callbackStub2);
      });

      test('should fire all queued up callbacks on SIM ' + cardIndex,
      function() {
        callbackStub.reset();
        var callbackStub2 = this.sinon.stub();

        subject.getOrPick(0, '1111', callbackStub);
        subject.getOrPick(0, '1111', callbackStub2);

        buttons[cardIndex].click();

        sinon.assert.calledWith(callbackStub, cardIndex);
        sinon.assert.calledWith(callbackStub2, cardIndex);
      });

      test('should not fire stale callback on SIM ' + cardIndex, function() {
        // Should clear callbackStub from queued callbacks.
        buttons[cardIndex].click();
        callbackStub.reset();

        var callbackStub2 = this.sinon.stub();

        subject.getOrPick(0, '1111', callbackStub2);
        buttons[cardIndex].click();

        sinon.assert.notCalled(callbackStub);
        sinon.assert.calledWith(callbackStub2, cardIndex);
      });
    });
  });

  /**
   * Tests for special case code for the dialer. The code that it's testing
   * should have no impact anywhere else.
   */
  suite('with TelephonyHelper', function() {
    var realTelephonyHelper;

    suiteSetup(function() {
      realTelephonyHelper = window.TelephonyHelper;
      window.TelephonyHelper = MockTelephonyHelper;
    });

    suiteTeardown(function() {
      window.TelephonyHelper = realTelephonyHelper;
    });

    setup(function() {
      MockTelephonyHelper.mInUseSim = 1;
    });

    teardown(function() {
      MockTelephonyHelper.mTeardown();
    });

    test('should callback with in use serviceId', function(done) {
      subject.addEventListener('gaiasimpicker-simselected', function _(e) {
        subject.removeEventListener('gaiasimpicker-simselected', _);

        assert.equal(e.detail.cardIndex, 1);
        done();
      });

      subject.getOrPick(0, '1111');
    });
  });
});
