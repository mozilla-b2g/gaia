/*global MockNavigatorSettings, MockAudio, MockVibrate, SettingsURL, Notify,
         MocksHelper */

'use strict';

require('/shared/test/unit/mocks/mock_settings_url.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_audio.js');
require('/views/shared/test/unit/mock_navigator_vibrate.js');
require('/views/shared/js/notify.js');

var mocksHelperNotifications = new MocksHelper([
  'Audio',
  'SettingsURL'
]).init();

suite('check the ringtone and vibrate function', function() {
  var realMozSettings;
  var isDocumentHidden = true;

  mocksHelperNotifications.attachTestHelpers();

  setup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    // Spy on the mocks
    this.sinon.spy(Audio.prototype, 'play');
    this.sinon.stub(navigator, 'vibrate', MockVibrate);
    this.sinon.spy(window, 'Audio');
    this.sinon.useFakeTimers();
    MockNavigatorSettings.mSyncRepliesOnly = true;

    this.sinon.stub(SettingsURL.prototype, 'get', function() {
      return 'ringtone';
    });

    this.sinon.stub(SettingsURL.prototype, 'set', function(value) {
      return value;
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => isDocumentHidden
    });
  });

  teardown(function() {
    navigator.mozSettings = realMozSettings;
    delete document.hidden;
  });

  function sendVisibilityEvent() {
    var visibilityEvent = new CustomEvent(
      'visibilitychange',
      { bubbles: true }
    );

    window.dispatchEvent(visibilityEvent);
  }

  function assertAudio() {
    sinon.assert.called(Audio);
    sinon.assert.called(Audio.prototype.play);

    assert.equal(MockAudio.instances[0].src, 'ringtone');
    assert.equal(
      MockAudio.instances[0].mozAudioChannelType, 'notification'
    );
  }

  function assertVibrate() {
    sinon.assert.calledWith(
      navigator.vibrate,
      [200, 200, 200, 200]
    );
  }

  suite('mozSettings is unavailable', function() {
    test('We do nothing but we do not stop', function(done) {
      delete navigator.mozSettings;

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {
        sinon.assert.notCalled(Audio.prototype.play);
        sinon.assert.notCalled(navigator.vibrate);
        sinon.assert.notCalled(Audio);
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });
  });

  suite('volume is 1 and vibration is enabled', function() {
    test('play ringtone and vibrate', function(done) {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      navigator.mozSettings.createLock().set(settings);

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {

        // As document is not shown in the test, we launch the
        // event of visibility
        sendVisibilityEvent();
        assertAudio();
        assertVibrate();
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });
  });

  suite('volume is 1 and vibration is disabled', function() {
    test('play ringtone and do not vibrate', function(done) {
      var settings = {
        'audio.volume.notification': 1,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      navigator.mozSettings.createLock().set(settings);

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {
        sinon.assert.notCalled(navigator.vibrate);
        assertAudio();
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });
  });

  suite('volume is 0 and vibration is enabled', function() {
    test('do not play ringtone and vibrate', function(done) {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      navigator.mozSettings.createLock().set(settings);

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {
        // As document is not shown in the test, we launch the
        // event of visibility
        sendVisibilityEvent();

        sinon.assert.notCalled(Audio.prototype.play);
        sinon.assert.notCalled(Audio);

        assertVibrate();
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });

    test('vibrate asap if the app is displayed', function(done) {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': true
      };
      navigator.mozSettings.createLock().set(settings);
      isDocumentHidden = false;

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {
        assertVibrate();
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });
  });

  suite('volume is 0 and vibration is disabled', function() {
    test('play ringtone and do not vibrate', function(done) {
      var settings = {
        'audio.volume.notification': 0,
        'notification.ringtone': 'ringtone',
        'vibration.enabled': false
      };
      navigator.mozSettings.createLock().set(settings);

      Promise.all([
        Notify.ringtone(),
        Notify.vibrate()
      ]).then(() => {
        sinon.assert.notCalled(Audio.prototype.play);
        sinon.assert.notCalled(navigator.vibrate);
        sinon.assert.notCalled(Audio);
      }).then(done, done);

      MockNavigatorSettings.mReplyToRequests();
    });
  });
});
