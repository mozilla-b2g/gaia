/* global BaseModule */
'use strict';

(function() {
  // The results of audo channel competition.
  var PLAY = true;
  var PAUSE = false;
  /**
   * It is the table to get the result of
   * the competition of audio channels.
   *
   * Get the result of the competition
   * of normal and content audio channels with
   * `AUDIO_CHANNEL_COMPETITION_RESULTS.normal.content`.
   */
  var AUDIO_CHANNEL_COMPETITION_RESULTS = {
    normal: {
      normal: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      content: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    content: {
      normal: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      content: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      notification:  { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification:  { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    alarm: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    system: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    ringer: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PAUSE, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    telephony: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PLAY, newAudioChannel: PAUSE },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PLAY, newAudioChannel: PAUSE },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PAUSE },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    notification: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    },
    publicNotification: {
      normal: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      content: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      alarm: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      system: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      ringer: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      telephony: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      notification: { activeAudioChannel: PLAY, newAudioChannel: PLAY },
      publicNotification: { activeAudioChannel: PLAY, newAudioChannel: PLAY }
    }
  };

  /**
   * AudioChannelPolicy provides policies to handle audio channels.
   */
  var AudioChannelPolicy = function() {};

  AudioChannelPolicy.SETTINGS = [
    'vibration.enabled'
  ];

  BaseModule.create(AudioChannelPolicy, {
    name: 'AudioChannelPolicy',
    DEBUG: false,
    // The value of the vibration.enabled settings.
    _isVibrateEnabled: true,

    /**
     * Get the policies of 
     * handling the new audio channel and active audio channels.
     *
     * @param {AudioChannelController} newAudioChannel
     * A new audio channel you want to handle.
     * @param {Map} activeAudioChannels
     * Active audio channels playing noew.
     * @param {Object} [options] Options.
     * @param {Boolean} [options.isNewAudioChannelInBackground]
     * Is the new audio channel in background.
     */
    applyPolicy: function(newAudioChannel, activeAudioChannels, options) {
      var newAudioChannelName = newAudioChannel.name;
      // Deconflict the conflicted policies for the new audio channel.
      // For example, we have a new audio channel `alarm` and
      // two active audio channels `system` and `telephony`.
      // `AUDIO_CHANNEL_COMPETITION_RESULTS.system.alarm` is `true`,
      // but `AUDIO_CHANNEL_COMPETITION_RESULTS.telephony.alarm`
      // is `false`.
      // And we get conflict policies for the `alarm` audio channel.
      // Once we get conflcts, we will take higher priority policy.
      // `PAUSE` is higher than `PLAY`,
      // and doing fade out is higher than not doing fade out.
      var isAllowedToPlayForNewAudioChannel = [true];
      var isNeededToFadeOutForNewAudioChannel = [false];
      // The new audio channel will be allowed to play,
      // if any other audio channel belonged to its app is already playing.
      var isNewAudioChannelsAppPlaying = false;
      activeAudioChannels.forEach((audioChannel) => {
        if (audioChannel.app.instanceID === newAudioChannel.app.instanceID) {
          isNewAudioChannelsAppPlaying = true;
        }
      });
      !isNewAudioChannelsAppPlaying &&
        activeAudioChannels.forEach((audioChannel) => {
        var activeAudioChannelName = audioChannel.name;
        var results = AUDIO_CHANNEL_COMPETITION_RESULTS
          [activeAudioChannelName][newAudioChannelName];
        var policy = {
          isAllowedToPlay: results.activeAudioChannel
        };
        if (results.activeAudioChannel) {
          policy.isNeededToFadeOut =
            this._isNeededToFadeOutForActiveAudioChannel(
              activeAudioChannelName, newAudioChannelName
            );
        }
        if (!results.activeAudioChannel) {
          policy.isNeededToVibrate = this._isVibrateEnabled &&
          this._isNeededToVibrateForActiveAudioChannel(
            activeAudioChannelName, newAudioChannelName
          );
          policy.isNeededToResumeWhenOtherEnds =
            this._isNeededToResumeWhenOtherEndsForActiveAudioChannel(
              activeAudioChannelName, newAudioChannelName
            );
        }
        audioChannel.setPolicy(policy);
        this.debug('Policy for ' + audioChannel.instanceID +
          ': ' + JSON.stringify(policy));
        isAllowedToPlayForNewAudioChannel.push(results.newAudioChannel);
        results.newAudioChannel && isNeededToFadeOutForNewAudioChannel.push(
          this._isNeededToFadeOutForNewAudioChannel
            (activeAudioChannelName, newAudioChannelName)
        );
      });
      // Normal channel could not play in background.
      if (newAudioChannelName === 'normal' &&
          options && options.isNewAudioChannelInBackground) {
        isAllowedToPlayForNewAudioChannel.push(false);
      }
      // Deconflict the policies.
      isAllowedToPlayForNewAudioChannel =
        isAllowedToPlayForNewAudioChannel.every(isAllowed => isAllowed);
      isNeededToFadeOutForNewAudioChannel =
        isNeededToFadeOutForNewAudioChannel.some(isNeeded => isNeeded);
      var policy = {
        isAllowedToPlay: isAllowedToPlayForNewAudioChannel
      };
      if (isAllowedToPlayForNewAudioChannel) {
        policy.isNeededToFadeOut = isNeededToFadeOutForNewAudioChannel;
      }
      if (!isAllowedToPlayForNewAudioChannel) {
        policy.isNeededToVibrate = this._isVibrateEnabled &&
          !isAllowedToPlayForNewAudioChannel &&
          // Don't vibrate for background normal audio channel.
          newAudioChannelName !== 'normal';
      }
      newAudioChannel.setPolicy(policy);
      this.debug('Policy for ' + newAudioChannel.instanceID +
        ': ' + JSON.stringify(policy));
    },

    /**
     * Observer the value of vibration.enabled settings.
     *
     * @param {Boolean} value The value of the settings.
     */
    '_observe_vibration.enabled': function(value) {
      this._isVibrateEnabled = value;
    },

    /**
     * Get the policy of fading out the new audio channel.
     *
     * @param {String} activeChannelName The active audio channel name.
     * @param {String} newChannelName The new audio channel name.
     * @return {Boolean}
     */
    _isNeededToFadeOutForNewAudioChannel:
      function(activeChannelName, newChannelName) {
      var isNeeded = false;
      if ((activeChannelName === 'notification' ||
           activeChannelName === 'publicNotification') &&
          (newChannelName === 'normal' ||
           newChannelName === 'content')
         )
      {
        isNeeded = true;
      }
      return isNeeded;
    },

    /**
     * Get the policy of fading out the active audio channel.
     *
     * @param {String} activeChannelName The active audio channel name.
     * @param {String} newChannelName The new audio channel name.
     * @return {Boolean}
     */
    _isNeededToFadeOutForActiveAudioChannel:
      function(activeChannelName, newChannelName) {
      var isNeeded = false;
      if (((activeChannelName === 'normal' ||
            activeChannelName === 'content') &&
              (newChannelName === 'notification' ||
               newChannelName === 'publicNotification')
          ) ||
          (activeChannelName === 'alarm' &&
             (newChannelName === 'ringer' ||
              newChannelName === 'telephony')
          )
         )
      {
        isNeeded = true;
      }
      return isNeeded;
    },

    /**
     * Get the policy of vibrating for the active audio channel.
     *
     * @param {String} activeChannelName The active audio channel name.
     * @param {String} newChannelName The new audio channel name.
     * @return {Boolean}
     */
    _isNeededToVibrateForActiveAudioChannel:
      function(activeChannelName, newChannelName) {
      return activeChannelName === 'ringer' && newChannelName === 'ringer';
    },

    /**
     * Get the policy of resuming the active audio channel
     * when any other audio channel ends.
     *
     * @param {String} activeChannelName The active audio channel name.
     * @param {String} newChannelName The new audio channel name.
     * @return {Boolean}
     */
    _isNeededToResumeWhenOtherEndsForActiveAudioChannel:
      function(activeChannelName, newChannelName) {
      var isNeeded = true;
      if (activeChannelName === 'normal' ||
          (activeChannelName === 'content' && newChannelName === 'normal') ||
          (activeChannelName === 'alarm' && newChannelName === 'alarm') ||
          (activeChannelName === 'ringer' && newChannelName === 'ringer')) {
        isNeeded = false;
      }
      return isNeeded;
    }
  });
}());
