requireApp('communications/dialer/js/voicemail.js');

requireApp('communications/dialer/test/unit/mock_mozVoicemail.js');
requireApp('communications/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('dialer/voicemail', function() {
  var realMozVoicemail;
  var realMozSettings;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
  });

  suite('SIM card and mozSettings have voicemail number', function() {
    setup(function() {
      MockMozVoicemail.number = '123';
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
      Voicemail._reset();
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
    });

    test('call the voicemail number', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        assert.ok(isVoicemailNumber);
        done();
      });
    });

    test('call a number is not the voicemail number', function(done) {
      Voicemail.check('1234567890', function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
        done();
      });
    });
  });

  suite('SIM card has voicemail number but ' +
        'mozSettings does not have' , function() {
    setup(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
      Voicemail._reset();
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
    });

    test('call the voicemail number', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        assert.ok(isVoicemailNumber);
        done();
      });
    });

    test('call a number is not the voicemail number', function(done) {
      Voicemail.check('1234567890', function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
        done();
      });
    });
  });


  suite('SIM card has no voicemail number but mozSettings has' , function() {
    setup(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
      Voicemail._reset();
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
    });

    test('call the voicemail number', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        assert.ok(isVoicemailNumber);
        done();
      });
    });

    test('call a number is not the voicemail number', function(done) {
      Voicemail.check('1234567890', function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
        done();
      });
    });
  });

  suite('SIM card and mozSettings have no voicemail number' , function() {
    setup(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '' }
      );
      Voicemail._reset();
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
    });

    test('call the voicemail number', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
        done();
      });
    });

    test('call a number is not the voicemail number', function(done) {
      Voicemail.check('1234567890', function(isVoicemailNumber) {
        assert.isFalse(isVoicemailNumber);
        done();
      });
    });
  });

  suite('calls to mozSettings are cached', function() {
    setup(function() {
      MockMozVoicemail.number = '';
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
      Voicemail._reset();
      this.sinon.spy(MockNavigatorSettings, 'createLock');
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
      MockNavigatorSettings.createLock.restore();
    });

    test('foo', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        Voicemail.check('123', function(isVoicemailNumber) {
          assert.ok(MockNavigatorSettings.createLock.calledOnce);
          done();
        });
      });
    });
  });

  suite('number from mozSettings is updated', function() {
    setup(function() {
      MockMozVoicemail.number = '';
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
      Voicemail._reset();
    });

    teardown(function() {
      MockMozVoicemail.number = null;
      MockNavigatorSettings.mTeardown();
    });

    test('foo', function(done) {
      Voicemail.check('123', function(isVoicemailNumber) {
        assert.ok(isVoicemailNumber);
        MockNavigatorSettings.mTriggerObservers('ril.iccInfo.mbdn',
                                                {settingValue: '456'});
        Voicemail.check('456', function(isVoicemailNumber) {
          assert.ok(isVoicemailNumber);
          done();
        });
      });
    });
  });

});
