/* globals MockMobileconnection, MockMobileOperator, MockNavigatormozApps,
           MockNavigatorMozIccManager, MockNavigatorMozMobileConnections,
           CALL_BARRING_STATUS_MMI_CODE, CALL_WAITING_STATUS_MMI_CODE,
           MocksHelper, MmiManager, MockMmiUI, Notification */

'use strict';

require('/js/mmi.js');
require('/dialer/test/unit/mock_mmi_ui.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_lazy_l10n.js');
require('/shared/test/unit/mocks/mock_l10n.js');

const SUCCESS_MMI_NO_MSG = 'sucess_mmi_no_msg';
const FAILED_MMI_NO_MSG = 'failed_mmi_no_msg';
const SUCCESS_MMI_MSG = 'success_mmi_msg';
const FAILED_MMI_MSG = 'failed_mmi_msg';

const MMI_MSG = 'mmi_msg';

const MMI_CF_MSG_ACTIVE_VOICE = 'mmi_cf_active_voice';
const MMI_CF_MSG_ACTIVE_DATA = 'mmi_cf_active_data';
const MMI_CF_MSG_ACTIVE_FAX = 'mmi_cf_active_fax';
const MMI_CF_MSG_ACTIVE_DATA_SYNC = 'mmi_cf_active_data_sync';
const MMI_CF_MSG_ACTIVE_DATA_ASYNC = 'mmi_cf_active_data_async';
const MMI_CF_MSG_ACTIVE_PACKET = 'mmi_cf_active_package';
const MMI_CF_MSG_ACTIVE_PAD = 'mmi_cf_active_pad';
const MMI_CF_MSG_INVALID_SERVICE_CLASS = 'mmi_cf_invalid_sc';
const MMI_CF_MSG_ALL_INACTIVE = 'mmi_cf_all_inactive';
const MMI_CF_MSG_TWO_RULES = 'mmi_cf_two_rules';
const MMI_CALL_BARRING_STATUS_ENABLED = 'mmi_call_barring_status_enabled';
const MMI_CALL_BARRING_STATUS_DISABLED = 'mmi_call_barring_status_disabled';
const MMI_CALL_WAITING_STATUS_ENABLED = 'mmi_call_waiting_status_enabled';
const MMI_CALL_WAITING_STATUS_DISABLED = 'mmi_call_waiting_status_disabled';

const ICC_SERVICE_CLASS_VOICE = (1 << 0);
const ICC_SERVICE_CLASS_DATA = (1 << 1);
const ICC_SERVICE_CLASS_FAX = (1 << 2);
// const ICC_SERVICE_CLASS_SMS = (1 << 3);
const ICC_SERVICE_CLASS_DATA_SYNC = (1 << 4);
const ICC_SERVICE_CLASS_DATA_ASYNC = (1 << 5);
const ICC_SERVICE_CLASS_PACKET = (1 << 6);
const ICC_SERVICE_CLASS_PAD = (1 << 7);
// const ICC_SERVICE_CLASS_MAX = (1 << 7);

const EXPECTED_PHONE = '+34666222111';

const TINY_TIMEOUT = 5;

var mocksHelperForMMI = new MocksHelper([
  'LazyL10n',
  'LazyLoader',
  'MobileOperator',
  'Notification',
  'NotificationHelper'
]).init();

