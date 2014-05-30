/* globals SimPicker, MocksHelper, MockMozL10n, MockNavigatorMozIccManager,
           MockTelephonyHelper */

'use strict';

require('/dialer/test/unit/mock_lazy_loader.js');
require('/dialer/test/unit/mock_telephony_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');

require('/shared/js/sim_picker.js');

var mocksHelperForSimPicker = new MocksHelper([
  'LazyLoader',
  'LazyL10n'
]).init();

suite('SIM picker', function() {
  var subject;
  var realMozIccManager;
  var realMozL10n;
  var realTelephonyHelper;
  var menu;
  var header;

  mocksHelperForSimPicker.attachTestHelpers();

  var loadBody = function() {
    loadBodyHTML('/shared/elements/sim_picker.html');
    document.body.innerHTML = document.body.querySelector('template').innerHTML;
  };

  suiteSetup(function() {
    subject = SimPicker;

    loadBody();

    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;
    navigator.mozIccManager.mTeardown();

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;
    navigator.mozL10n.localize = function() {};

    realTelephonyHelper = window.TelephonyHelper;
    window.TelephonyHelper = null;

    menu = document.querySelector('menu');
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozL10n = realMozL10n;

    window.TelephonyHelper = realTelephonyHelper;
  });

  setup(function() {
    navigator.mozIccManager.addIcc(0, {});
    navigator.mozIccManager.addIcc(1, {});

    subject.getOrPick(0, '1111', function() {});

    header = document.getElementById('sim-picker-dial-via');
  });

  teardown(function() {
    navigator.mozIccManager.mTeardown();
  });

  suite('getOrPick/getInUseSim', function() {
    test('header should contain phone number when getter provided', function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
      subject.getOrPick(0, '1111', function() {});
      sinon.assert.calledWith(localizeSpy,
                              header,
                              'sim-picker-dial-via-with-number',
                              {phoneNumber: '1111'});
    });

    test('header should not contain phone number when getter not provided',
         function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');
      subject.getOrPick(0, null, function() {});
      sinon.assert.calledWith(localizeSpy,
                              header,
                              'sim-picker-select-sim');
    });

    test('show the menu twice with different args', function() {
      var localizeSpy = this.sinon.spy(MockMozL10n, 'localize');

      subject.getOrPick(0, '1111', function() {});
      sinon.assert.calledWith(localizeSpy,
                              header,
                              'sim-picker-dial-via-with-number',
                              {phoneNumber: '1111'});
      assert.equal(menu.children.length, 3);

      subject.getOrPick(0, '2222', function() {});
      sinon.assert.calledWith(localizeSpy,
                              header,
                              'sim-picker-dial-via-with-number',
                              {phoneNumber: '2222'});
      assert.equal(menu.children.length, 3);
    });

    test('should show the menu', function() {
      assert.equal(document.getElementById('sim-picker').hidden, false);
    });

    test('should focus on the menu', function() {
      var simPickerElt = document.getElementById('sim-picker');

      var focusSpy = this.sinon.spy(simPickerElt, 'focus');
      subject.getOrPick(0, '1111', function() {});

      sinon.assert.calledOnce(focusSpy);
    });
  });

  suite('buttons', function() {
    test('should have 2 option buttons', function() {
      var buttonNum = 0;
      for (var i = 0; i < menu.children.length; i++) {
        if (menu.children[i].dataset.l10nId !== 'cancel') {
          buttonNum++;
        }
      }
      assert.equal(buttonNum, 2);
    });

    test('should have 3 buttons in total', function() {
      assert.equal(menu.children.length, 3);
    });

    test('should mark default SIM', function() {
      for (var i = 0; i < menu.children.length; i++) {
        assert.equal(
          menu.children[i].classList.contains('is-default'), i === 0);
      }
    });

    test('should not mark default SIM when none is set', function() {
      subject.getOrPick(undefined, '2222', function() {});
      for (var i = 0; i < menu.children.length; i++) {
        assert.isFalse(menu.children[i].classList.contains('is-default'));
      }
    });
  });

  suite('callbacks and functions', function() {
    setup(function() {
      loadBody();
    });

    test('should fire callback when a SIM is selected', function() {
      var callbackStub = this.sinon.stub();
      subject.getOrPick(0, '1111', callbackStub);

      menu.children[0].click();

      sinon.assert.calledOnce(callbackStub);
      assert.equal(document.getElementById('sim-picker').hidden, true);
    });

    test('should close menu when pressing cancel button', function() {
      var callbackStub = this.sinon.stub();
      subject.getOrPick(0, '1111', callbackStub);

      menu.children[2].click();

      sinon.assert.notCalled(callbackStub);
      assert.equal(document.getElementById('sim-picker').hidden, true);
    });
  });

  suite('with a call in progress', function() {
    suiteSetup(function() {
      window.TelephonyHelper = MockTelephonyHelper;
    });

    suiteTeardown(function() {
      window.TelephonyHelper = null;
    });

    setup(function() {
      MockTelephonyHelper.mInUseSim = 1;
    });

    teardown(function() {
      MockTelephonyHelper.mTeardown();
    });

    test('should callback with in use serviceId', function() {
      var callbackStub = this.sinon.stub();
      subject.getOrPick(0, '1111', callbackStub);
      sinon.assert.calledWith(callbackStub, 1);
    });
  });
});
