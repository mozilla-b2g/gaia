'use strict';

requireApp('system/js/carrier_info_notifier.js');
requireApp('system/test/unit/mock_modal_dialog.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_notification_screen.js');
require('/shared/test/unit/mocks/mock_l10n.js');

if (typeof window.ModalDialog == 'undefined') {
  window.ModalDialog = null;
}

if (typeof window.NotificationScreen == 'undefined') {
  window.NotificationScreen = null;
}

suite('carrier info notifier >', function() {
  var subject;

  var realL10n;
  var realModalDialog;
  var realNotificationScreen;
  var testData = {
    display: '0',
    extendedDisplay: {
      records: [
        { content: '1' },
        { content: '2' }
      ]
    }
  };
  var expectedDisplay = ['0', '1 2'];

  suiteSetup(function() {
    subject = CarrierInfoNotifier;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realModalDialog = window.ModalDialog;
    window.ModalDialog = MockModalDialog;

    window.System = window.MockSystem;
    window.System.locked = false;

    realNotificationScreen = window.NotificationScreen;
    window.NotificationScreen = MockNotificationScreen;

  });

  test('CDMA record information: Unlocked', function(done) {
    var ptr = 0;
    MockSystem.locked = false;
    ModalDialog.mCallback = function(param) {
      assert.equal(param.text, expectedDisplay[ptr]);
      ptr++;
      if (ptr == expectedDisplay.length) {
        done();
      }
    };
    subject.showCDMA(testData);
  });

  test('CDMA record information: locked', function(done) {
    var ptr = 0;
    var previousLocked = window.System.locked;
    window.System.locked = true;
    MockNotificationScreen.mCallback = function(param) {
      assert.equal(param.text, expectedDisplay[ptr]);
      ptr++;
      if (ptr == expectedDisplay.length) {
        done();
      }
    };
    subject.showCDMA(testData);
    window.System.locked = previousLocked;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;

    window.ModalDialog.mTeardown();
    window.ModalDialog = realModalDialog;

    window.System.locked = false;

    window.NotificationScreen.mTeardown();
    window.NotificationScreen = realNotificationScreen;
  });
});
