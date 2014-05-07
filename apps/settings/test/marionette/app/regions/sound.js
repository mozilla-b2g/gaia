'use strict';
var Base = require('../base');

/**
 * Abstraction around settings sound panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function SoundPanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, SoundPanel.Selectors);

}

module.exports = SoundPanel;

SoundPanel.Selectors = {
  'vibrateCheckbox': '#sound input[name="vibration.enabled"]',
  'vibrateLabel': '#sound label.pack-switch',
  'mediaSlider': '#sound .media input',
  'ringerSlider': '#sound .notification input',
  'alarmSlider': '#sound .alarm input',
  'keypadCheckbox': '#sound input[name="phone.ring.keypad"]',
  'keypadSpan': '#sound span[data-l10n-id="keypad"]',
  'cameraShutterCheckbox': '#sound input[name="camera.shutter.enabled"]',
  'cameraShutterSpan': '#sound span[data-l10n-id="camera-shutter"]',
  'videoRecordingCheckbox':
              '#sound input[name="camera.recordingsound.enabled"]',
  'videoRecordingSpan': '#sound span[data-l10n-id="camera-recordingsound"]',
  'sentMailCheckbox': '#sound input[name="mail.sent-sound.enabled"]',
  'sentMailSpan': '#sound span[data-l10n-id="sent-mail"]',
  'sentMessageCheckbox':
              '#sound input[name="message.sent-sound.enabled"]',
  'sentMessageSpan': '#sound span[data-l10n-id="sent-message"]',
  'unlockScreenCheckbox':
              '#sound input[name="lockscreen.unlock-sound.enabled"]',
  'unlockScreenSpan': '#sound span[data-l10n-id="unlock-screen"]'
};

SoundPanel.prototype = {

  __proto__: Base.prototype,

  get isVibrateEnabled() {
    return this.findElement('vibrateCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('vibration.enabled');
  },

  tapOnVibration: function() {
    this.waitForElement('vibrateLabel').tap();
  },

  /* Volume */
  get contentValue() {
    return this.client.settings.get('audio.volume.content');
  },

  tapOnMediaSlider: function() {
    this.waitForElement('mediaSlider').tap();
  },

  get ringerValue() {
    return this.client.settings.get('audio.volume.notification');
  },

  tapOnRingerSlider: function() {
    this.waitForElement('ringerSlider').tap();
  },

  get alarmValue() {
    return this.client.settings.get('audio.volume.alarm');
  },

  tapOnAlarmSlider: function() {
    this.waitForElement('alarmSlider').tap();
  },

  /* Other sounds */
  get isKeypadChecked() {
    return this.findElement('keypadCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('phone.ring.keypad');
  },

  tapOnKeypad: function() {
    this.waitForElement('keypadSpan').tap();
  },

  get isCameraShutterChecked() {
    return this.findElement('cameraShutterCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('phone.ring.keypad');
  },

  tapOnCameraShutter: function() {
    this.waitForElement('cameraShutterSpan').tap();
  },

  get isVideoRecordingChecked() {
    return this.findElement('videoRecordingCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('camera.recordingsound.enabled');
  },

  tapOnVideoRecording: function() {
    this.waitForElement('videoRecordingSpan').tap();
  },

  get isSentMailChecked() {
    return this.findElement('sentMailCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('mail.sent-sound.enabled');
  },

  tapOnSentMail: function() {
    this.waitForElement('sentMailSpan').tap();
  },

  get isSentMessageChecked() {
    return this.findElement('sentMessageCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('message.sent-sound.enabled');
  },

  tapOnSentMessage: function() {
    this.waitForElement('sentMessageSpan').tap();
  },

  get isUnlockScreenChecked() {
    return this.findElement('unlockScreenCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('message.sent-sound.enabled');
  },

  tapOnUnlockScreen: function() {
    this.waitForElement('unlockScreenSpan').tap();
  }

};
