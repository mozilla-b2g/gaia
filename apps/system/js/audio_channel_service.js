/* global BaseModule */
/* global Service */
'use strict';

(function() {
  /**
   * AudioChannelService manages audio channels in apps.
   * It could allow or deny a audio channel to play in some specific cases.
   * For example, Music app would like to play when FM app is already playing.
   * It will allow Music app to play, and pause FM app.
   *
   * @class AudioChannelService
   */
  var AudioChannelService = function() {};

  AudioChannelService.EVENTS = [
    'audiochannelstatechanged',
    'audiochanneldestroyed',
    'hierarchytopmostwindowchanged',
    'systemwindowaudiochannelsregistered'
  ];

  AudioChannelService.SUB_MODULES = [
    'AudioChannelPolicy'
  ];

  BaseModule.create(AudioChannelService, {
    name: 'AudioChannelService',
    DEBUG: false,
    // If true, all audio channels of System app are muted.
    _isSystemMuted: false,
    // A map contains playing audio channels.
    _activeAudioChannels: null,
    // An array contains audio channels could be resumed
    // when any other audio channel ends.
    _interruptedAudioChannels: null,
    // The most top app window.
    _topMostWindow: null,

    /**
     * Initial the module.
     */
    _start: function() {
      this._activeAudioChannels = new Map();
      this._interruptedAudioChannels = [];
      this._muteSystemAudioChannels();
      this.debug('Start Audio Channel Manager');
    },

    /**
     * Handle the audio chanel when it is active or in inactive.
     *
     * @param {Event} evt The event to handle.
     */
    _handle_audiochannelstatechanged: function(evt) {
      var audioChannel = evt.detail;
      this.debug('Audio channel state is ' + audioChannel.isActive());
      this._manageAudioChannels(audioChannel);
    },

    /**
     * Remove the window's audio channels from
     * `_activeAudioChannels` and `_interruptedAudioChannels`
     * when the window is terminated.
     *
     * @param {Event} evt The event to handle.
     */
    _handle_audiochanneldestroyed: function(evt) {
      var audioChannel = evt.detail;
      this._activeAudioChannels.delete(audioChannel.instanceID);
      this._deleteAudioChannelFromInterruptedAudioChannels(audioChannel);
      this._resumeAudioChannels();
    },

    /**
     * Handle the audio chanel when the app is in foreground or background.
     */
    _handle_hierarchytopmostwindowchanged: function() {
      if (this._topMostWindow && this._topMostWindow.audioChannels) {
        // Normal channel could not play in background.
        this.debug(this._topMostWindow.name + ' is closed');
        var audioChannel = this._topMostWindow.audioChannels.get('normal');
        if (audioChannel && audioChannel.isPlaying()) {
          audioChannel.setPolicy({ isAllowedToPlay: false });
          this._handleAudioChannel(audioChannel);
        }
      }
      this._topMostWindow = Service.query('getTopMostWindow');
      if (this._topMostWindow) {
        this.debug(this._topMostWindow.name + ' is opened');
        this._resumeAudioChannels(this._topMostWindow);
      }
    },

    /**
     * Mute the System app's audio channels after they are registered.
     */
    _handle_systemwindowaudiochannelsregistered: function() {
      this._muteSystemAudioChannels();
    },

    /**
     * Play or pause the new audio channel and the active audio channels.
     *
     * @param {AudioChannelController} audioChannel The new audio channel.
     */
    _manageAudioChannels: function(audioChannel) {
      if (audioChannel.isActive()) {
        var isBackground = this._isAudioChannelInBackground(audioChannel);
        this.audioChannelPolicy.applyPolicy(
          audioChannel,
          this._activeAudioChannels,
          {
            isNewAudioChannelInBackground: isBackground
          }
        );
        this._activeAudioChannels.forEach((audioChannel) => {
          this._handleAudioChannel(audioChannel);
        });
        this._handleAudioChannel(audioChannel);
        var channel = { channel: audioChannel.name };
        if (!isBackground) {
          this.publish('visibleaudiochannelchanged', channel);
        }
        this.publish('audiochannelchangedasactive', channel);
      } else {
        this._resetAudioChannel(audioChannel);
        this._resumeAudioChannels();
      }
    },

    /**
     * Set the audio channel as default state as muted,
     * and fade in the faded out audio channels.
     *
     * @param {AudioChannelController} audioChannel The audio channel.
     */
    _resetAudioChannel: function(audioChannel) {
      audioChannel.setPolicy({ isAllowedToPlay: false });
      this._handleAudioChannel(audioChannel);
      audioChannel.name === 'notification' &&
        this._fadeInFadedOutAudioChannels();
    },

    /**
     * Handle the audio channel
     * and update `_activeAudioChannels` and `_interruptedAudioChannels`.
     *
     * @param {AudioChannelController} audioChannel The audio channel.
     */
    _handleAudioChannel: function(audioChannel) {
      var policy = audioChannel.proceedPolicy().getPolicy();
      if (policy.isAllowedToPlay) {
        this._activeAudioChannels.set(
          audioChannel.instanceID,
          audioChannel
        );
        this.debug('Playing ' + audioChannel.instanceID);
      } else {
        this._activeAudioChannels.delete(audioChannel.instanceID);
        if (policy.isNeededToResumeWhenOtherEnds) {
          this._interruptedAudioChannels.push(audioChannel);
          this.debug('Interrupted ' + audioChannel.instanceID);
        }
      }
    },

    /**
     * Fade in all faded out audio channels.
     */
    _fadeInFadedOutAudioChannels: function() {
      this._activeAudioChannels.forEach((audioChannel) => {
        audioChannel.isFadingOut() && audioChannel
          .setPolicy({ isNeededToFadeOut: false })
          .proceedPolicy();
      });
    },

    /**
     * Resume interrupted audio channels.
     *
     * @param {AppWindow} [app] The app window in foreground.
     */
    _resumeAudioChannels: function(app) {
      var audioChannel;
      // Resume the app's audio channels.
      app && app.audioChannels.forEach((audioChannel) => {
        audioChannel.isActive() && this._manageAudioChannels(audioChannel);
        if (audioChannel.isPlaying()) {
          this._deleteAudioChannelFromInterruptedAudioChannels(audioChannel);
        }
      });
      // Resume the latest interrupted audio channel.
      var length = this._interruptedAudioChannels.length;
      if (this._activeAudioChannels.size === 0 && length) {
        audioChannel = this._interruptedAudioChannels[length - 1];
        audioChannel.setPolicy({ isAllowedToPlay: true });
        this._handleAudioChannel(audioChannel);
        audioChannel.isPlaying() && this._interruptedAudioChannels.pop();
      }
    },

    /**
     * Delete the audio channel from `_interruptedAudioChannels` array.
     *
     * @param {AudioChannelController} audioChannel
     * The audio channel want to delete.
     */
    _deleteAudioChannelFromInterruptedAudioChannels: function(audioChannel) {
      var index = this._interruptedAudioChannels
        .findIndex(function(interruptedAudioChannel) {
          return interruptedAudioChannel.instanceID ===
            audioChannel.instanceID;
      });
      index !== -1 && this._interruptedAudioChannels.splice(index, 1);
    },

    /**
     * Check the audio channel is in background or not.
     *
     * @param {AudioChannelController} audioChannel The audio channel.
     * @retrun {Boolean}
     */
    _isAudioChannelInBackground: function(audioChannel) {
      var isAudioChannelInBackground = true;
      if (this._topMostWindow &&
          this._topMostWindow.instanceID === audioChannel.app.instanceID) {
        isAudioChannelInBackground = false;
      }
      return isAudioChannelInBackground;
    },

    _muteSystemAudioChannels: function() {
      var audioChannels = this.service.query('SystemWindow.getAudioChannels');
      if (!this._isSystemMuted && audioChannels && audioChannels.size) {
        audioChannels.forEach((audioChannel, name) => {
          this._sendContentEvent({
            type: 'system-audiochannel-mute', name: name, isMuted: true
          });
        });
        this._isSystemMuted = true;
      }
    },

    /**
     * Send MozContentEvent to control the audio chanenl in System app.
     *
     * @param {Object} detail The arguments for passing to Gecko.
     * @param {Object} detail.type The operation for the audio channel.
     */
    _sendContentEvent: function(detail) {
      var evt = new CustomEvent('mozContentEvent', { detail: detail });
      window.dispatchEvent(evt);
    }
  });
}());
