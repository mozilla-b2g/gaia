'use strict';

function AudioChannelTestApp(client, origin) {
  this.client = client;
  this.origin = origin;
}

module.exports = AudioChannelTestApp;

AudioChannelTestApp.Selector = Object.freeze({
  normalPlay: '#normal .play',
  normalPause: '#normal .pause',
  contentPlay: '#content .play',
  contentPause: '#content .pause',
  alarmPlay: '#alarm .play',
  alarmPause: '#alarm .pause',
  systemPlay: '#system .play',
  systemPause: '#system .pause',
  ringerPlay: '#ringer .play',
  ringerPause: '#ringer .pause',
  telephonyPlay: '#telephony .play',
  telephonyPause: '#telephony .pause',
  notificationPlay: '#notification .play',
  notificationPause: '#notification .pause',
  publicnotificationPlay: '#publicnotification .play',
  publicnotificationPause: '#publicnotification .pause',
});

AudioChannelTestApp.prototype = {
  client: null,

  get normalPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.normalPlay);
  },

  get normalPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.normalPause);
  },

  get contentPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.contentPlay);
  },

  get contentPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.contentPause);
  },

  get alarmPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.alarmPlay);
  },

  get alarmPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.alarmPause);
  },

  get systemPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.systemPlay);
  },

  get systemPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.systemPause);
  },

  get ringerPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.ringerPlay);
  },

  get ringerPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.ringerPause);
  },

  get telephonyPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.telephonyPlay);
  },

  get telephonyPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.telephonyPause);
  },

  get notificationPlay() {
    return this.client
      .helper.waitForElement(AudioChannelTestApp.Selector.notificationPlay);
  },

  get notificationPause() {
    return this.client
      .helper.waitForElement(AudioChannelTestApp.Selector.notificationPause);
  },

  get publicnotificationPlay() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.publicnotificationPlay);
  },

  get publicnotificationPause() {
    return this.client.helper
      .waitForElement(AudioChannelTestApp.Selector.publicnotificationPause);
  }
};
