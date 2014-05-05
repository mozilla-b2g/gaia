'use strict';
/* global MocksHelper, MockL10n, MockNavigatorMozTelephony, ModalDialog */
/* global SIMSlotManager */

requireApp('system/js/voicemail.js');
requireApp('system/shared/js/settings_helper.js');

requireApp('system/js/mock_simslot.js');
requireApp('system/js/mock_simslot_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_voicemail.js');
requireApp('system/test/unit/mock_modal_dialog.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_telephony.js');
requireApp('system/shared/test/unit/mocks/mock_settings_helper.js');

mocha.setup({
  globals: ['SIMSlotManager', 'MozActivity']
});

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

  var notificationSpy;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockNavigatorMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realSettingsHelper = SettingsHelper;
    SettingsHelper = MockSettingsHelper;

    realMozTelephony = navigator.mozTelephony;
    navigator.mozTelephony = MockNavigatorMozTelephony;

    realMozActivity = window.MozActivity;
    window.MozActivity = MockMozActivity;
  });

  setup(function() {
    Voicemail.init();
    this.notificationListenerSpy = sinon.spy('');
    notificationSpy = this.sinon.stub(window, 'Notification').returns({
      addEventListener: this.notificationListenerSpy,
      close: function() {}
    });
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
    window.SIMSlotManager = realSIMSlotManager;
    SettingsHelper = realSettingsHelper;
    navigator.mozTelephony = realMozTelephony;
    window.MozActivity = realMozActivity;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockSIMSlotManager.mTeardown();
    MockNavigatorMozVoicemail.mTeardown();
    window.Notification.restore();
    notificationSpy = null;
  });

  test('no voicemail status change, no notification', function(done) {
    MockNavigatorMozVoicemail.mHasMessages = false;
    MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
    setTimeout(function() {
      sinon.assert.notCalled(window.Notification);
      done();
    });
  });

  suite('voicemail status change', function() {
    suite('showNotification and hideNotification should be called correctly',
      function() {
        setup(function() {
          sinon.spy(Voicemail, 'showNotification');
          sinon.spy(Voicemail, 'hideNotification');
        });

        teardown(function() {
          Voicemail.showNotification.restore();
          Voicemail.hideNotification.restore();
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

    test('showNotification should create a notification',
      function() {
        Voicemail.showNotification('title', 'text', '111');
        sinon.assert.calledWith(window.Notification, 'title');
    });

    suite('showNotification register and trigger click event handler correctly',
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

        test('should register a handler when with a voice number', function() {
          Voicemail.showNotification('title', 'text', voicemailNumber);
          sinon.assert.calledWith(this.notificationListenerSpy, 'click');
        });

        test('should trigger handler when with a voice number', function() {
          Voicemail.showNotification('title', 'text', voicemailNumber);
          this.notificationListenerSpy.yield();
          sinon.assert.calledWith(telephonyDialSpy, voicemailNumber);
        });

        test('should register a handler when there is no voicemail number',
          function() {
            Voicemail.showNotification('title', 'text');
            sinon.assert.calledWith(this.notificationListenerSpy, 'click');
        });

        test('should trigger handler when without a voice number', function() {
          var expectedTitle = 'voicemailNoNumberTitle';
          var expectedText = 'voicemailNoNumberText';
          var expectedConfirm = {
            title: 'voicemailNoNumberSettings',
            callback: Voicemail.showVoicemailSettings
          };
          Voicemail.showNotification('title', 'text');
          this.notificationListenerSpy.yield();
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

    for (var i = 0; i < 2; i++) {
      (function(serviceId) {
        suite('sim count: ' + (i + 1), function() {
          suiteSetup(function() {
            // When service id is 2, we test the multi sim case.
            this.isMultiSIM = (serviceId != 0);
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
                  // display the voice mail number as body
                  var expectedText = 'dialNumber{"number":"' +
                    this.voiceNumbers[serviceId] + '"}';

                  sinon.assert.calledWithExactly(Voicemail.showNotification,
                    expectedTitle, expectedText,
                    this.voiceNumbers[serviceId], serviceId);

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
                    var expectedText = 'dialNumber{"number":"' +
                      MockNavigatorMozVoicemail.mNumbers[serviceId] + '"}';

                    sinon.assert.calledWithExactly(Voicemail.showNotification,
                      expectedTitle, expectedText,
                      this.voiceNumbers[serviceId], serviceId);

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
                    var expectedText = 'dialNumber{"number":"' +
                      MockNavigatorMozVoicemail.mNumbers[serviceId] + '"}';

                    sinon.assert.calledWithExactly(Voicemail.showNotification,
                      expectedTitle, expectedText,
                      this.voiceNumbers[serviceId], serviceId);

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
                      // display the message as body
                      var expectedText = 'dialNumber{"number":"' +
                        this.voiceNumbers[serviceId] + '"}';

                      sinon.assert.calledWithExactly(Voicemail.showNotification,
                        expectedTitle, expectedText,
                        this.voiceNumbers[serviceId], serviceId);

                      done();
                    }).bind(this));
                  });
              });
          });
        });
      })(i);
    }
  });

  suite('placing voicemail calls', function() {
    var telephonyDialSpy;
    var notificationTitle = 'Title';
    var notificationText = 'Text';
    var voicemailNumber = '111';

    suiteSetup(function() {
      realMozTelephony = navigator.mozTelephony;
      navigator.mozTelephony = MockNavigatorMozTelephony;
    });

    setup(function() {
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
      this.notificationListenerSpy.yield();
      sinon.assert.calledWith(telephonyDialSpy, voicemailNumber, 0);
    });

    test('place a call if there is less than two pending', function() {
      MockNavigatorMozTelephony.calls = [{}];
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber);
      this.notificationListenerSpy.yield();
      sinon.assert.calledWith(telephonyDialSpy, voicemailNumber, 0);
    });

    test('do not place a call if there is already two pending', function() {
      MockNavigatorMozTelephony.calls = [{}, {}];
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber);
      this.notificationListenerSpy.yield();
      sinon.assert.notCalled(telephonyDialSpy);
    });

    test('place a voicemail call to SIM 1', function() {
      var serviceId = 0;
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber, serviceId);
      this.notificationListenerSpy.yield();
      sinon.assert.calledWithExactly(
        telephonyDialSpy, voicemailNumber, serviceId);
    });

    test('place a voicemail call to SIM 2', function() {
      var serviceId = 1;
      voicemailNumber = '222';
      Voicemail.showNotification(
        notificationTitle, notificationText, voicemailNumber, serviceId);
      this.notificationListenerSpy.yield();
      sinon.assert.calledWithExactly(
        telephonyDialSpy, voicemailNumber, serviceId);
    });
  });
});
