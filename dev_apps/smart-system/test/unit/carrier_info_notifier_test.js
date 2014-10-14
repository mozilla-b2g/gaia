/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/* global CarrierInfoNotifier */
/* global ModalDialog */
/* global MockNotificationScreen */
/* global MockModalDialog */
/* global MockSystem */

requireApp('system/js/carrier_info_notifier.js');
requireApp('system/test/unit/mock_modal_dialog.js');
require('/shared/test/unit/mocks/mock_system.js');
requireApp('system/test/unit/mock_notification_screen.js');

if (typeof window.ModalDialog == 'undefined') {
  window.ModalDialog = null;
}

if (typeof window.NotificationScreen == 'undefined') {
  window.NotificationScreen = null;
}

suite('carrier info notifier >', function() {
  var subject;

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
    window.ModalDialog.mTeardown();
    window.ModalDialog = realModalDialog;

    window.System.locked = false;

    window.NotificationScreen.mTeardown();
    window.NotificationScreen = realNotificationScreen;
  });
});
