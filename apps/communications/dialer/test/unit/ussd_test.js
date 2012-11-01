requireApp('communications/dialer/js/ussd.js');

requireApp('communications/dialer/test/unit/mock_ussd_ui.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');

suite('dialer/ussd', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function ml_get(key) {
        return key;
      }
    };
    UssdManager._conn = MockMozMobileConnection;
    UssdManager.init();
    UssdManager._popup = MockUssdUI;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    UssdManager._popup = null;
  });

  teardown(function() {
    UssdManager._conn.teardown();
    if (UssdManager._popup)
      UssdManager._popup.teardown();
  });

  suite('Successfully send ussd message with result', function() {
    setup(function() {
      UssdManager.send(SUCCESS_MMI_MSG);
    });

    test('Check request result', function() {
      assert.equal(UssdManager._popup._messageReceived, SUCCESS_MMI_MSG);
    });

    test('Check sessionEnded null', function() {
      assert.isNull(UssdManager._popup._sessionEnded);
    });
  });

  suite('Successfully send ussd message no result', function() {
    setup(function() {
      UssdManager.send(SUCCESS_MMI_NO_MSG);
    });

    test('Check empty request result', function() {
      assert.isNull(UssdManager._popup._messageReceived);
    });

    test('Check sessionEnded null', function() {
      assert.isNull(UssdManager._popup._sessionEnded);
    });
  });

  suite('Error sending ussd message with result', function() {
    setup(function() {
      UssdManager.send(FAILED_MMI_MSG);
    });

    test('Check request result', function() {
      assert.equal(UssdManager._popup._messageReceived, FAILED_MMI_MSG);
    });

    test('Check sessionEnded null', function() {
      assert.isNull(UssdManager._popup._sessionEnded);
    });
  });

  suite('Error sending ussd message no result', function() {
    setup(function() {
      UssdManager.send(FAILED_MMI_NO_MSG);
    });

    test('Check empty request result', function() {
      assert.isNull(UssdManager._popup._messageReceived);
    });

    test('Check sessionEnded null', function() {
      assert.isNull(UssdManager._popup._sessionEnded);
    });
  });

  suite('Ussd received with message and session active', function() {
    setup(function() {
      UssdManager._conn.triggerUssdReceived(USSD_MSG, false);
    });

    test('Check request result', function() {
      assert.equal(UssdManager._popup._messageReceived, USSD_MSG);
    });

    test('Check sessionEnded false', function() {
      assert.isFalse(UssdManager._popup._sessionEnded);
    });
  });

  suite('Ussd received with message and session ended', function() {
    setup(function() {
      UssdManager._conn.triggerUssdReceived(USSD_MSG, true);
    });

    test('Check message', function() {
      assert.equal(UssdManager._popup._messageReceived, USSD_MSG);
    });

    test('Check sessionEnded true', function() {
      assert.isTrue(UssdManager._popup._sessionEnded);
    });
  });

  suite('Ussd received with no message and session active', function() {
    setup(function() {
      UssdManager._popup._messageReceived = null;
      UssdManager._popup._sessionEnded = null;
      UssdManager._conn.triggerUssdReceived(null, false);
    });

    test('Check no message received', function() {
      assert.isNull(UssdManager._popup._messageReceived);
      assert.isNull(UssdManager._popup._sessionEnded);
    });

  });

  suite('Ussd received with no message and session ended', function() {
    setup(function() {
      UssdManager._conn.triggerUssdReceived(null, true);
    });

    test('Check no message', function() {
      assert.isNull(UssdManager._popup._messageReceived);
    });

    test('Check sessionEnded true', function() {
      assert.isTrue(UssdManager._popup._sessionEnded);
    });
  });

  suite('Ussd message reply via UI', function() {
    setup(function() {
      UssdManager._popup.reply(SUCCESS_MMI_MSG);
    });

    test('Check request result', function() {
      assert.equal(UssdManager._popup._messageReceived, SUCCESS_MMI_MSG);
    });

    test('Check sessionEnded null', function() {
      assert.isNull(UssdManager._popup._sessionEnded);
    });
  });

  suite('Cancel ussd via UI', function() {
    setup(function() {
      UssdManager._popup.closeWindow();
    });

    test('Check ussd UI closed', function() {
      assert.isNull(UssdManager._popup);
    });

  });
});
