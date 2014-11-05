/* global module */
'use strict';

function SoundToast(client) {
  this.client = client;
}

module.exports = SoundToast;

SoundToast.Selector = Object.freeze({
  MediaVolumeBar: '#volume[data-channel="content"]',
  AlarmVolumeBar: '#volume[data-channel="alarm"]',
  NotificationVolumeBar: '#volume[data-channel="notification"]',
  TelephonyVolumeBar: '#volume[data-channel="telephony"]',
  BluetoothSCOVolumeBar: '#volume[data-channel="bt_sco"]',
  LoudWarningPrompt: '#dialog-message[data-l10n-id="ceWarningcontent"]'
});

SoundToast.prototype = {
  client: null,

  get MediaVolumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.MediaVolumeBar);
  },

  get AlarmVolumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.AlarmVolumeBar);
  },

  get NotificationVolumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.NotificationVolumeBar);
  },

  get TelephonyVolumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.TelephonyVolumeBar);
  },

  get BluetoothSCOVolumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.BluetoothSCOVolumeBar);
  },

  get LoudWarningPrompt() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.LoudWarningPrompt);
  },

  waitForMediaVolumeShown: function(shouldBeShown, shouldBeMuted) {
    this.client.waitFor(function() {
      var volumeShown = this.MediaVolumeBar.displayed();
      var classes = this.MediaVolumeBar.getAttribute('class');
      var result = ((classes.indexOf('mute') !== -1) === shouldBeMuted);
      return (volumeShown && result) === shouldBeShown;
    }.bind(this));
  },

  waitForAlarmVolumeShown: function(shouldBeShown, shouldBeMuted) {
    this.client.waitFor(function() {
      var volumeShown = this.AlarmVolumeBar.displayed();
      var classes = this.AlarmVolumeBar.getAttribute('class');
      var result = ((classes.indexOf('mute') !== -1) === shouldBeMuted);
      return (volumeShown && result) === shouldBeShown;
    }.bind(this));
  },

  waitForNotificationVolumeShown:
    function(shouldBeShown, shouldBeMuted, shouldBeVibrated) {
      this.client.waitFor(function() {
        var volumeShown = this.NotificationVolumeBar.displayed();
        var classes = this.NotificationVolumeBar.getAttribute('class');
        var checkedMute = ((classes.indexOf('mute') !== -1) === shouldBeMuted);
        var checkedVibration =
          ((classes.indexOf('vibration') !== -1) === shouldBeVibrated);
        var result = (volumeShown && checkedMute && checkedVibration);

        return result === shouldBeShown;
      }.bind(this));
  },

  waitForTelephonyVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.TelephonyVolumeBar.displayed();
      return volumeShown === shouldBeShown;
    }.bind(this));
  },

  waitForBluetoothSCOVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.BluetoothSCOVolumeBar.displayed();
      return volumeShown === shouldBeShown;
    }.bind(this));
  },

  waitForLoudWarningShown: function() {
    this.client.waitFor(function() {
      var loudWarningPrompt = this.LoudWarningPrompt;
      if (!loudWarningPrompt.displayed()) {
        return false;
      }
      return loudWarningPrompt.getAttribute('textContent').length > 0;
    }.bind(this));
  },
};
