'use strict';

requireApp('system/js/carrier_info_notifier.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_notification_screen.js');
requireApp('system/test/unit/mock_l10n.js');


if (typeof window.ModalDialog == 'undefined') {
  window.ModalDialog = null;
}

if (typeof window.LockScreen == 'undefined') {
  window.LockScreen = null;
}

if (typeof window.NotificationScreen == 'undefined') {
  window.NotificationScreen = null;
}


suite('carrier info notifier >', function() {
  var subject;

  var realL10n;
  var realModalDialog;
  var realLockScreen;
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

    realLockScreen = window.LockScreen;
    window.LockScreen = MockLockScreen;

    realNotificationScreen = window.NotificationScreen;
    window.NotificationScreen = MockNotificationScreen;

  });

  test('CDMA record information: Unlocked', function(done) {
    var ptr = 0;
    MockLockScreen.locked = false;
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
    LockScreen.locked = true;
    MockNotificationScreen.mCallback = function(param) {
      assert.equal(param.text, expectedDisplay[ptr]);
      ptr++;
      if (ptr == expectedDisplay.length) {
        done();
      }
    };
    subject.showCDMA(testData);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;

    window.ModalDialog.mTeardown();
    window.ModalDialog = realModalDialog;

    window.LockScreen.mTeardown();
    window.LockScreen = realLockScreen;

    window.NotificationScreen.mTeardown();
    window.NotificationScreen = realNotificationScreen;
  });
});
