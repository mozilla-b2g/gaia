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
      MockMozVoicemail._number = '123';
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
    });

    teardown(function() {
      MockMozVoicemail._number = null;
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
      MockMozVoicemail._number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
    });

    teardown(function() {
      MockMozVoicemail._number = null;
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
      MockMozVoicemail._number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '123' }
      );
    });

    teardown(function() {
      MockMozVoicemail._number = null;
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
      MockMozVoicemail._number = null;
      MockNavigatorSettings.createLock().set(
        { 'ril.iccInfo.mbdn': '' }
      );
    });

    teardown(function() {
      MockMozVoicemail._number = null;
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
});
