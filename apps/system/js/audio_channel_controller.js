/* global BaseUI */
'use strict';

(function(exports) {
  var FADE_IN_VOLUME = 1;
  var FADE_OUT_VOLUME = 0.2;
  var VIBRATION_DURATION = 1000;

  /**
   * AudioChannelController controls the audio channel to
   * play or pause.
   */
  var AudioChannelController = function(app, channel) {
    this.app = app;
    this.name = channel.name;
    this._channel = channel;
    this._states = {
      active: false,
      playing: false,
      fadingOut: false,
      vibrating: false
    };
    this._policy = {};
    this._generateID();
    channel.addEventListener('activestatechanged', this);
    app.element.addEventListener('_destroyed', this);
  };

  AudioChannelController.prototype = Object.create(BaseUI.prototype); 

  AudioChannelController.prototype.EVENT_PREFIX = 'audiochannel';

  /**
   * General event handler interface.
   *
   * @param {Event} evt The event to handle.
   */
  AudioChannelController.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'activestatechanged':
        var channel = evt.target;
        // TODO: We should get the `isActive` state from evt.isActive.
        // Then we don't need to do `channel.isActive()` here.
        channel.isActive().onsuccess = (evt) => {
          this._states.active = evt.target.result;
          this.publish('statechanged');
        };
        break;

      case '_destroyed':
        this.publish('destroyed');
        break;
    }
  };  

  /**
   * Set the policy for handling this audio channel.
   *
   * @param {Object} policy Policy to handle this audio channel.
   * @param {Boolean} [policy.isAllowedToPlay] Play or pause it.
   * @param {Boolean} [policy.isNeededToFadeOut] Fade out or not.
   * @param {Boolean} [policy.isNeededToVibrate] Vibrate or not.
   * @param {Boolean} [policy.isNeededToResumeWhenOtherEnds]
   * Resume when other audio channel ends if as true.
   * @return {AudioChannelController}
   */
  AudioChannelController.prototype.setPolicy = function(policy) {
    this._policy = policy || this._policy;
    return this;
  };

  AudioChannelController.prototype.getPolicy = function() {
    return this._policy;
  };

  /**
   * Handle the audio channel with the policy.
   *
   * @return {AudioChannelController}
   */
  AudioChannelController.prototype.proceedPolicy = function() {
    var policy = this._policy;
    if (policy.isAllowedToPlay) {
      this._play();
    } else if (policy.isAllowedToPlay != null) {
      this._pause();
    }
    if (policy.isNeededToFadeOut) {
      this._fadeOut();
    } else if (policy.isNeededToFadeOut != null) {
      this._fadeIn();
    }
    if (policy.isNeededToVibrate) {
      this._vibrate();
    }
    return this;
  };

  /**
   * Get active state.
   *
   * @return {Boolean}
   */
  AudioChannelController.prototype.isActive = function() {
    return this._states.active;
  };

  /**
   * Get state of playing.
   *
   * @return {Boolean}
   */
  AudioChannelController.prototype.isPlaying = function() {
    return this._states.playing;
  };

  /**
   * Get state of fading out.
   *
   * @return {Boolean}
   */
  AudioChannelController.prototype.isFadingOut = function() {
    return this._states.fadingOut;
  };

  /**
   * Get state of vibrating.
   *
   * @return {Boolean}
   */
  AudioChannelController.prototype.isVibrating = function() {
    return this._states.vibrating;
  };

  /**
   * Play the audio channel.
   */
  AudioChannelController.prototype._play = function() {
    this._states.playing = true;
    var promise = new Promise((resolve) => {
      var request = this._channel.setMuted(false);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        throw 'Cannot play the audio channel.';
      };
    });
    promise.then(() => {
      this.app.debug('Play the audio channel.');
    }).catch(e => {
      this.app.debug(e);
    });
  };

  /**
   * Fade in the audio channel.
   */
  AudioChannelController.prototype._fadeIn = function() {
    this._setVolume(FADE_IN_VOLUME);
    this._states.fadingOut = false;
  },

  /**
   * Fade out the audio channel.
   */
  AudioChannelController.prototype._fadeOut = function() {
    this._setVolume(FADE_OUT_VOLUME);
    this._states.fadingOut = true;
    !this._states.playing && this._play();
  },

  /**
   * Pause the audio channel.
   */
  AudioChannelController.prototype._pause = function() {
    this._states.playing = false;
    var promise = new Promise((resolve) => {
      var request = this._channel.setMuted(true);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        throw 'Cannot pause the audio channel.';
      };
    });
    promise.then(() => {
      this.app.debug('Pause the audio channel');
    }).catch(e => {
      this.app.debug(e);
    });
  };

  /**
   * Vibrate for one second
   * and the vibration pattern is [200, 100, 200, 100, ...].
   */
  AudioChannelController.prototype._vibrate = function() {
    var intervalId = setInterval(() => {
      navigator.vibrate(200);
    }, 300);
    this._states.vibrating = true;
    setTimeout(() => {
      clearInterval(intervalId);
      this._states.vibrating = false;
    }, VIBRATION_DURATION);
  };

  /**
   * Change volume of audio channels.
   *
   * @param {Number} volume 0 to 1.
   */
  AudioChannelController.prototype._setVolume = function(volume) {
    var promise = new Promise((resolve) => {
      var request = this._channel.setVolume(volume);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        throw 'Cannot set volume of the audio channel.';
      };
    });
    promise.then(() => {
      this.app.debug('Set volume: ' + volume);
    }).catch(e => {
      this.app.debug(e);
    });   
  };

  /**
   * Generate instance ID.
   */
  AudioChannelController.prototype._generateID = function() {
    this.instanceID = this.app.instanceID + '_' + this.name;
  };

  exports.AudioChannelController = AudioChannelController;
}(window));
