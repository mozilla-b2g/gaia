/* global BaseModule */
'use strict';

(function() {
  var NONE = -1;
  var PLAY_CURRENT_AND_NEW_CHANNEL = 0;
  var PAUSE_CURRENT_CHANNEL = 1;
  var PAUSE_THEN_RESUME_CURRENT_CHANNEL = 2;
  var FADE_OUT_CURRENT_CHANNEL = 3;
  var FADE_OUT_NEW_CHANNEL = 4;
  var PAUSE_THEN_VIBRATE_CURRENT_CHANNEL = 5;
  var VIBRATE_NEW_CHANNEL = 6;
  var COMPETING_POLICIES = {
    'normal': {
      'normal': PAUSE_CURRENT_CHANNEL,
      'content': PAUSE_CURRENT_CHANNEL,
      'alarm': PAUSE_CURRENT_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PAUSE_CURRENT_CHANNEL,
      'telphony': PAUSE_CURRENT_CHANNEL,
      'notification': FADE_OUT_CURRENT_CHANNEL,
      'publicNotification': FADE_OUT_CURRENT_CHANNEL
    },
    'content': {
      'normal': PAUSE_THEN_RESUME_CURRENT_CHANNEL,
      'content': PAUSE_THEN_RESUME_CURRENT_CHANNEL,
      'alarm': PAUSE_THEN_RESUME_CURRENT_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PAUSE_THEN_RESUME_CURRENT_CHANNEL,
      'telphony': PAUSE_THEN_RESUME_CURRENT_CHANNEL,
      'notification': FADE_OUT_CURRENT_CHANNEL,
      'publicNotification': FADE_OUT_CURRENT_CHANNEL
    },
    'alarm': {
      'normal': PLAY_CURRENT_AND_NEW_CHANNEL,
      'content': PLAY_CURRENT_AND_NEW_CHANNEL,
      'alarm': PAUSE_CURRENT_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': FADE_OUT_CURRENT_CHANNEL,
      'telphony': FADE_OUT_CURRENT_CHANNEL,
      'notification': PLAY_CURRENT_AND_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    },
    'system': {
      'normal': PLAY_CURRENT_AND_NEW_CHANNEL,
      'content': PLAY_CURRENT_AND_NEW_CHANNEL,
      'alarm': PLAY_CURRENT_AND_NEW_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PLAY_CURRENT_AND_NEW_CHANNEL,
      'telphony': PLAY_CURRENT_AND_NEW_CHANNEL,
      'notification': PLAY_CURRENT_AND_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    },
    'ringer': {
      'normal': PLAY_CURRENT_AND_NEW_CHANNEL,
      'content': PLAY_CURRENT_AND_NEW_CHANNEL,
      'alarm': PLAY_CURRENT_AND_NEW_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PAUSE_THEN_VIBRATE_CURRENT_CHANNEL,
      'telphony': PLAY_CURRENT_AND_NEW_CHANNEL,
      'notification': PLAY_CURRENT_AND_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    },
    'telphony': {
      'normal': PLAY_CURRENT_AND_NEW_CHANNEL,
      'content': PLAY_CURRENT_AND_NEW_CHANNEL,
      'alarm': PAUSE_THEN_VIBRATE_CURRENT_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': VIBRATE_NEW_CHANNEL,
      'telphony': NONE,
      'notification': VIBRATE_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    },
    'notification': {
      'normal': FADE_OUT_NEW_CHANNEL,
      'content': FADE_OUT_NEW_CHANNEL,
      'alarm': PLAY_CURRENT_AND_NEW_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PLAY_CURRENT_AND_NEW_CHANNEL,
      'telphony': PLAY_CURRENT_AND_NEW_CHANNEL,
      'notification': PLAY_CURRENT_AND_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    },
    'publicNotification': {
      'normal': FADE_OUT_NEW_CHANNEL,
      'content': FADE_OUT_NEW_CHANNEL,
      'alarm': PLAY_CURRENT_AND_NEW_CHANNEL,
      'system': PLAY_CURRENT_AND_NEW_CHANNEL,
      'ringer': PLAY_CURRENT_AND_NEW_CHANNEL,
      'telphony': PLAY_CURRENT_AND_NEW_CHANNEL,
      'notification': PLAY_CURRENT_AND_NEW_CHANNEL,
      'publicNotification': PLAY_CURRENT_AND_NEW_CHANNEL
    }
  };

  var AudioChannelManager = function() {};

  AudioChannelManager.SERVICES = [
    'registerAudioChannel',
    'unregisterAudioChannel'
  ];

  BaseModule.create(AudioChannelManager, {
    name: 'AudioChannelManager',
    DEBUG: true,
    _activeChannels: null,
    _inactiveChannels: null,
    _fadedByVolumeDownChannels: null,

    /**
     * Initial the module.
     */
    _start: function() {
      this._activeChannels = [];
      this._inactiveChannels = [];
      this._fadedByVolumeDownChannels = [];
      this.debug('Start the audio channel manager module.');
    },

    /**
     * Add an app into manager to manage its audio channels.
     * @param {MozBrowser} app An app you want to manage.
     */
    registerAudioChannel: function(app) {
      this.debug(app.name);
      app.browser.element.allowedAudioChannels.forEach(function(channel) {
        channel.onactivestatechanged = function(evt) {
          this.debug('onactivestatechanged');
          // var channel = evt.target;
          // channel.isActive().onsuccess = function(evt) {
          //   var isActive = evt.target.result;
          //   if (isActive) {
          //     this._handleAudioChannelCompeting(channel);
          //   } else {
          //     this._resumeLatestPausedChannel();
          //     this._setVolume(this._fadedByVolumeDownChannels, 1);
          //   }
          // }.bind(this);
        }.bind(this);
        this.debug('Register ' + channel.name);
      }.bind(this));
    },

    /**
     * Remove an app from manager,
     * if you don't wnat to manage it anymore.
     * @param {MozBrowser} app An app you want to remove.
     */
    unregisterAudioChannel: function(app) {
      app.allowedAudioChannels.forEach(function(channel) {
        channel.onactivestatechanged = undefined;
      });
    },

    /**
     * Handel the new audio channel.
     * @param {BrowserElementAudioChannel} channel 
     * A New channel you want to handel.
     */
    _handleAudioChannelCompeting: function(channel) {
      this.debug('_handleAudioChannelCompeting');
      var competingResult = this._compete(channel.name);
      var currentChannel;
      this.debug('Competing result: ' + competingResult);
      switch (competingResult) {
        case PLAY_CURRENT_AND_NEW_CHANNEL:
          this._play(channel);
          this._activeChannels.push(channel);
          break;

        case PAUSE_CURRENT_CHANNEL:
          currentChannel = this._activeChannels.pop();
          this._pause(currentChannel);
          break;

        case PAUSE_THEN_RESUME_CURRENT_CHANNEL:
          currentChannel = this._activeChannels.pop();
          this._pause(currentChannel);
          this._pausedApps.push(currentChannel);
          break;

        case FADE_OUT_CURRENT_CHANNEL:
          this._activeChannels.forEach(function(channel) {
            this._play(channel, 0.2);
            this._fadedByVolumeDownChannels.push(channel);
          }.bind(this));
          break;

        case FADE_OUT_NEW_CHANNEL:
          this._play(channel, 0.2);
          this._fadedByVolumeDownChannels.push(channel);
          break;

        case PAUSE_THEN_VIBRATE_CURRENT_CHANNEL:
          currentChannel = this._activeChannels.pop();
          this._pause(currentChannel);
          this._vibrate();
          break;

        case VIBRATE_NEW_CHANNEL:
          this._vibrate();
          break;
      }
    },

    /**
     * Compete new and playing audio channels.
     * The policy is listed in page 12 in [1].
     * [1]: https://bug961967.bugzilla.mozilla.org/attachment.cgi?id=8541542.
     * @param {String} newAudioChannel Channel name.
     * @return {Number} The competing result.
     */
    _compete: function(newAudioChannel) {
      var topPriorityChannel =
        this._activeChannels[this._activeChannels.length - 1];
      this.debug('Top priority channel: ' + topPriorityChannel);
      return topPriorityChannel ?
        COMPETING_POLICIES[topPriorityChannel][newAudioChannel] :
        PLAY_CURRENT_AND_NEW_CHANNEL;
    },

    /**
     * Resume latest paused audio channel.
     */
    _resumeLatestPausedChannel: function() {
      var app = this._pausedApps.pop();
      app.allowedAudioChannels.forEach(function(channel) {
        if (channel.getMuted()) {
          channel.setMuted(false);
        }
      });
    },

    /**
     * Change volume of audio channels.
     * @param {Array|BrowserElementAudioChannel} channels 
     * Audio channels you want to turn down or up its volume.
     * @param {Number} volume 0 to 1.
     */
    _setVolume: function(channels, volume) {
      if (!Array.isArray(channels)) {
        channels = [channels];
      }
      channels.forEach(function(channel) {
        channel.setVolume(volume);
      });
    },

    /**
     * Play the audio channel.
     * @param {BrowserElementAudioChannel} channel A audio channel.
     * @param {Number} volume 0 to 1.
     */
    _play: function(channel, volume) {
      this.debug('play');
    },

    /**
     * Pause the audio channel.
     * @param {BrowserElementAudioChannel} channel A audio channel.
     */
    _pause: function(channel) {
      this.debug('pause');
    },

    /**
     * Vibrate.
     */
    _vibrate: function() {
      this.debug('vibrate');
    }
  });
}());
