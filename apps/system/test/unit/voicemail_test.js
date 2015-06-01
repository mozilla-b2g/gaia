/* global MocksHelper,
   MockL10n,
   MockMozActivity,
   MockNavigatorMozTelephony,
   MockNavigatorMozVoicemail,
   MockNavigatorSettings,
   MockSettingsHelper,
   MockSIMSlotManager,
   ModalDialog,
   Notification,
   SIMSlotManager,
   Voicemail
*/

'use strict';

requireApp('system/js/voicemail.js');
requireApp('system/shared/js/settings_helper.js');

requireApp('system/shared/test/unit/mocks/mock_simslot.js');
requireApp('system/shared/test/unit/mocks/mock_simslot_manager.js');
requireApp('system/test/unit/mock_activity.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_voicemail.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');

var mocksForVoicemail = new MocksHelper([
  'ModalDialog'
]).init();

suite('voicemail notification', function() {
  var realMozVoicemail;
  var realMozSettings;
  var realSIMSlotManager;
  var realL10n;
  var realSettingsHelper;
  var realMozTelephony;
  var realMozActivity;

  mocksForVoicemail.attachTestHelpers();

  var setupSpy;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockNavigatorMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realSettingsHelper = window.SettingsHelper;
    window.SettingsHelper = MockSettingsHelper;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
  });

  setup(function(done) {
    setupSpy = this.sinon.spy(Voicemail, 'setupNotifications');
    this.sinon.stub(MockSIMSlotManager, 'hasOnlyOneSIMCardDetected',
      function() {
        return false;
    });
    Voicemail.init().then(function() {
      done();
    }, done);
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
    window.SIMSlotManager = realSIMSlotManager;
    window.SettingsHelper = realSettingsHelper;
    navigator.mozTelephony = realMozTelephony;
    window.MozActivity = realMozActivity;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockSIMSlotManager.mTeardown();
    MockNavigatorMozVoicemail.mTeardown();
  });

  test('init calls setup', function() {
    sinon.assert.called(setupSpy);
  });

  suite('checking setup steps', function() {
    var notificationGetStub, eventListenerSpy;
    var voicemailNotification, systemNotification;
    var voicemailSpy, systemSpy;

    setup(function() {
      voicemailNotification = new Notification('Voicemail', {
        body: 'Voicemail notification',
        tag: 'voicemailNotification:12347890'
      });
      voicemailSpy = this.sinon.spy(voicemailNotification, 'close');

      systemNotification = new Notification('Battery', {
        body: 'Battery notification',
        tag: 'powerLevelCritical'
      });
      systemSpy = this.sinon.spy(systemNotification, 'close');

      eventListenerSpy =
        this.sinon.spy(MockNavigatorMozVoicemail, 'addEventListener');

      notificationGetStub = function notificationGet() {
        return Promise.resolve([voicemailNotification, systemNotification]);
      };
      this.sinon.stub(window.Notification, 'get', notificationGetStub);
    });

    test('remove only voicemail notification', function(done) {
      Voicemail.setupNotifications().then(function() {
        sinon.assert.calledOnce(voicemailSpy);
        sinon.assert.notCalled(systemSpy);
        done();
      }, done);
    });

    test('add event statuschanged voicemail listener', function(done) {
      Voicemail.setupNotifications().then(function() {
        sinon.assert.calledWith(eventListenerSpy, 'statuschanged');
        sinon.assert.callOrder(voicemailSpy, eventListenerSpy);
        done();
      }, done);
    });
  });

  test('no voicemail status change, no notification', function(done) {
    var showNotificationSpy = this.sinon.spy(Voicemail, 'showNotification');
    MockNavigatorMozVoicemail.mHasMessages = false;
    MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
    setTimeout(function() {
      sinon.assert.notCalled(showNotificationSpy);
      done();
    });
  });

  suite('voicemail status change', function() {
    var notificationSpy;
    var notificationListenerSpy;

    setup(function() {
      notificationListenerSpy = this.sinon.spy('');
      notificationSpy = this.sinon.stub(window, 'Notification').returns({
        addEventListener: notificationListenerSpy,
        close: function() {}
      });
    });

    suite('showNotification and hideNotification should be called correctly',
      function() {
        setup(function() {
          this.sinon.spy(Voicemail, 'showNotification');
          this.sinon.spy(Voicemail, 'hideNotification');
        });

        test('hasMessage is true', function(done) {
          MockNavigatorMozVoicemail.mHasMessages = true;

          MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
          setTimeout(function() {
            sinon.assert.calledOnce(Voicemail.showNotification);
            sinon.assert.notCalled(Voicemail.hideNotification);
            done();
          });
        });

        test('hasMessage is false', function(done) {
          MockNavigatorMozVoicemail.mHasMessages = false;

          MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
          setTimeout(function() {
            sinon.assert.notCalled(Voicemail.showNotification);
            sinon.assert.calledOnce(Voicemail.hideNotification);
            done();
          });
        });
    });

    test('showNotification should create a notification with a single SIM',
      function() {
        MockSIMSlotManager.hasOnlyOneSIMCardDetected.restore();
        this.sinon.stub(MockSIMSlotManager, 'hasOnlyOneSIMCardDetected',
          function() {
            return true;
          });
        Voicemail.showNotification('title', 'text', '111');
        sinon.assert.calledWith(notificationSpy, 'title');
    });

    suite('showNotification registers and triggers events handlers correctly',
      function() {
        var telephonyDialSpy;
        var promptSpy;
        var activitySpy;
        var voicemailNumber = '111';

        setup(function() {
          telephonyDialSpy = this.sinon.spy(MockNavigatorMozTelephony, 'dial');
          promptSpy = this.sinon.spy(ModalDialog, 'confirm');
          activitySpy = this.sinon.spy(window, 'MozActivity');
        });

        test('should register a click when with a voice number', function() {
          Voicemail.showNotification('title', 'text', voicemailNumber);
          sinon.assert.calledWith(notificationListenerSpy, 'click');
        });

        test('should register a close when with a voice number', function() {
          Voicemail.showNotification('title', 'text', voicemailNumber);
          sinon.assert.calledWith(notificationListenerSpy, 'close');
        });

        test('should trigger handler when with a voice number', function() {
          Voicemail.showNotification('title', 'text', voicemailNumber);
          notificationListenerSpy.yield();
          sinon.assert.calledWith(telephonyDialSpy, voicemailNumber);
        });

        test('should register a click when there is no voicemail number',
          function() {
            Voicemail.showNotification('title', 'text');
            sinon.assert.calledWith(notificationListenerSpy, 'click');
        });

        test('should register a close when there is no voicemail number',
          function() {
            Voicemail.showNotification('title', 'text');
            sinon.assert.calledWith(notificationListenerSpy, 'close');
        });

        test('should trigger handler when without a voice number', function() {
          var expectedTitle = 'voicemailNoNumberTitle';
          var expectedText = 'voicemailNoNumberText';
          var expectedConfirm = {
            title: 'voicemailNoNumberSettings',
            callback: Voicemail.showVoicemailSettings
          };
          Voicemail.showNotification('title', 'text');
          notificationListenerSpy.yield();
          sinon.assert.notCalled(telephonyDialSpy);
          sinon.assert.calledWithMatch(
            promptSpy, expectedTitle, expectedText, expectedConfirm);
        });

        test('send MozActivity to display voicemail settings', function() {
          var expectedActivity = {
            name: 'configure',
            data: {
              target: 'device',
              section: 'call'
            }
          };
          Voicemail.showVoicemailSettings();
          sinon.assert.calledWith(activitySpy, expectedActivity);
        });
    });

    function serviceIdTests(serviceId) {
      suite('sim count: ' + (i + 1), function() {
        suiteSetup(function() {
          // When service id is 2, we test the multi sim case.
          this.isMultiSIM = (serviceId !== 0);
          sinon.stub(SIMSlotManager, 'isMultiSIM').returns(this.isMultiSIM);
        });

        suiteTeardown(function() {
          SIMSlotManager.isMultiSIM.restore();
        });

        suite('showNotification should be called with correct parameters',
          function() {
            setup(function() {
              this.voiceNumbers = ['111', '222'];
              MockNavigatorMozVoicemail.mServiceId = serviceId;
              MockNavigatorMozVoicemail.mNumbers = this.voiceNumbers;
              MockNavigatorMozVoicemail.mHasMessages = true;
              sinon.spy(Voicemail, 'showNotification');
              if (!this.isMultiSIM) {
                MockSIMSlotManager.hasOnlyOneSIMCardDetected.restore();
                this.sinon.stub(MockSIMSlotManager,
                  'hasOnlyOneSIMCardDetected', function() {
                    return true;
                  });
              }
            });

            teardown(function() {
              Voicemail.showNotification.restore();
            });

            test('should/should not display SIM indicator', function() {
              var baseTitle = 'aaaa';
              var multiSimTitle =
                MockL10n.get('voicemailNotificationMultiSim', {
                  n: 2,
                  title: baseTitle
                });

              Voicemail.showNotification(
                baseTitle, 'bbbb', '1111', serviceId);

              sinon.assert.calledWithNew(notificationSpy);
              sinon.assert.calledOnce(notificationSpy);
              assert.equal(notificationSpy.firstCall.args[1].body, 'bbbb');
              assert.equal(notificationSpy.firstCall.args[1].tag,
                           'voicemailNotification:' + serviceId);
              assert.equal(
                notificationSpy.firstCall.args[1].mozbehavior.showOnlyOnce,
                true);

              if (this.isMultiSIM) {
                assert.equal(
                  notificationSpy.firstCall.args[0], multiSimTitle);
              } else {
                assert.equal(notificationSpy.firstCall.args[0], baseTitle);
              }
            });

            test('with returnMessage, with voicemail number', function(done) {
              MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
              setTimeout((function() {
                // display the message count as title
                var expectedTitle = MockNavigatorMozVoicemail.mMessage;
                var expectedNumber = '\u200E' + this.voiceNumbers[serviceId];
                // display the voice mail number as body
                var expectedText = 'dialNumber{"number":"' +
                  '\u200E' + this.voiceNumbers[serviceId] + '"}';

                sinon.assert.calledWithExactly(Voicemail.showNotification,
                  expectedTitle, expectedText,
                  expectedNumber, serviceId);

                done();
              }).bind(this));
            });

            test('without returnMessage, with voicemail number',
              function(done) {
                MockNavigatorMozVoicemail.mMessage = null;

                MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
                setTimeout((function() {
                  // display the message count as title
                  var expectedTitle = 'newVoicemails{"n":' +
                    MockNavigatorMozVoicemail.mMessageCount + '}';
                  // display the voice mail number as body
                  var expectedText = 'dialNumber{"number":"' + '\u200E' +
                    MockNavigatorMozVoicemail.mNumbers[serviceId] + '"}';

                  sinon.assert.calledWithExactly(Voicemail.showNotification,
                    expectedTitle, expectedText,
                    '\u200E' + this.voiceNumbers[serviceId], serviceId);

                  done();
                }).bind(this));
            });

            test('without returnMessage, messageCount is zero',
              function(done) {
                MockNavigatorMozVoicemail.mMessage = null;
                MockNavigatorMozVoicemail.mMessageCount = 0;

                MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
                setTimeout((function() {
                  // display the unknown message as title
                  var expectedTitle = 'newVoicemailsUnknown';
                  // display the voice mail number as body
                  var expectedText = 'dialNumber{"number":"' + '\u200E' +
                    MockNavigatorMozVoicemail.mNumbers[serviceId] + '"}';

                  sinon.assert.calledWithExactly(Voicemail.showNotification,
                    expectedTitle, expectedText,
                    '\u200E' + this.voiceNumbers[serviceId], serviceId);

                  done();
                }).bind(this));
            });

            test('without voicemail number', function(done) {
              MockNavigatorMozVoicemail.mNumbers = [];

              MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
              setTimeout((function() {
                // display the message as title
                var expectedTitle = MockNavigatorMozVoicemail.mMessage;
                // display the message as body
                var expectedText = MockNavigatorMozVoicemail.mMessage;

                sinon.assert.calledWithExactly(Voicemail.showNotification,
                  expectedTitle, expectedText, undefined, serviceId);

                done();
              }).bind(this));
            });

            suite('value from settings', function() {
              setup(function() {
                MockNavigatorMozVoicemail.mNumbers = [];
                MockSettingsHelper.instances['ril.iccInfo.mbdn'] =
                  {value: this.voiceNumbers};
              });

              teardown(function() {
                MockNavigatorMozVoicemail.mNumbers = this.voiceNumbers;
                MockSettingsHelper.instances['ril.iccInfo.mbdn'] =
                  {value: undefined};
              });

              test('without voicemail number, with ril.iccInfo.mbdn',
                function(done) {
                  MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
                  setTimeout((function() {
                    // display the message as title
                    var expectedTitle = MockNavigatorMozVoicemail.mMessage;
                    var expectedNumber = '\u200E' +
                      this.voiceNumbers[serviceId];
                    // display the message as body
                    var expectedText = 'dialNumber{"number":"' +
                      expectedNumber + '"}';

                    sinon.assert.calledWithExactly(Voicemail.showNotification,
                      expectedTitle, expectedText, expectedNumber, serviceId);

                    done();
                  }).bind(this));
                });
            });
        });
      });
    }

    for (var i = 0; i < 2; i++) {
      serviceIdTests(i);
    }
  });

  suite('placing voicemail calls', function() {
    var notificationSpy;
    var telephonyDialSpy;
    var notificationListenerSpy;
    var notificationTitle = 'Title';
    var notificationText = 'Text';
    var voicemailNumber = '111';

    suiteSetup(function() {
      realMozTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;
    });

    setup(function() {
      notificationListenerSpy = this.sinon.spy('');
      notificationSpy = this.sinon.stub(window, 'Notification').returns({
        addEventListener: notificationListenerSpy,
        close: function() {}
      });
      telephonyDialSpy = this.sinon.spy(MockNavigatorMozTelephony, 'dial');
    });

    suiteTeardown(function() {
      MockNavigatorMozTelephony.mSuiteTeardown();
      navigator.mozTelephony = realMozTelephony;
    });

    teardown(function() {
      MockNavigatorMozTelephony.calls = [];
      MockNavigatorMozTelephony.mTeardown();
    });

    test('place a call if there is none pending', function() {
      MockNavigatorMozTelephony.calls = [];
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber);
      notificationListenerSpy.yield();
      sinon.assert.calledWith(telephonyDialSpy, voicemailNumber, 0);
    });

    test('place a call if there is less than two pending', function() {
      MockNavigatorMozTelephony.calls = [{}];
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber);
      notificationListenerSpy.yield();
      sinon.assert.calledWith(telephonyDialSpy, voicemailNumber, 0);
    });

    test('do not place a call if there is already two pending', function() {
      MockNavigatorMozTelephony.calls = [{}, {}];
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber);
      notificationListenerSpy.yield();
      sinon.assert.notCalled(telephonyDialSpy);
    });

    test('place a voicemail call to SIM 1', function() {
      var serviceId = 0;
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber, serviceId);
      notificationListenerSpy.yield();
      sinon.assert.calledWithExactly(
        telephonyDialSpy, voicemailNumber, serviceId);
    });

    test('place a voicemail call to SIM 2', function() {
      var serviceId = 1;
      voicemailNumber = '222';
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber, serviceId);
      notificationListenerSpy.yield();
      sinon.assert.calledWithExactly(
        telephonyDialSpy, voicemailNumber, serviceId);
    });
  });
});
