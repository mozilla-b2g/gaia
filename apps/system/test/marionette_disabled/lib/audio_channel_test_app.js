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
    return this.client.findElement(AudioChannelTestApp.Selector.normalPlay);
  },

  get normalPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.normalPause);
  },

  get contentPlay() {
    return this.client.findElement(AudioChannelTestApp.Selector.contentPlay);
  },

  get contentPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.contentPause);
  },

  get alarmPlay() {
    return this.client.findElement(AudioChannelTestApp.Selector.alarmPlay);
  },

  get alarmPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.alarmPause);
  },

  get systemPlay() {
    return this.client.findElement(AudioChannelTestApp.Selector.systemPlay);
  },

  get systemPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.systemPause);
  },

  get ringerPlay() {
    return this.client.findElement(AudioChannelTestApp.Selector.ringerPlay);
  },

  get ringerPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.ringerPause);
  },

  get telephonyPlay() {
    return this.client.findElement(AudioChannelTestApp.Selector.telephonyPlay);
  },

  get telephonyPause() {
    return this.client.findElement(AudioChannelTestApp.Selector.telephonyPause);
  },

  get notificationPlay() {
    return this.client
      .findElement(AudioChannelTestApp.Selector.notificationPlay);
  },

  get notificationPause() {
    return this.client
      .findElement(AudioChannelTestApp.Selector.notificationPause);
  },

  get publicnotificationPlay() {
    return this.client
      .findElement(AudioChannelTestApp.Selector.publicnotificationPlay);
  },

  get publicnotificationPause() {
    return this.client
      .findElement(AudioChannelTestApp.Selector.publicnotificationPause);
  },
};
