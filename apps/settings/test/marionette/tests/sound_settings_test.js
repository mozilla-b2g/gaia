'use strict';
var Settings = require('../app/app'),
    assert = require('assert');

marionette('manipulate sound settings', function() {
  var ringtonePath = '/shared/resources/media/ringtones/' +
    'ringer_classic_courier.opus';
  var alerttonePath = '/shared/resources/media/notifications/' +
    'notifier_bell.opus';

  var client = marionette.client({
    settings: {
      'dialer.ringtone.filepath': ringtonePath,
      'notification.ringtone.filepath': alerttonePath
    }
  });
  var settingsApp;
  var soundPanel;

  setup(function() {
    settingsApp = new Settings(client);
    settingsApp.launch();
    // Navigate to the sound menu
    soundPanel = settingsApp.soundPanel;
  });

  test('check vibrate mode initial state', function() {
    assert.ok(
      soundPanel.isVibrateEnabled,
      'vibrate mode is enabled by default'
    );
  });

  test('disable vibrate mode', function() {
    soundPanel.tapOnVibration();
    assert.ok(
      !soundPanel.isVibrateEnabled,
      'vibrate mode has been disabled'
    );
  });

  /* Volume */
  test('change media state', function() {
    var value = soundPanel.contentValue;
    soundPanel.tapOnMediaSlider();
    var content_val = (value === soundPanel.contentValue);
    assert.ok(
      !content_val,
      'media state is changed'
    );
  });

  test('change ringer state', function() {
    var value = soundPanel.ringerValue;
    soundPanel.tapOnRingerSlider();
    var ringer_val = (value === soundPanel.ringerValue);
    assert.ok(
      !ringer_val,
      'ringer state is changed'
    );
  });

  test('change alarm state', function() {
    var alarm_value = soundPanel.alarmValue;
    soundPanel.tapOnAlarmSlider();
    var alarm_val = (alarm_value === soundPanel.alarmValue);
    assert.ok(
      !alarm_val,
      'alarm state is changed'
    );
  });

  test('check default ringtone name', function() {
    var ringtone_name = soundPanel.ringtoneButtonText;
    assert.equal(ringtone_name, 'Classic Courier');
  });

  test('check default alerttone name', function() {
    var alerttone_name = soundPanel.alerttoneButtonText;
    assert.equal(alerttone_name, 'Bell');
  });

  /* Other sounds */
  test('check keypad initial state', function() {
    assert.ok(
      soundPanel.isKeypadChecked,
      'keypad sound is enabled by default'
    );
  });

  test('disable keypad sound', function() {
    soundPanel.tapOnKeypad();
    assert.ok(
      !soundPanel.isKeypadChecked,
      'keypad sound has been disabled'
    );
  });

  test('check camera shutter initial state', function() {
    assert.ok(
      soundPanel.isCameraShutterChecked,
      'camera shutter sound is enabled by default'
    );
  });

  test('disable camera shutter sound', function() {
    soundPanel.tapOnCameraShutter();
    assert.ok(
      !soundPanel.isCameraShutterChecked,
      'camera shutter sound has been disabled'
    );
  });

  test('check video recording initial state', function() {
    assert.ok(
      !soundPanel.isVideoRecordingChecked,
      'video recording sound is disabled by default'
    );
  });

  test('enable video recording sound', function() {
    soundPanel.tapOnVideoRecording();
    assert.ok(
      soundPanel.isVideoRecordingChecked,
      'video recording sound has been enabled'
    );
  });

  test('check sent mail initial state', function() {
    assert.ok(
      soundPanel.isSentMailChecked,
      'sent mail sound is enabled by default'
    );
  });

  test('disable sent mail sound', function() {
    soundPanel.tapOnSentMail();
    assert.ok(
      !soundPanel.isSentMailChecked,
      'sent mail sound has been disabled'
    );
  });

  test('check sent message initial state', function() {
    assert.ok(
      soundPanel.isSentMessageChecked,
      'sent message sound is enabled by default'
    );
  });

  test('disable sent message sound', function() {
    soundPanel.tapOnSentMessage();
    assert.ok(
      !soundPanel.isSentMessageChecked,
      'sent message sound has been disabled'
    );
  });

  test('check unlock screen initial state', function() {
    assert.ok(
      !soundPanel.isUnlockScreenChecked,
      'unlock screen sound is disabled by default'
    );
  });

  test('enable unlock screen sound', function() {
    soundPanel.tapOnUnlockScreen();
    assert.ok(
      soundPanel.isUnlockScreenChecked,
      'unlock screen sound has been enabled'
    );
  });

});
