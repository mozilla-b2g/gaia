/* global module */
'use strict';

function SoundToast(client) {
  this.client = client;
}

module.exports = SoundToast;

SoundToast.Selector = Object.freeze({
  volumeBar : '#volume',
  vibrationIcon: '#volume span.vibration'
});

// After Bug 1015837 landed, we should have four new different styles for the
// Media, Alarm, Ringer & Notifications and Telephony volume bars, we will also
// need to modify these test methods base on the new styles.
SoundToast.prototype = {
  client: null,

  get volumeBar() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.volumeBar);
  },

  get vibrationIcon() {
    this.client.switchToFrame();
    return this.client.findElement(SoundToast.Selector.vibrationIcon);
  },

  waitForMediaVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.volumeBar.displayed();
      var vibrationShown = this.vibrationIcon.displayed();
      return (volumeShown && !vibrationShown) === shouldBeShown;
    }.bind(this));
  },

  waitForAlarmVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.volumeBar.displayed();
      var vibrationShown = this.vibrationIcon.displayed();
      return (volumeShown && !vibrationShown) === shouldBeShown;
    }.bind(this));
  },

  waitForNotificationVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.volumeBar.displayed();
      var vibrationShown = this.vibrationIcon.displayed();
      return (volumeShown && vibrationShown) === shouldBeShown;
    }.bind(this));
  },

  waitForTelephonyVolumeShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var volumeShown = this.volumeBar.displayed();
      var vibrationShown = this.vibrationIcon.displayed();
      return (volumeShown && !vibrationShown) === shouldBeShown;
    }.bind(this));
  }
};
