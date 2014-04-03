/* globals MocksHelper, MockMozMobileConnection, MmiManager, MockMmiUI,
           MmiManager, SUCCESS_MMI_MSG, SUCCESS_MMI_MSG, SUCCESS_MMI_NO_MSG,
           FAILED_MMI_MSG, FAILED_MMI_MSG, FAILED_MMI_NO_MSG, MMI_MSG */

'use strict';

requireApp('communications/dialer/js/mmi.js');
requireApp('communications/dialer/test/unit/mock_l10n.js');
requireApp('communications/dialer/test/unit/mock_mmi_ui.js');
requireApp('communications/dialer/test/unit/mock_mozMobileConnection.js');
requireApp('communications/dialer/test/unit/mock_lazy_loader.js');

require('/shared/test/unit/mocks/mock_mobile_operator.js');

const TINY_TIMEOUT = 5;

var mocksHelperForMMI = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'MobileOperator'
]).init();

suite('dialer/mmi', function() {
  var realMobileConnection;

  mocksHelperForMMI.attachTestHelpers();

  setup(function() {
    realMobileConnection = window.navigator.mozMobileConnection;
    window.navigator.mozMobileConnection = MockMozMobileConnection;

    MmiManager._ui = MockMmiUI;
    window.addEventListener('message',
                            MmiManager._ui.postMessage.bind(MmiManager._ui));
    MmiManager.ready = true;
  });

  teardown(function() {
    delete MockMozMobileConnection.voice.type;
    delete MockMozMobileConnection.supportedNetworkTypes;

    window.navigator.mozMobileConnection = realMobileConnection;

    MmiManager._conn.mTeardown();
    MmiManager._ui.teardown();
  });

  suite('Validate MMI codes', function() {
    setup(function(done) {
      MmiManager.init(done);
    });

    test('Check an MMI code', function() {
      assert.isTrue(MmiManager.isMMI('*123#'));
    });

    test('Check a non-MMI code', function() {
      assert.isFalse(MmiManager.isMMI('123'));
    });

    test('In CDMA networks MMI codes are never allowed', function() {
      var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];

      for (var i = 0; i < cdmaTypes.length; i++) {
        MockMozMobileConnection.voice.type = cdmaTypes[i];
        assert.isFalse(MmiManager.isMMI('*123#'));
      }
    });

    test('Requesting the IMEI is allowed on phones supporting GSM networks',
      function() {
        MockMozMobileConnection.supportedNetworkTypes = ['gsm', 'lte', 'wcdma'];
        MockMozMobileConnection.voice.type = 'is95a';
        assert.isTrue(MmiManager.isMMI('*#06#'));

        MockMozMobileConnection.supportedNetworkTypes = ['cdma', 'evdo'];
        MockMozMobileConnection.voice.type = 'evdoa';
        assert.isFalse(MmiManager.isMMI('*#06#'));
      });
  });

  suite('Successfully send mmi message with result', function() {
    setup(function() {
      MmiManager.send(SUCCESS_MMI_MSG);
    });

    test('Check request result', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, SUCCESS_MMI_MSG);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded null', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Successfully send mmi message no result', function() {
    setup(function() {
      MmiManager.send(SUCCESS_MMI_NO_MSG);
    });

    test('Check empty request result', function(done) {
      setTimeout(function() {
        assert.isUndefined(MmiManager._ui._messageReceived);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded null', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Error sending mmi message with result', function() {
    setup(function() {
      MmiManager.send(FAILED_MMI_MSG);
    });

    test('Check request result', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, FAILED_MMI_MSG);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded null', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Error sending mmi message no result', function() {
    setup(function() {
      MmiManager.send(FAILED_MMI_NO_MSG);
    });

    test('Check empty request result', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, 'GenericFailure');
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded null', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Mmi received with message and session active', function() {
    setup(function() {
      MmiManager._conn.triggerUssdReceived(MMI_MSG, false);
    });

    test('Check request result', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, MMI_MSG);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded false', function(done) {
      setTimeout(function() {
        assert.isFalse(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Mmi received with message and session ended', function() {
    setup(function() {
      MmiManager._conn.triggerUssdReceived(MMI_MSG, true);
    });

    test('Check message', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, MMI_MSG);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded true', function(done) {
      setTimeout(function() {
        assert.isTrue(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Mmi received with no message and session active', function() {
    setup(function() {
      MmiManager._ui._messageReceived = null;
      MmiManager._ui._sessionEnded = null;
      MmiManager._conn.triggerUssdReceived(null, false);
    });

    test('Check no message received', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._messageReceived);
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });

  });

  suite('Mmi received with no message and session ended', function() {
    setup(function() {
      MmiManager._conn.triggerUssdReceived(null, true);
    });

    test('Check no message', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._messageReceived);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded true', function(done) {
      setTimeout(function() {
        assert.isTrue(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Mmi message reply via UI', function() {
    setup(function() {
      MmiManager._ui.reply(SUCCESS_MMI_MSG);
    });

    test('Check request result', function(done) {
      setTimeout(function() {
        assert.equal(MmiManager._ui._messageReceived, SUCCESS_MMI_MSG);
        done();
      }, TINY_TIMEOUT);
    });

    test('Check sessionEnded null', function(done) {
      setTimeout(function() {
        assert.isNull(MmiManager._ui._sessionEnded);
        done();
      }, TINY_TIMEOUT);
    });
  });

  /** Temporary disable CF tests until Bug 884343 (Use MMIResult for Call
   *   Forwarding related functionality) is done.

  suite('Call forwarding request via MMI. Active voice', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_VOICE);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_DATA);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-data'].data, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data sync', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_DATA_SYNC);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active data async', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_DATA_ASYNC);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-async'].async, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active package', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_PACKET);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Active PAD', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ACTIVE_PAD);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. All inactive', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_ALL_INACTIVE);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-data'].data, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Two rules', function() {
    test('Check call forwarding rules', function(done) {
      MmiManager.send(MMI_CF_MSG_TWO_RULES);
      setTimeout(function() {
        assert.equal(MockLazyL10n.keys['cf-voice'].voice, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-data'].data, EXPECTED_PHONE);
        assert.equal(MockLazyL10n.keys['cf-fax'].fax, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sms'].sms, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-sync'].sync, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-async'].async, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-packet'].packet, 'cf-inactive');
        assert.equal(MockLazyL10n.keys['cf-pad'].pad, 'cf-inactive');
        done();
      }, TINY_TIMEOUT);
    });
  });

  suite('Call forwarding request via MMI. Invalid', function() {
    setup(function() {
      MmiManager.send(MMI_CF_MSG_INVALID_SERVICE_CLASS);
    });

    test('Check call forwarding rules', function() {
      assert.equal(MmiManager._ui._messageReceived, null);
    });
  });

  */
});
