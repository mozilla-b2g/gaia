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
      passphrase = new PassPhrase('rpmac', 'rpsalt');
      passphrase.change('mypass').then(function() {
        done();
      });
    });
  });

  setup(function(done) {
    var customRequire = requirejs.config({
      map: {
        '*': {
          'rp/passphrase': 'mymocks/mock_passphrase',
          'sms/commands': 'mymocks/mock_commands'
        }
      }
    });
    customRequire(['sms/main'], RpSMSHandler => {
      this.subject = RpSMSHandler;
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
        'rp.ring.enabled': false,
        'rp.lock.enabled': false,
        'rp.locate.enabled': false
      });
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('should do nothing, bad command was send', function() {
      this.fakeSMS('rp ringy mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, bad sms was send', function() {
      this.fakeSMS('esrp ringy mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, ring feature is turned off', function() {
      this.fakeSMS('rp ring mypass');
      
      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, lock feature is disabled', function() {
      this.fakeSMS('rp lock mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, locate feature is disabled', function() {
      this.fakeSMS('rp locate mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should do nothing, bad passphrase was send', function() {
      this.fakeSMS('rp ring badpass');

      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rp.ring.enabled': true
      });

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
    });

    test('should ring device, ring feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rp.ring.enabled': true
      });

      this.fakeSMS('rp ring mypass');

      sinon.assert.called(this.subject._ring);
      sinon.assert.notCalled(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
      sinon.assert.calledWith(this.subject._sendSMS, 123456789, 'sms-ring');
    });

    test('should lock device, lock feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rp.lock.enabled': true
      });

      this.fakeSMS('rp lock mypass');

      sinon.assert.notCalled(this.subject._ring);
      sinon.assert.called(this.subject._lock);
      sinon.assert.notCalled(this.subject._locate);
      sinon.assert.calledWith(this.subject._sendSMS, 123456789, 'sms-lock');
    });

    test('should locate device, locate feature enabled', function() {
      navigator.mozSettings.createLock().set({
        'lockscreen.enabled': true,
        'lockscreen.passcode-lock.enabled': true,
        'rp.locate.enabled': true
      });

      this.fakeSMS('rp locate mypass');

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