suite('dialer/mmi', function() {
  var realMozApps;
  var realMozIccManager;
  var realMobileConnections;
  var mobileConn;

  function sendMMIStub(message) {
    var evt = {
      target: {
        result: null,
        error: {
          name: null
        }
      }
    };

    switch (message) {
      case SUCCESS_MMI_NO_MSG:
        evt.target.result = {
          serviceCode: 'scFoo',
          statusMessage: null
        };
        MmiManager.notifySuccess(evt);
        break;
      case SUCCESS_MMI_MSG:
        evt.target.result = {
          serviceCode: 'scFoo',
          statusMessage: SUCCESS_MMI_MSG
        };
        MmiManager.notifySuccess(evt);
        break;
      case FAILED_MMI_NO_MSG:
        evt.target.error = {
          serviceCode: 'scFoo',
          name: null
        };
        MmiManager.notifyError(evt);
        break;
      case FAILED_MMI_MSG:
        evt.target.error = {
          serviceCode: 'scFoo',
          name: FAILED_MMI_MSG
        };
        MmiManager.notifyError(evt);
        break;
      case MMI_CF_MSG_ACTIVE_VOICE:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_VOICE
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_DATA
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_FAX:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_FAX
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA_SYNC:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_DATA_SYNC
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_DATA_ASYNC:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_DATA_ASYNC
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_PACKET:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_PACKET
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ACTIVE_PAD:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_PAD
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_INVALID_SERVICE_CLASS:
        evt.target.result = [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: -1
        }];
        MmiManager.notifySuccess(evt);
        break;
     case MMI_CF_MSG_TWO_RULES:
        evt.target.result = {
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_VOICE
          },{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: ICC_SERVICE_CLASS_DATA
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CF_MSG_ALL_INACTIVE:
        evt.target.result = {
          additionalInformation: [{
            active: false
          }]
        };
        MmiManager.notifySuccess(evt);
        break;
      case MMI_CALL_BARRING_STATUS_ENABLED:
        evt.target.result = {
          serviceCode: 'scCallBarring',
          statusMessage: 'smServiceEnabled'
        };
        MmiManager.notifySuccess(evt, CALL_BARRING_STATUS_MMI_CODE);
        break;
      case MMI_CALL_BARRING_STATUS_DISABLED:
        evt.target.result = {
          serviceCode: 'scCallBarring',
          statusMessage: 'smServiceDisabled'
        };
        MmiManager.notifySuccess(evt, CALL_BARRING_STATUS_MMI_CODE);
        break;
      case MMI_CALL_WAITING_STATUS_ENABLED:
        evt.target.result = {
          serviceCode: 'scCallWaiting',
          statusMessage: 'smServiceEnabled'
        };
        MmiManager.notifySuccess(evt, CALL_WAITING_STATUS_MMI_CODE);
        break;
      case MMI_CALL_WAITING_STATUS_DISABLED:
        evt.target.result = {
          serviceCode: 'scCallWaiting',
          statusMessage: 'smServiceDisabled'
        };
        MmiManager.notifySuccess(evt, CALL_WAITING_STATUS_MMI_CODE);
        break;
    }

    var domRequest = {};
    return domRequest;
  }

  mocksHelperForMMI.attachTestHelpers();

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    /* Replace the default mock connection with our own specialized version
     * tailored for this suite of tests. */
    mobileConn = new MockMobileconnection();
    sinon.stub(mobileConn, 'sendMMI', sendMMIStub);
  });

  suiteTeardown(function() {
    navigator.mozApps = realMozApps;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozMobileConnections = realMobileConnections;
  });

  setup(function() {
    MockNavigatorMozMobileConnections.mRemoveMobileConnection(0);
    MockNavigatorMozMobileConnections.mAddMobileConnection(mobileConn, 0);
    MmiManager._ui = MockMmiUI;
    window.addEventListener('message',
                            MmiManager._ui.postMessage.bind(MmiManager._ui));
    MmiManager.ready = true;
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    mobileConn.mTeardown();
    MmiManager._ui.teardown();
    MmiManager._conn = null;
  });

  suite('Validate MMI codes', function() {
    setup(function(done) {
      MmiManager.init(done);
    });

    test('Check an MMI code', function() {
      assert.isTrue(MmiManager.isMMI('*123#', 0));
    });

    test('Check a non-MMI code', function() {
      assert.isFalse(MmiManager.isMMI('123', 0));
    });

    test('In CDMA networks MMI codes are never allowed', function() {
      var cdmaTypes = ['evdo0', 'evdoa', 'evdob', '1xrtt', 'is95a', 'is95b'];

      for (var i = 0; i < cdmaTypes.length; i++) {
        mobileConn.voice = { type: cdmaTypes[i] };
        assert.isFalse(MmiManager.isMMI('*123#', 0));
      }
    });

    test('Requesting the IMEI is allowed on phones supporting GSM networks',
      function() {
        mobileConn.supportedNetworkTypes = ['gsm', 'lte', 'wcdma'];
        mobileConn.voice = { type: 'is95a' };
        assert.isTrue(MmiManager.isMMI('*#06#', 0));

        mobileConn.supportedNetworkTypes = ['cdma', 'evdo'];
        mobileConn.voice = { type: 'evdoa' };
        assert.isFalse(MmiManager.isMMI('*#06#', 0));
      });
  });

  suite('Successfully send mmi message with result', function() {
    setup(function() {
      MmiManager.send(SUCCESS_MMI_MSG, 0);
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
      MmiManager.send(SUCCESS_MMI_NO_MSG, 0);
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
      MmiManager.send(FAILED_MMI_MSG, 0);
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
      MmiManager.send(FAILED_MMI_NO_MSG, 0);
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

  suite('Network initiated messages', function() {
    setup(function() {
      MockMobileOperator.mOperator = 'fake_carrier';
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
    });

    test('should handle network initiated messages properly', function() {
      this.sinon.spy(window, 'postMessage');
      MmiManager.handleMMIReceived(MMI_MSG, false);
      sinon.assert.calledWithMatch(window.postMessage,
        {type: 'mmi-received-ui'});
    });

    test('the notification is populated correctly for one SIM', function(done) {
      this.sinon.spy(window, 'Notification');
      this.sinon.spy(MmiManager, '_');

      var promise = MmiManager.sendNotification(MMI_MSG, 0);
      MockNavigatormozApps.mTriggerLastRequestSuccess();

      promise.then(function() {
        sinon.assert.calledOnce(Notification);
        sinon.assert.calledWithMatch(Notification, 'fake_carrier', {
          body: MMI_MSG,
          icon: 'sms/dialer?ussdMessage=1&cardIndex=0'
        });
        sinon.assert.notCalled(MmiManager._);
      }).then(done, done);
    });

    test('the notification is populated correctly for the second SIM',
      function(done) {
        this.sinon.spy(window, 'Notification');
        this.sinon.spy(MmiManager, '_');
        MockNavigatorMozIccManager.addIcc('1', { 'cardState' : 'ready' });

        var promise = MmiManager.sendNotification(MMI_MSG, 1);
        MockNavigatormozApps.mTriggerLastRequestSuccess();

        promise.then(function() {
          sinon.assert.calledOnce(Notification);
          sinon.assert.calledWithMatch(Notification,
            /notification-title-with-sim.*2/,
            {
              body: MMI_MSG,
              icon: 'sms/dialer?ussdMessage=1&cardIndex=1'
            }
          );
          sinon.assert.calledTwice(MmiManager._);
        }).then(done, done);
    });
  });

  suite('Mmi received with message and session active', function() {
    setup(function() {
      MmiManager.handleMMIReceived(MMI_MSG, false, 0);
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
      MmiManager.handleMMIReceived(MMI_MSG, true, 0);
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
      MmiManager.handleMMIReceived(null, false, 0);
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
      MmiManager.handleMMIReceived(null, true, 0);
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
      MmiManager._conn = mobileConn;
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

  suite('Mmi message reply via UI with multiple connections', function() {
    var simNum = 2;

    setup(function() {
      // Make this look like a DSDS setup
      var conn = new MockMobileconnection();
      sinon.stub(conn, 'sendMMI', mobileConn.sendMMI);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, simNum - 1);
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
      MockNavigatorMozIccManager.addIcc('1', { 'cardState' : 'ready' });

      MmiManager._conn = conn;
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

  suite('DSDS operation', function() {
    var simNum = 2;

    setup(function() {
      // Make this look like a DSDS setup
      var conn = new MockMobileconnection();
      this.sinon.stub(conn, 'sendMMI', sendMMIStub);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, simNum - 1);
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
      MockNavigatorMozIccManager.addIcc('1', { 'cardState' : 'ready' });

      MmiManager.handleMMIReceived(MMI_MSG, true, 1);
    });

    suite('Receiving a message', function() {
      test('Check title, message and sessionEnded', function(done) {
        setTimeout(function() {
          assert.match(MmiManager._ui._title,
                       /mmi-notification-title-with-sim.*sim-number.*2/);
          assert.equal(MmiManager._ui._messageReceived, MMI_MSG);
          assert.isTrue(MmiManager._ui._sessionEnded);
          done();
        }, TINY_TIMEOUT);
      });
    });

    [0, 1].forEach(function(cardIndex) {
      suite('Sending a message on SIM' + cardIndex, function() {
        suite('Successfully with result', function() {
          setup(function() {
            MmiManager.send(SUCCESS_MMI_MSG, cardIndex);
          });

          test('Check title, message and sessionEnded', function(done) {
            setTimeout(function() {
              assert.match(MmiManager._ui._title,
                           new RegExp('mmi-notification-title-with-sim' +
                                      '.*sim-number.*' + (cardIndex + 1)));
              assert.equal(MmiManager._ui._messageReceived, SUCCESS_MMI_MSG);
              assert.isNull(MmiManager._ui._sessionEnded);
              done();
            }, TINY_TIMEOUT);
          });
        });

        suite('Successfully with no result', function() {
          setup(function() {
            MmiManager.send(SUCCESS_MMI_NO_MSG, cardIndex);
          });

          test('Check title, message and sessionEnded', function(done) {
            setTimeout(function() {
              assert.match(MmiManager._ui._title,
                           new RegExp('mmi-notification-title-with-sim' +
                                      '.*sim-number.*' + (cardIndex + 1)));
              assert.isUndefined(MmiManager._ui._messageReceived);
              assert.isNull(MmiManager._ui._sessionEnded);
              done();
            }, TINY_TIMEOUT);
          });
        });

        suite('Error with result', function() {
          setup(function() {
            MmiManager.send(FAILED_MMI_MSG, cardIndex);
          });

          test('Check title, message and sessionEnded', function(done) {
            setTimeout(function() {
              assert.match(MmiManager._ui._title,
                           new RegExp('mmi-notification-title-with-sim' +
                                      '.*sim-number.*' + (cardIndex + 1)));
              assert.equal(MmiManager._ui._messageReceived, FAILED_MMI_MSG);
              assert.isNull(MmiManager._ui._sessionEnded);
              done();
            }, TINY_TIMEOUT);
          });
        });

        suite('Error with no result', function() {
          setup(function() {
            MmiManager.send(FAILED_MMI_NO_MSG, cardIndex);
          });

          test('Check title, message and sessionEnded', function(done) {
            setTimeout(function() {
              assert.match(MmiManager._ui._title,
                           new RegExp('mmi-notification-title-with-sim' +
                                      '.*sim-number.*' + (cardIndex + 1)));
              assert.equal(MmiManager._ui._messageReceived, 'GenericFailure');
              assert.isNull(MmiManager._ui._sessionEnded);
              done();
            }, TINY_TIMEOUT);
          });
        });
      });
    });
  });

  suite('Retrieving IMEI codes', function() {
    test('for a single SIM device', function(done) {
      var imei = '123';
      var conn = new MockMobileconnection();
      MockNavigatorMozMobileConnections.mRemoveMobileConnection(0);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 0);
      this.sinon.spy(window, 'postMessage');

      MmiManager.showImei().then(function() {
        sinon.assert.calledWithMatch(window.postMessage, {
          type: 'mmi-success',
          title: 'scImei',
          result: imei
        });
      }).then(done, done);

      // Trigger the MMI request.
      conn.mCachedSendMMIReq.onsuccess({
        target: { result: { serviceCode: 'scImei', statusMessage: 123 } }
      });
    });

    test('for a multi-SIM device', function(done) {
      var imeis = [ '123', '456' ];
      var conn1 = new MockMobileconnection();
      var conn2 = new MockMobileconnection();
      MockNavigatorMozMobileConnections.mRemoveMobileConnection(0);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn1, 0);
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn2, 1);
      this.sinon.spy(window, 'postMessage');

      MmiManager.showImei().then(function() {
        sinon.assert.calledWithMatch(window.postMessage, {
          type: 'mmi-success',
          title: 'scImei',
          result: imeis.join('\n')
        });
      }).then(done, done);

      // Trigger the MMI requests.
      conn1.mCachedSendMMIReq.onsuccess({
        target: { result: { serviceCode: 'scImei', statusMessage: imeis[0] } }
      });
      conn2.mCachedSendMMIReq.onsuccess({
        target: { result: { serviceCode: 'scImei', statusMessage: imeis[1] } }
      });
    });
  });

  suite('Querying status for call barring or call waiting', function() {
    setup(function() {
      this.sinon.stub(MmiManager, '_').returnsArg(0);
      this.sinon.spy(window, 'postMessage');
    });

    test('should display correct message for barring enabled', function() {
      MmiManager.send(MMI_CALL_BARRING_STATUS_ENABLED);
      sinon.assert.calledWithMatch(window.postMessage, {
        result: 'ServiceIsEnabled'
      });
    });

    test('should display correct message for barring disabled', function() {
      MmiManager.send(MMI_CALL_BARRING_STATUS_DISABLED);
      sinon.assert.calledWithMatch(window.postMessage, {
        result: 'ServiceIsDisabled'
      });
    });

    test('should display correct message for waiting enabled', function() {
      MmiManager.send(MMI_CALL_WAITING_STATUS_ENABLED);
      sinon.assert.calledWithMatch(window.postMessage, {
        result: 'ServiceIsEnabled'
      });
    });

    test('should display correct message for waiting disabled', function() {
      MmiManager.send(MMI_CALL_WAITING_STATUS_DISABLED);
      sinon.assert.calledWithMatch(window.postMessage, {
        result: 'ServiceIsDisabled'
      });
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
