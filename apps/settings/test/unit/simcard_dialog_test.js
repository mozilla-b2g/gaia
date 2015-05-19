/* global MocksHelper, MockNavigatorMozIccManager, MockL10n,
   MockNavigatorMozMobileConnections, SimPinDialog */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp('settings/shared/test/unit/mocks/mock_l10n.js');
requireApp('settings/test/unit/mock_settings.js');
requireApp('settings/js/simcard_dialog.js');
requireApp('settings/js/utils.js');

var mocksForSettingsHelper = new MocksHelper([
  'Settings'
]).init();

suite('SimCardDialog > ', function() {
  var realMozMobileConnections;
  var realIccManager;
  var realL10n;
  var dialog;
  var dialogDom;
  var dialogDoneButton;
  var dialogPinInput;
  var dialogPukInput;
  var dialogNewPinInput;
  var dialogConfirmPinInput;
  var errorMsgHeader;
  var fakeIccId = '1111';
  var realAlert;

  mocksForSettingsHelper.attachTestHelpers();

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realAlert = window.alert;
    window.alert = function(msg) { console.log('Alert: ' + msg); };
  });

  suiteTeardown(function() {
    window.alert = realAlert;
    window.navigator.mozL10n = realL10n;
    window.navigator.mozIccManager = realIccManager;
    window.navigator.mozMobileConnections = realMozMobileConnections;
  });

  setup(function() {
    loadBodyHTML('./_simpin_dialog.html');

    // We would add one more connection for this
    MockNavigatorMozIccManager.addIcc(fakeIccId, { retryCount: 0 });
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    MockNavigatorMozMobileConnections[1].iccId = fakeIccId;

    dialogDom = document.getElementById('simpin-dialog-mock');
    errorMsgHeader = dialogDom.querySelector('.sim-messageHeader');
    dialogDoneButton = dialogDom.querySelector('button[type="submit"]');
    dialogPinInput = dialogDom.querySelector('.sim-pinArea input');
    dialogPukInput = dialogDom.querySelector('.sim-pukArea input');
    dialogNewPinInput = dialogDom.querySelector('.sim-newPinArea input');
    dialogConfirmPinInput =
      dialogDom.querySelector('.sim-confirmPinArea input');

    dialog = new SimPinDialog(dialogDom);
  });

  teardown(function() {
    MockNavigatorMozMobileConnections.mRemoveMobileConnection();
    MockNavigatorMozIccManager.removeIcc(fakeIccId);
    document.body.innerHTML = '';
  });

  suite('enable simcardlock with retryCount is 0  > ', function() {
    var onsuccess;
    var oncancel;

    setup(function() {

      onsuccess = this.sinon.stub();
      oncancel = this.sinon.stub();

      // by default, mozMobileConnections[0] has one icc with iccId `111`
      dialog.show('enable_lock', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });

      dialogPinInput.value = '1234';
      dialogDoneButton.onclick();

      var icc = window.navigator.mozIccManager.getIccById(fakeIccId);
      icc._setCardLockCachedHandlers.onerror();
    });

    test('we would leave this dialog for system and just skip', function() {
      assert.isFalse(onsuccess.called);
      assert.isTrue(oncancel.called);
    });
  });

  suite('Test we get a generic error if no lockError name is provided',
        function() {
    var realGetIccByIndex;
    var icc;
    var onsuccess;
    var oncancel;
    var msgHeaderSpy;

    setup(function() {
      onsuccess = this.sinon.stub();
      oncancel = this.sinon.stub();

      icc = navigator.mozIccManager.getIccById('1111');
      this.sinon.stub(icc, 'updateContact', function(contact) {
        return {
          set onsuccess(callback) {},
          set onerror(callback) {
            this.error = {
              name: 'GenericError',
              lockType: 'fdn'
            };
            callback();
          }
        };
      });

      this.sinon.stub(icc, 'unlockCardLock', function(contact) {
        return {
          set onsuccess(callback) {},
          set onerror(callback) {
            this.error = {
              name: 'GenericError',
              lockType: 'fdn'
            };
            callback();
          }
        };
      });

      realGetIccByIndex = window.getIccByIndex;
      window.getIccByIndex = this.sinon.stub();
      window.getIccByIndex.returns(icc);

      msgHeaderSpy = this.sinon.spy(errorMsgHeader, 'setAttribute');
    });

    teardown(function() {
      window.getIccByIndex = realGetIccByIndex;
    });

    test('FDN Contact Update fails with a generic error', function() {
      // 'get_pin2' will trigger an `icc.updateContact` operation, which we
      // have mocked above to give an error.
      dialog.show('get_pin2', {
        cardIndex: 0,
        onsuccess: onsuccess,
        oncancel: oncancel
      });

      dialogPinInput.value = '1234';
      dialogDoneButton.onclick();

      assert.isFalse(onsuccess.called);
      assert.isTrue(oncancel.called);
    });

    test('Triggers generic error flow', function() {
      dialog.show('unlock_pin', {
        cardIndex: 0,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPinInput.value = '1234';
      dialogDoneButton.onclick();

      assert.isFalse(onsuccess.called);
      assert.isTrue(oncancel.called);
    });
  });

  suite('_updateDoneButtonState > ', function() {
    var onsuccess;
    var oncancel;

    setup(function() {
      onsuccess = this.sinon.stub();
      oncancel = this.sinon.stub();
    });

    test('in change_pin mode, but length of pinInput is less than 4',
      function() {
        dialog.show('change_pin', {
          cardIndex: 1,
          onsuccess: onsuccess,
          oncancel: oncancel
        });
        dialogPinInput.value = '1';
        dialogPinInput.oninput();
        assert.isTrue(dialogDoneButton.disabled);
    });

    test('in change_pin mode, but length of newPinInput is less than 4',
      function() {
        dialog.show('change_pin', {
          cardIndex: 1,
          onsuccess: onsuccess,
          oncancel: oncancel
        });
        dialogPinInput.value = '1234';
        dialogNewPinInput.value = '1';
        dialogPinInput.oninput();
        assert.isTrue(dialogDoneButton.disabled);
    });

    test('in change_pin mode, but length of confirmPinInput is less than 4',
      function() {
        dialog.show('change_pin', {
          cardIndex: 1,
          onsuccess: onsuccess,
          oncancel: oncancel
        });
        dialogPinInput.value = '1234';
        dialogNewPinInput.value = '5678';
        dialogConfirmPinInput.value = '1';
        dialogPinInput.oninput();
        assert.isTrue(dialogDoneButton.disabled);
    });

    test('in change_pin mode, ' +
      'but length of confirmPinInput & newPinInput is different', function() {
        dialog.show('change_pin', {
          cardIndex: 1,
          onsuccess: onsuccess,
          oncancel: oncancel
        });
        dialogPinInput.value = '1234';
        dialogNewPinInput.value = '5678';
        dialogConfirmPinInput.value = '567';
        dialogPinInput.oninput();
        assert.isTrue(dialogDoneButton.disabled);
    });

    test('in change_pin mode, ' +
      'and length of confirmPinInput & newPinInput is the same', function() {
        dialog.show('change_pin', {
          cardIndex: 1,
          onsuccess: onsuccess,
          oncancel: oncancel
        });
        dialogPinInput.value = '1234';
        dialogNewPinInput.value = '5678';
        dialogConfirmPinInput.value = '5679';
        dialogPinInput.oninput();
        assert.isFalse(dialogDoneButton.disabled);
    });

    test('in pin mode, and length of pinInput is less than 4', function() {
      dialog.show('unlock_pin', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPinInput.value = '1';
      dialogPinInput.oninput();
      assert.isTrue(dialogDoneButton.disabled);
    });

    test('in pin mode, but length of pinInput is >= 4', function() {
      dialog.show('unlock_pin', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPinInput.value = '1234';
      dialogPinInput.oninput();
      assert.isFalse(dialogDoneButton.disabled);
    });

    test('in puk mode, and length of pukInput is less than 4', function() {
      dialog.show('unlock_puk', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPukInput.value = '1';
      dialogPukInput.oninput();
      assert.isTrue(dialogDoneButton.disabled);
    });

    test('in puk mode, and length of pukInput is >= 4', function() {
      dialog.show('unlock_puk', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPukInput.value = '1234';
      dialogPukInput.oninput();
      assert.isFalse(dialogDoneButton.disabled);
    });

    test('in unkown mode, will print out console', function() {
      sinon.stub(window.console, 'error');
      dialog.show('unknown_action', {
        cardIndex: 1,
        onsuccess: onsuccess,
        oncancel: oncancel
      });
      dialogPinInput.oninput();
      assert.isTrue(window.console.error.called);
    });
  });
});
