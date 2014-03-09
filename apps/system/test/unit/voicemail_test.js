requireApp('system/js/voicemail.js');
requireApp('system/shared/js/settings_helper.js');

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_simslot.js');
requireApp('system/test/unit/mock_simslot_manager.js');
requireApp('system/test/unit/mock_navigator_moz_voicemail.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

mocha.setup({
  globals: ['SIMSlotManager']
});

suite('voicemail notification', function() {
  var realMozVoicemail;
  var realMozSettings;
  var realSIMSlotManager;
  var realL10n;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockNavigatorMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realSIMSlotManager = window.SIMSlotManager;
    window.SIMSlotManager = MockSIMSlotManager;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  setup(function() {
    Voicemail.init();
    this.notificationListenerSpy = sinon.spy('');
    this.sinon.stub(window, 'Notification').returns({
      addEventListener: this.notificationListenerSpy,
      close: function() {}
    });
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
    window.SIMSlotManager = realSIMSlotManager;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
    MockSIMSlotManager.mTeardown();
    MockNavigatorMozVoicemail.mTeardown();
    window.Notification.restore();
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

    suite('showNotification should register a click event handler correctly',
      function() {
        test('should register a handler when with a voice number', function() {
          Voicemail.showNotification('title', 'text', '111');
          sinon.assert.calledWith(this.notificationListenerSpy, 'click');
        });

        test('should not register a handler when without a voice number',
          function() {
            Voicemail.showNotification('title', 'text');
            sinon.assert.notCalled(this.notificationListenerSpy);
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

              test('with returnMessage, with voicemail number', function(done) {
                MockNavigatorMozVoicemail.mTriggerEvent('statuschanged');
                setTimeout((function() {
                  // display the message count as title
                  var expectedTitle = MockNavigatorMozVoicemail.mMessage;
                  // display the voice mail number as body
                  var expectedText = 'dialNumber{"number":"' +
                    this.voiceNumbers[serviceId] + '"}';

                  // Add SIM number indicator in the multi sim case
                  if (this.isMultiSIM) {
                    expectedTitle =
                      'SIM ' + (serviceId + 1) + ' - ' + expectedTitle;
                  }

                  sinon.assert.calledWith(Voicemail.showNotification,
                    expectedTitle, expectedText, this.voiceNumbers[serviceId]);

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

                    // Add SIM number indicator in the multi sim case
                    if (this.isMultiSIM) {
                      expectedTitle =
                        'SIM ' + (serviceId + 1) + ' - ' + expectedTitle;
                    }

                    sinon.assert.calledWith(Voicemail.showNotification,
                      expectedTitle, expectedText,
                      this.voiceNumbers[serviceId]);

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

                    // Add SIM number indicator in the multi sim case
                    if (this.isMultiSIM) {
                      expectedTitle =
                        'SIM ' + (serviceId + 1) + ' - ' + expectedTitle;
                    }

                    sinon.assert.calledWith(Voicemail.showNotification,
                      expectedTitle, expectedText,
                      this.voiceNumbers[serviceId]);

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

                  // Add SIM number indicator in the multi sim case
                  if (this.isMultiSIM) {
                    expectedTitle =
                      'SIM ' + (serviceId + 1) + ' - ' + expectedTitle;
                  }

                  sinon.assert.calledWith(Voicemail.showNotification,
                    expectedTitle, expectedText, undefined);

                  done();
                }).bind(this));
              });
          });
        });
      })(i);
    }
  });
});
