'use strict';

/* globals MocksHelper, MockNavigatorMozIccManager, MockNavigatorSettings,
   PhoneNumberActionMenu, CallHandler, MockSimPicker */

require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/dialer/test/unit/mock_call_handler.js');
require('/dialer/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_sim_picker.js');
require('/shared/test/unit/mocks/dialer/mock_lazy_l10n.js');

requireApp('communications/dialer/js/phone_action_menu.js');

var mocksHelperForPhoneActionMenu = new MocksHelper([
  'CallHandler',
  'LazyLoader',
  'LazyL10n',
  'SimPicker'
]).init();

if (!window.asyncStorage) {
  window.asyncStorage = null;
}

suite('phone action menu', function() {
  mocksHelperForPhoneActionMenu.attachTestHelpers();

  var realMozIccManager;
  var realMozSettings;
  var realAsyncStorage;
  var fakeNodes = ['add-contact-action-menu', 'call-menuitem',
                   'send-sms-menuitem', 'create-new-contact-menuitem',
                   'add-to-existing-contact-menuitem', 'cancel-action-menu',
                   'add-contact-action-title'];

  suiteSetup(function() {
    realMozIccManager = navigator.mozIccManager;
    navigator.mozIccManager = MockNavigatorMozIccManager;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = {
      setItem: function() {}
    };

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    fakeNodes.forEach(function(id) {
      var elem = document.createElement('div');
      elem.id = id;
      document.body.appendChild(elem);
    });
  });

  suiteTeardown(function() {
    navigator.mozIccManager = realMozIccManager;
    navigator.mozSettings = realMozSettings;
    window.asyncStorage = realAsyncStorage;

    fakeNodes.forEach(function(id) {
      var elem = document.getElementById(id);
      elem.parentNode.removeChild(elem);
    });
  });

  setup(function() {
    MockNavigatorSettings.mSyncRepliesOnly = true;
    PhoneNumberActionMenu.show(null, '123');
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('Open contact details', function() {
    var contactsIframe;
    var testContact = {
      id: '456',
      matchingTel: {
        value: '111222333'
      }
    };

    setup(function() {
      contactsIframe = document.createElement('iframe');
      contactsIframe.id = 'iframe-contacts';
      window.document.body.appendChild(contactsIframe);
      this.sinon.useFakeTimers();
    });

    teardown(function() {
      window.document.body.removeChild(contactsIframe);
      contactsIframe = null;
    });

    test('regular call', function() {
      contactsIframe = document.getElementById('iframe-contacts');
      PhoneNumberActionMenu.show(
        testContact.id,
        testContact.matchingTel.value,
        null,
        false
      );
      var url = 'index.html#view-contact-details?id=' + testContact.id +
                '&tel=' + testContact.matchingTel.value +
                '&back_to_previous_tab=1&isMissedCall=false';

      this.sinon.clock.tick();
      assert.include(contactsIframe.src, url);
    });

    test('missed call', function() {
      contactsIframe = document.getElementById('iframe-contacts');
      PhoneNumberActionMenu.show(
        testContact.id,
        testContact.matchingTel.value,
        null,
        true
      );
      var url = 'index.html#view-contact-details?id=' + testContact.id +
                '&tel=' + testContact.matchingTel.value +
                '&back_to_previous_tab=1&isMissedCall=true';

      this.sinon.clock.tick();
      assert.include(contactsIframe.src, url);
    });
  });

  suite('call option', function() {
    function chooseCall() {
      var callOptionItem = document.getElementById('call-menuitem');
      callOptionItem.click();
    }

    suite('Mono SIM', function() {
      setup(function() {
        MockNavigatorMozIccManager.iccIds[0] = 0;
      });

      test('should call directly', function() {
        this.sinon.spy(CallHandler, 'call');
        chooseCall();
        sinon.assert.calledWith(CallHandler.call, '123', 0);
      });
    });

    suite('Multi SIM', function() {
      setup(function() {
        MockNavigatorMozIccManager.iccIds[0] = 0;
        navigator.mozIccManager.iccIds[1] = 1;
        MockNavigatorSettings.mSettings['ril.voicemail.defaultServiceId'] = 1;

        this.sinon.spy(MockSimPicker, 'getOrPick');
        this.sinon.spy(CallHandler, 'call');
        chooseCall();

        MockNavigatorSettings.mReplyToRequests();
      });

      test('should display the sim picker', function() {
        sinon.assert.calledWith(MockSimPicker.getOrPick, 1, '123');
      });

      test('should call with the result of the sim picker', function() {
        MockSimPicker.getOrPick.yield(0);
        sinon.assert.calledWith(CallHandler.call, '123', 0);
      });
    });
  });
});
