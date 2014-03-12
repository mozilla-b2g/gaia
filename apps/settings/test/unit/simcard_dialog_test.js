/* global MocksHelper, MockNavigatorMozIccManager, MockL10n,
   MockNavigatorMozMobileConnections, SimPinDialog */
'use strict';

requireApp(
  'settings/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
requireApp('settings/shared/test/unit/load_body_html_helper.js');
requireApp('settings/test/unit/mock_l10n.js');
requireApp('settings/test/unit/mock_settings.js');
requireApp('settings/js/simcard_dialog.js');

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
  var fakeIccId = '1111';

  mocksForSettingsHelper.attachTestHelpers();

  suiteSetup(function() {
    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    realIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
  });

  suiteTeardown(function() {
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
    dialogDoneButton = dialogDom.querySelector('button[type="submit"]');
    dialogPinInput = dialogDom.querySelector('input');
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
});
