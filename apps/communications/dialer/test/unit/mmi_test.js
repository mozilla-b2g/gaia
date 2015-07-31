/* globals CALL_BARRING_STATUS_MMI_CODE,CALL_WAITING_STATUS_MMI_CODE,
           MmiManager, MockMmiUI, MockMobileconnection, MockMobileOperator,
           MockNavigatormozApps, MockNavigatorMozIccManager,
           MockNavigatorMozMobileConnections, MockNavigatorMozTelephony,
           MocksHelper, Notification, MockL10n */

'use strict';

require('/dialer/js/mmi.js');
require('/dialer/test/unit/mock_mmi_ui.js');

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_mobile_operator.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_icc_manager.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');

const SUCCESS_MMI_NO_MSG = 'sucess_mmi_no_msg';
const FAILED_MMI_NO_MSG = 'failed_mmi_no_msg';
const SUCCESS_MMI_MSG = 'success_mmi_msg';
const FAILED_MMI_MSG = 'failed_mmi_msg';

const MMI_MSG = 'mmi_msg';

const ICC_SERVICE_CLASS_VOICE = (1 << 0);
const ICC_SERVICE_CLASS_DATA = (1 << 1);
const ICC_SERVICE_CLASS_FAX = (1 << 2);
const ICC_SERVICE_CLASS_SMS = (1 << 3);
const ICC_SERVICE_CLASS_DATA_SYNC = (1 << 4);
const ICC_SERVICE_CLASS_DATA_ASYNC = (1 << 5);
const ICC_SERVICE_CLASS_PACKET = (1 << 6);
const ICC_SERVICE_CLASS_PAD = (1 << 7);

const EXPECTED_PHONE = '+34666222111';

var mocksHelperForMMI = new MocksHelper([
  'LazyLoader',
  'MmiUI',
  'MobileOperator',
  'NavigatorMozIccManager',
  'NavigatorMozMobileConnections',
  'NavigatorMozTelephony',
  'Notification',
  'NotificationHelper'
]).init();

