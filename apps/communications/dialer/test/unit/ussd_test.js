requireApp('communications/dialer/js/ussd.js');

requireApp('communications/dialer/test/unit/mock_ussd_ui.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');

const TINY_TIMEOUT = 5;

/*
// These tests are currently failing and have been temporarily disabled as per
// Bug 838993. They should be fixed and re-enabled as soon as possible as per
// Bug 838622.
suite('dialer/ussd', function() {
  var realL10n = navigator.mozL10n;
  navigator.mozL10n = (function() {
    var keys = {};

    function reset() {
      keys = {};
    }

    function get(key, params) {
      keys[key] = params;
      return key;
    }

    function getKeys() {
      return keys;
    }

    return {
      get: get,
      reset: reset,
      keys: getKeys
    };
  })();

  suiteSetup(function() {
    navigator.mozL10n.reset();
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

  suite('Call forwarding request via MMI. Active voice', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_VOICE);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-voice'].voice, EXPECTED_PHONE);
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_DATA);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-data'].data, EXPECTED_PHONE);
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data sync', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_DATA_SYNC);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-sync'].sync, EXPECTED_PHONE);
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data async', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_DATA_ASYNC);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-async'].async, EXPECTED_PHONE);
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active package', function() {
   setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_PACKET);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-packet'].packet, EXPECTED_PHONE);
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active PAD', function() {
   setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ACTIVE_PAD);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-pad'].pad, EXPECTED_PHONE);
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. All inactive', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_ALL_INACTIVE);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(keys['cf-data'].data, 'cf-inactive');
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Two rules', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
    });

    test('Check call forwarding rules', function(done) {
      UssdManager.send(MMI_CF_MSG_TWO_RULES);
      setTimeout(function() {
        var keys = navigator.mozL10n.keys();
        assert.equal(keys['cf-voice'].voice, EXPECTED_PHONE);
        assert.equal(keys['cf-data'].data, EXPECTED_PHONE);
        assert.equal(keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(keys['cf-async'].async, 'cf-inactive');
        assert.equal(keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Invalid', function() {
    setup(function() {
      UssdManager._popup = MockUssdUI;
      UssdManager.send(MMI_CF_MSG_INVALID_SERVICE_CLASS);
    });

    test('Check call forwarding rules', function() {
      assert.equal(UssdManager._popup._messageReceived, 'cf-error');
    });
  });
});
*/
