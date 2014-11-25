'use strict';

var passphrase, realMozSettings, realMozSetMessageHandler, realL10n;

suite('SMS Main', function() {
  suiteSetup(function(done) {
    require([
      'mymocks/mock_passphrase',
      'mocks/mock_navigator_moz_settings',
      'mocks/mock_navigator_moz_set_message_handler',
      'mocks/mock_l10n'
    ],
    function(PassPhrase, mozSettings, mozSetMessageHandler, MockL10n) {
      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = mozSettings;

      realL10n = navigator.mozL10n;
      navigator.mozL10n = MockL10n;

      realMozSetMessageHandler = navigator.mozSetMessageHandler;
      navigator.mozSetMessageHandler = mozSetMessageHandler;
      navigator.mozSetMessageHandler.mSetup();

      // create passphrase instance
      passphrase = new PassPhrase('rppmac', 'rppsalt');
      passphrase.change('mypass').then(function() {
        done();
      });
    });
  });

  setup(function(done) {
    var customRequire = requirejs.config({
      map: {
        '*': {
          'rpp/passphrase': 'mymocks/mock_passphrase',
          'sms/commands': 'mymocks/mock_commands'
        }
      }
    });
    customRequire(['sms/main'], RppSMSHandler => {
      this.subject = RppSMSHandler;
      this.subject.init();

      this.sandbox = sinon.sandbox.create();

      this.fakeSMS = function(message) {
        navigator.mozSetMessageHandler.mTrigger('sms-received', {
          body: message,
          sender: 123456789
        });
      };

      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
  });

  suite('Handling SMS response', function() {

    setup(function() {
      this.sandbox.spy(this.subject, '_ring');
      this.sandbox.spy(this.subject, '_lock');
      this.sandbox.spy(this.subject, '_locate');
      this.sandbox.spy(this.subject, '_sendSMS');

      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': false,
        'lockscreen.passcode-lock.enabled': false,
        'rpp.ring.enabled': false,
        'rpp.lock.enabled': false,
        'rpp.locate.enabled': false
      });
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should do nothing, bad command was send', function() {
      this.fakeSMS('rpp ringy mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, bad sms was send', function() {
      this.fakeSMS('esrpp ringy mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, ring feature is turned off', function() {
      this.fakeSMS('rpp ring mypass');
      
      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, lock feature is disabled', function() {
      this.fakeSMS('rpp lock mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, locate feature is disabled', function() {
      this.fakeSMS('rpp locate mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, bad passphrase was send', function() {
      this.fakeSMS('rpp ring badpass');

      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rpp.ring.enabled': true
      });

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should ring device, ring feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rpp.ring.enabled': true
      });

      this.fakeSMS('rpp ring mypass');

      sinon.assert.called(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
      sinon.assert.calledWith(this.subject._sendSMS, 123456789, 'sms-ring');
    });

    test('should lock device, lock feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rpp.lock.enabled': true
      });

      this.fakeSMS('rpp lock mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.called(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
      sinon.assert.calledWith(this.subject._sendSMS, 123456789, 'sms-lock');
    });

    test('should locate device, locate feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rpp.locate.enabled': true
      });

      this.fakeSMS('rpp locate mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.called(this.subject._locate);
      sinon.assert.calledWith(this.subject._sendSMS, 123456789, {
        id: 'sms-locate',
        args: {
          latitude: 51,
          longitude: 13
        }
      });
    });

  });

});
