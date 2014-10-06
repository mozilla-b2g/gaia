/* global BaseModule */
'use strict';

(function() {
  var PLAY = 0;
  var VIBRATE = 1;
  var SMALLER_VOLUME_FOR_NEW_CHANNEL = 2;
  var SMALLER_VOLUME_FOR_PLAYING_CHANNEL = 3;
  var PAUSE_THEN_RESUME_PLAYING_CHANNEL = 4;

  var AudioChannelManager = function() {};

  BaseModule.create(AudioChannelManager, {
    name: 'AudioChannelManager',
    DEBUG: false,
    _playingApps: null,
    _pausedApps: null,
    _smallerVolumeApps: null,

    _start: function() {
      this._playingApps = [];
      this._pausedApps = [];
      this._smallerVolumeApps = [];
    },

    register: function(app) {
      app.addEventListener('mozaudiochannelchange', function(evt) {
        switch (evt.detail.state) {
          case 'play':
            this._handleAudioChannelCompeting(app, evt.detail.channel);
            break;
          case 'end':
            this._resumeLatestPausedApp();
            this._smallerVolumeApps.forEach(function(app) {
              app.allowedAudioChannels.volume = 1;
            });
            break;
        }
      });
    },

    _handleAudioChannelCompeting: function(app, channel) {
      switch (this.compete(channel)) {
        case PLAY:
          this._play(app, channel);
          this._playingApps.push(app);
          break;

        case VIBRATE:
          this._vibrate(app);
          break;

        case SMALLER_VOLUME_FOR_NEW_CHANNEL:
          this._play(app, 0.2);
          this._smallerVolumeApps.push(app);
          break;

        case SMALLER_VOLUME_FOR_PLAYING_CHANNEL:
          this._playingApps.forEach(function(app) {
            Array.prototype.forEach.call(app.allowedAudioChannels,
              function(channel) {
              this._play(app, 0.2);
            });
            this._smallerVolumeApps.push(app);
          });
          break;

        case PAUSE_THEN_RESUME_PLAYING_CHANNEL:
          this._pause(app, channel);
          this._pausedApps.push(app);
          break;
      }
    },

    /**
     * @TODO bug 1100815
     * Compete new and playing audio channels.
     * @return {String} The competing result.
     */
    _compete: function(newAudioChannel) {},

    _resumeLatestPausedApp: function() {
      var app = this._pausedApps.pop();
      Array.prototype.forEach.call(
        app.pauseedAudioChannels,
        function(channel) {
          this._play(app, channel);
        }
      );
    },

    _play: function(app, audioChannel, volume) {},
    
    _vibrate: function(app) {},
    
    _pause: function(app, channel) {},

    _pauseThenResume: function(app1, app2, audioChannel1, audioChannel2) {},
  });
}());
