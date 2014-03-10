requireApp('system/js/voicemail.js');

requireApp('system/test/unit/mock_l10n.js');
requireApp('system/test/unit/mock_navigator_moz_voicemail.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');

suite('voicemail notification', function() {
  var realMozVoicemail;
  var realMozSettings;
  var realL10n;

  suiteSetup(function() {
    realMozVoicemail = navigator.mozVoicemail;
    navigator.mozVoicemail = MockNavigatorMozVoicemail;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  setup(function() {
    Voicemail.init();
    this.sinon.useFakeTimers();
    var dummy = { addEventListener: function() {}, close: function() {} };
    this.sinon.stub(window, 'Notification').returns(dummy);
  });

  suiteTeardown(function() {
    navigator.mozVoicemail = realMozVoicemail;
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realL10n;
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  test('no voicemail, no notification', function() {
    navigator.mozVoicemail.setActive(false);
    navigator.mozVoicemail.triggerEvent('statuschanged');
    this.sinon.clock.tick();
    sinon.assert.notCalled(window.Notification);
  });

  test('one voicemail, one notification', function() {
    navigator.mozVoicemail.setActive(true);
    navigator.mozVoicemail.triggerEvent('statuschanged');
    this.sinon.clock.tick();
    sinon.assert.calledOnce(window.Notification);
  });
});
