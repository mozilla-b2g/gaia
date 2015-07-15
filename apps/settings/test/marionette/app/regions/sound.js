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
  'vibrateCheckbox': '#sound gaia-switch[name="vibration.enabled"]',
  'mediaSlider': '#sound .media input',
  'ringerSlider': '#sound .notification input',
  'alarmSlider': '#sound .alarm input',
  'keypadCheckbox': '#sound [name="phone.ring.keypad"]',
  'cameraCheckbox': '#sound [name="camera.sound.enabled"]',
  'sentMessageCheckbox':
              '#sound [name="message.sent-sound.enabled"]',
  'unlockScreenCheckbox':
              '#sound [name="lockscreen.unlock-sound.enabled"]',
  'alerttoneButton': '.alert-tone-selection',
  'alerttoneButtonDesc': '.alert-tone-selection .desc',
  'ringtoneButton': '.ring-tone-selection',
  'ringtoneButtonDesc': '.ring-tone-selection .desc',
  'manageTonesButton': '.manage-tones-button'
};

SoundPanel.prototype = {

  __proto__: Base.prototype,

  isGaiaCheckboxChecked: function(selector) {
    return this.findElement(selector).scriptWith(function(el) {
      return el.wrappedJSObject.checked;
    });
  },

  get isVibrateEnabled() {
    return this.findElement('vibrateCheckbox')
      .getAttribute('checked') &&
      this.client.settings.get('vibration.enabled');
  },

  tapOnVibration: function() {
    this.waitForElement('vibrateCheckbox').tap();
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
    return this.isGaiaCheckboxChecked('keypadCheckbox') &&
      this.client.settings.get('phone.ring.keypad');
  },

  tapOnKeypad: function() {
    this.waitForElement('keypadCheckbox').tap();
  },

  get isCameraChecked() {
    return this.isGaiaCheckboxChecked('cameraCheckbox') &&
      this.client.settings.get('camera.sound.enabled');
  },

  tapOnCamera: function() {
    this.waitForElement('cameraCheckbox').tap();
  },

  get isSentMessageChecked() {
    return this.isGaiaCheckboxChecked('sentMessageCheckbox') &&
      this.client.settings.get('message.sent-sound.enabled');
  },

  tapOnSentMessage: function() {
    this.waitForElement('sentMessageCheckbox').tap();
  },

  get isUnlockScreenChecked() {
    return this.isGaiaCheckboxChecked('unlockScreenCheckbox') &&
      this.client.settings.get('message.sent-sound.enabled');
  },

  tapOnUnlockScreen: function() {
    this.waitForElement('unlockScreenCheckbox').tap();
  },

  clickRingToneSelect: function() {
    this.waitForElement('ringtoneButton').tap();
  },

  clickAlertToneSelect: function() {
    this.waitForElement('alerttoneButton').tap();
  },

  clickManageTones: function() {
    this.waitForElement('manageTonesButton').tap();
  },

  get selectedRingtone() {
    return this.waitForElement('ringtoneButtonDesc').text();
  },

  get selectedAlertTone() {
    return this.waitForElement('alerttoneButtonDesc').text();
  },

  getSelectedTone: function(type) {
    if (type === 'ringtone') {
      return this.selectedRingtone;
    } else if (type === 'alerttone') {
      return this.selectedAlertTone;
    }
  }
};