suite('dialer/mmi', function() {
  var realMozApps;
  var realMozIccManager;
  var realMobileConnections;
  var realMozTelephony;
  var mobileConn;
  var realL10n;
  var _;


  mocksHelperForMMI.attachTestHelpers();

  suiteSetup(function() {
    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozIccManager = window.navigator.mozIccManager;
    window.navigator.mozIccManager = MockNavigatorMozIccManager;

    realMozTelephony = window.navigator.mozTelephony;
    window.navigator.mozTelephony = MockNavigatorMozTelephony;

    realMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    _ = MockL10n.get;

    /* Replace the default mock connection with our own specialized version
     * tailored for this suite of tests. */
    mobileConn = new MockMobileconnection();
  });

  suiteTeardown(function() {
    MockNavigatorMozTelephony.mSuiteTeardown();

    navigator.mozApps = realMozApps;
    navigator.mozIccManager = realMozIccManager;
    navigator.mozTelephony = realMozTelephony;
    navigator.mozMobileConnections = realMobileConnections;
    navigator.mozTelephony = realMozTelephony;
    navigator.mozL10n = realL10n;
  });

  setup(function() {
    MockNavigatorMozMobileConnections.mRemoveMobileConnection(0);
    MockNavigatorMozMobileConnections.mAddMobileConnection(mobileConn, 0);

    this.sinon.spy(MockMmiUI, 'success');
    this.sinon.spy(MockMmiUI, 'error');
    this.sinon.spy(MockMmiUI, 'received');
  });

  teardown(function() {
    MockNavigatorMozIccManager.mTeardown();
    MockNavigatorMozMobileConnections.mTeardown();
    MockNavigatorMozTelephony.mTeardown();
    mobileConn.mTeardown();
    MmiManager._conn = null;
  });

  suite('Successfully send mmi message with result', function() {
    setup(function(done) {
      MmiManager.handleDialing(mobileConn, SUCCESS_MMI_MSG, Promise.resolve({
        success: true,
        serviceCode: 'scFoo',
        statusMessage: SUCCESS_MMI_MSG
      })).then(done, done);
    });

    test('the message is populated correctly', function() {
      sinon.assert.calledWith(MockMmiUI.success, SUCCESS_MMI_MSG, 'scFoo');
    });
  });

  suite('Successfully send mmi message no result', function() {
    setup(function(done) {
      MmiManager.handleDialing(mobileConn, SUCCESS_MMI_NO_MSG, Promise.resolve({
        success: true,
        serviceCode: 'scFoo',
        statusMessage: null
      })).then(done, done);
    });

    test('check that a generic message is shown', function() {
      sinon.assert.calledWith(MockMmiUI.success, null, 'scFoo');
    });
  });

  suite('Error sending mmi message with result', function() {
    setup(function(done) {
      MmiManager.handleDialing(mobileConn, FAILED_MMI_MSG, Promise.resolve({
        success: false,
        serviceCode: 'scFoo',
        statusMessage: FAILED_MMI_MSG
      })).then(done, done);
    });

    test('the cause of failure is shown', function() {
      sinon.assert.calledWith(MockMmiUI.error, FAILED_MMI_MSG, 'scFoo');
    });
  });

  suite('Error sending mmi message no result', function() {
    setup(function(done) {
      MmiManager.handleDialing(mobileConn, FAILED_MMI_NO_MSG, Promise.resolve({
        success: false,
        serviceCode: 'scFoo',
        statusMessage: null
      })).then(done, done);
    });

    test('a generic error message is shown', function() {
      sinon.assert.calledWith(MockMmiUI.error, 'GenericFailure', 'scFoo');
    });
  });

  suite('Network initiated messages', function() {
    setup(function() {
      MockMobileOperator.mOperator = 'fake_carrier';
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
    });

    test('should handle network initiated messages properly', function(done) {
      MmiManager.handleMMIReceived(MMI_MSG, {}, 0).then(function() {
        done(function checks() {
          sinon.assert.calledWith(MockMmiUI.received, {}, MMI_MSG,
                                  MockMobileOperator.mOperator);
        });
      });
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
    setup(function(done) {
      MmiManager.handleMMIReceived(MMI_MSG, {}, 0).then(done, done);
    });

    test('the message is shown and a session is provided', function() {
      sinon.assert.calledWith(MockMmiUI.received, {}, MMI_MSG);
    });
  });

  suite('Mmi received with message and session ended', function() {
    setup(function(done) {
      MmiManager.handleMMIReceived(MMI_MSG, null, 0).then(done, done);
    });

    test('the message is shown and session is null', function() {
      sinon.assert.calledWith(MockMmiUI.received, null, MMI_MSG);
    });
  });

  suite('Mmi received with no message and an active session', function() {
    setup(function(done) {
      MmiManager.handleMMIReceived(null, {}, 0).then(done, done);
    });

    test('no message was received', function() {
      sinon.assert.notCalled(MockMmiUI.received);
    });
  });

  suite('Mmi received with no message and session ended', function() {
    test('nothing is shown when message is empty', function(done) {
      MmiManager.handleMMIReceived('', true, 0).then(function() {
        done(function checks() {
          sinon.assert.notCalled(MockMmiUI.received);
        });
      }, function() {
        done(function() {
          assert.isTrue(false, 'Should not reject the promise');
        });
      });
    });

    test('nothing is shown when message is null', function(done) {
      MmiManager.handleMMIReceived(null, true, 0).then(function() {
        done(function checks() {
          sinon.assert.notCalled(MockMmiUI.received);
        });
      }, function() {
        done(function() {
          assert.isTrue(false, 'Should not reject the promise');
        });
      });
    });
  });

  suite('Mmi message reply via UI', function() {
    setup(function(done) {
      MmiManager._conn = mobileConn;
      MmiManager._session = {
        send: function mockSend(message) {
          return MmiManager.handleDialing(mobileConn, SUCCESS_MMI_MSG,
            Promise.resolve({
              success: true,
              serviceCode: 'scFoo',
              statusMessage: SUCCESS_MMI_MSG
            })
          );
        }
      };

      MmiManager.reply(SUCCESS_MMI_MSG).then(done, done);
    });

    teardown(function() {
      MmiManager._session = null;
    });

    test('the message is shown', function() {
      sinon.assert.calledWith(MockMmiUI.success, SUCCESS_MMI_MSG, 'scFoo');
    });
  });

  suite('Mmi message reply via UI with multiple connections', function() {
    var simNum = 2;

    setup(function(done) {
      // Make this look like a DSDS setup
      var conn = new MockMobileconnection();
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, simNum - 1);
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
      MockNavigatorMozIccManager.addIcc('1', { 'cardState' : 'ready' });

      MmiManager._conn = conn;
      MmiManager._session = {
        send: function mockSend(message) {
          return MmiManager.handleDialing(mobileConn, SUCCESS_MMI_MSG,
            Promise.resolve({
              success: true,
              serviceCode: 'scFoo',
              statusMessage: SUCCESS_MMI_MSG
            })
          );
        }
      };

      MmiManager.reply(SUCCESS_MMI_MSG).then(done, done);
    });

    test('the message is shown', function() {
      sinon.assert.calledWithMatch(MockMmiUI.success, SUCCESS_MMI_MSG,
        /mmi-notification-title-with-sim.*sim-number.*1/);
    });
  });

  suite('DSDS operation', function() {
    var simNum = 2;

    setup(function(done) {
      // Make this look like a DSDS setup
      var conn = new MockMobileconnection();
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, simNum - 1);
      MockNavigatorMozIccManager.addIcc('0', { 'cardState' : 'ready' });
      MockNavigatorMozIccManager.addIcc('1', { 'cardState' : 'ready' });

      MmiManager.handleMMIReceived(MMI_MSG, null, 1).then(done, done);
    });

    suite('Receiving a message', function() {
      test('the display is populated and the session has ended', function() {
        sinon.assert.calledWithMatch(MockMmiUI.received, null, MMI_MSG,
          /mmi-notification-title-with-sim.*sim-number.*2/);
      });
    });

    [0, 1].forEach(function(cardIndex) {
      suite('Sending a message on SIM' + cardIndex, function() {
        suite('Successfully with result', function() {
          setup(function(done) {
            MmiManager.handleDialing(
              MockNavigatorMozMobileConnections[cardIndex],
              SUCCESS_MMI_MSG,
              Promise.resolve({
                success: true,
                serviceCode: 'scFoo',
                statusMessage: SUCCESS_MMI_MSG
              })
            ).then(done, done);
          });

          test('the display is populated and the session has ended',
            function() {
              sinon.assert.calledWithMatch(MockMmiUI.success, SUCCESS_MMI_MSG,
                new RegExp('mmi-notification-title-with-sim.*sim-number.*' +
                           (cardIndex + 1)));
            }
          );
        });

        suite('Successfully with no result', function() {
          setup(function(done) {
            MmiManager.handleDialing(
              MockNavigatorMozMobileConnections[cardIndex],
              SUCCESS_MMI_NO_MSG, Promise.resolve({
                success: true,
                serviceCode: 'scFoo',
                statusMessage: null
              })
            ).then(done, done);
          });

          test('the display is populated and the session has ended',
            function() {
              sinon.assert.calledWithMatch(MockMmiUI.success, null,
                new RegExp('mmi-notification-title-with-sim.*sim-number.*' +
                           (cardIndex + 1)));
            }
          );
        });

        suite('Error with result', function() {
          setup(function(done) {
            MmiManager.handleDialing(
              MockNavigatorMozMobileConnections[cardIndex],
              FAILED_MMI_MSG, Promise.resolve({
                success: false,
                serviceCode: 'scFoo',
                statusMessage: FAILED_MMI_MSG
              })
            ).then(done, done);
          });

          test('the error message is shown',
            function() {
              sinon.assert.calledWithMatch(MockMmiUI.error, FAILED_MMI_MSG,
                new RegExp('mmi-notification-title-with-sim.*sim-number.*' +
                           (cardIndex + 1)));
            }
          );
        });

        suite('Error with no result', function() {
          setup(function(done) {
            MmiManager.handleDialing(
              MockNavigatorMozMobileConnections[cardIndex],
              FAILED_MMI_NO_MSG, Promise.resolve({
                success: false,
                serviceCode: 'scFoo',
                statusMessage: null
              })
            ).then(done, done);
          });

          test('a generic error message is shown',
            function() {
              sinon.assert.calledWithMatch(MockMmiUI.error, 'GenericFailure',
                new RegExp('mmi-notification-title-with-sim.*sim-number.*' +
                           (cardIndex + 1)));
            }
          );
        });
      });
    });
  });

  suite('Retrieving IMEI codes', function() {
    test('for a single SIM device', function(done) {
      var imei = '123';

      /* The dial method returns a promise when sending an MMI code that
       * resolves when the code has been successfully sent. However the
       * response to the code will arrive only later by way of another promise
       * returned as part of the return value of the first one. To mock this
       * we have the first faked promise return an object holding a second
       * faked promise, both of which resolve() immediately. */
      this.sinon.stub(MockNavigatorMozTelephony, 'dial').returns(
        Promise.resolve({
          result: Promise.resolve({
            success: true,
            serviceCode: 'scImei',
            statusMessage: imei
          })
        })
      );

      MmiManager.showImei().then(function() {
        sinon.assert.calledWith(MockMmiUI.success, imei, 'scImei');
      }).then(done, done);
    });

    test('for a multi-SIM device', function(done) {
      var imeis = [ '123', '456' ];
      var conn = new MockMobileconnection();
      MockNavigatorMozMobileConnections.mAddMobileConnection(conn, 1);

      this.sinon.stub(MockNavigatorMozTelephony, 'dial');
      MockNavigatorMozTelephony.dial.onFirstCall().returns(
        Promise.resolve({
          result: Promise.resolve({
            success: true,
            serviceCode: 'scImei',
            statusMessage: imeis[0]
          })
        })
      );
      MockNavigatorMozTelephony.dial.onSecondCall().returns(
        Promise.resolve({
          result: Promise.resolve({
            success: true,
            serviceCode: 'scImei',
            statusMessage: imeis[1]
          })
        })
      );

      MmiManager.showImei().then(function() {
        sinon.assert.calledWith(MockMmiUI.success, imeis.join('\n'), 'scImei');
      }).then(done, done);
    });
  });

  suite('Querying status for call barring or call waiting', function() {
    setup(function() {
      this.sinon.stub(MmiManager, '_').returnsArg(0);
    });

    test('should display correct message for barring enabled', function() {
      MmiManager.notifySuccess({
        serviceCode: 'scCallBarring',
        statusMessage: 'smServiceEnabled'
      }, CALL_BARRING_STATUS_MMI_CODE);
      sinon.assert.calledWith(MockMmiUI.success, 'ServiceIsEnabled');
    });

    test('should display correct message for barring disabled', function() {
      MmiManager.notifySuccess({
        serviceCode: 'scCallBarring',
        statusMessage: 'smServiceDisabled'
      }, CALL_BARRING_STATUS_MMI_CODE);
      sinon.assert.calledWith(MockMmiUI.success, 'ServiceIsDisabled');
    });

    test('should display correct message for waiting enabled', function() {
      MmiManager.notifySuccess({
        serviceCode: 'scCallWaiting',
        statusMessage: 'smServiceEnabled'
      }, CALL_WAITING_STATUS_MMI_CODE);
      sinon.assert.calledWith(MockMmiUI.success, 'ServiceIsEnabled');
    });

    test('should display correct message for waiting disabled', function() {
      MmiManager.notifySuccess({
        serviceCode: 'scCallWaiting',
        statusMessage: 'smServiceDisabled'
      }, CALL_WAITING_STATUS_MMI_CODE);
      sinon.assert.calledWith(MockMmiUI.success, 'ServiceIsDisabled');
    });
  });

  suite('Call forwarding request via MMI.', function() {
    var CALL_FORWARDING_STATUS_MMI_CODE = '*#23#';
    var _spy;
    var services = [
      { cl: ICC_SERVICE_CLASS_VOICE, str: 'voice' },
      { cl: ICC_SERVICE_CLASS_DATA, str: 'data' },
      { cl: ICC_SERVICE_CLASS_FAX, str: 'fax' },
      { cl: ICC_SERVICE_CLASS_SMS, str: 'sms' },
      { cl: ICC_SERVICE_CLASS_DATA_SYNC, str: 'sync' },
      { cl: ICC_SERVICE_CLASS_DATA_ASYNC, str: 'async' },
      { cl: ICC_SERVICE_CLASS_PACKET, str: 'packet' },
      { cl: ICC_SERVICE_CLASS_PAD, str: 'pad' },
    ];

    /*
     * Function used to check if a particular service class is present in an
     * additional information field, not declared inline to please the linter.
     */
    function matchAdditionalInformation(additionalInformation, id) {
      return additionalInformation.find(function(info) {
        return (info.serviceClass === id);
      });
    }

    /*
     * Helper used to check if the appropriate l10n strings for the specified
     * call forwarding additional information object were called. The sole
     * parameter is an array of additional information objects extracted from
     * an USSD response message.
     */
    function checkMessages(additionalInformation) {
      services.forEach(function(service) {
        var arg = {};

        if (matchAdditionalInformation(additionalInformation, service.cl)) {
          arg[service.str] = EXPECTED_PHONE;
        } else {
          arg[service.str] = 'call-forwarding-inactive';
        }

        sinon.assert.calledWith(_spy, 'call-forwarding-' + service.str, arg);
      });
    }

    setup(function() {
      _spy = this.sinon.spy(MmiManager, '_');
      MmiManager._conn = mobileConn;
    });

    teardown(function() {
      MmiManager._conn = null;
    });

    services.forEach(function(service) {
      test('Check call forwarding rules, active ' + service.str,
      function() {
        var message = {
          serviceCode: 'scCallForwarding',
          statusMessage: 'smServiceInterrogated',
          additionalInformation: [{
            active: true,
            number: EXPECTED_PHONE,
            serviceClass: service.cl
          }]
        };

        MmiManager.notifySuccess(message, CALL_FORWARDING_STATUS_MMI_CODE);

        checkMessages(message.additionalInformation);
      });
    });

    test('Check call forwarding rules, all inactive', function() {
      var message = {
        serviceCode: 'scCallForwarding',
        statusMessage: 'smServiceInterrogated',
        additionalInformation: [{
          active: false
        }]
      };

      MmiManager.notifySuccess(message, CALL_FORWARDING_STATUS_MMI_CODE);

      checkMessages(message.additionalInformation);
    });

    test('Check call forwarding rules, two rules', function() {
      var message = {
        serviceCode: 'scCallForwarding',
        statusMessage: 'smServiceInterrogated',
        additionalInformation: [{
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: ICC_SERVICE_CLASS_VOICE
        }, {
          active: true,
          number: EXPECTED_PHONE,
          serviceClass: ICC_SERVICE_CLASS_DATA
        }]
      };

      MmiManager.notifySuccess(message, CALL_FORWARDING_STATUS_MMI_CODE);

      checkMessages(message.additionalInformation);
    });
  });

  suite('SIM Card PIN change via MMI.', function() {
    var SIM_PIN_CHANGE_MMI_CODE = '**04';

    test('Check SIM Card PIN changes successful', function() {
      var message = {
        serviceCode: 'scPin',
        statusMessage: 'smPinChanged',
        success: 'true'
      };
      MmiManager.notifySuccess(message, SIM_PIN_CHANGE_MMI_CODE);
      sinon.assert.calledWithMatch(MockMmiUI.success, 'smPinChanged', 'scPin');
    });

    test('Check error message for incorrect PIN is correct', function() {
      var message = {
        serviceCode: 'scPin',
        statusMessage: 'emMmiErrorBadPin',
        success: 'false',
        additionalInformation: 2
      };

      MmiManager.notifyError(message);
      sinon.assert.calledWithMatch(MockMmiUI.error,
        _('emMmiErrorBadPin') + '\n' + _('emMmiErrorPinPukAttempts',
        { n: message.additionalInformation}),
        'scPin');
    });

    test('Check error message for PUK locked due to max attempts', function() {
      var message = {
        serviceCode: 'scPin',
        statusMessage: 'emMmiErrorNeedsPuk',
        success: 'false'
      };
      MmiManager.notifyError(message);
      sinon.assert.calledWithMatch(MockMmiUI.error, 'emMmiErrorNeedsPuk',
        'scPin');
    });
  });

  suite('Call control supplementary service commands', function() {
    test('should cancel and hide the loading screen', function() {
      this.sinon.spy(MockMmiUI, 'cancel');
      MmiManager.notifySuccess({
        serviceCode: 'scCall',
        statusMessage: 'smCallControl'
      }, 1);
      sinon.assert.called(MockMmiUI.cancel);
      sinon.assert.notCalled(MockMmiUI.success);
    });
  });
});
