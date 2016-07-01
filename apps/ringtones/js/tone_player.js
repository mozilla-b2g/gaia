/* global AudioContext */
'use strict';

/**
 * Create a new TonePlayer that manages the logic for previewing a ringtone or
 * alert tone. There should only be one of these in use at any given time, since
 * this object mucks about with audio channels.
 */
function TonePlayer() {
  this._currentTone = null;
  this._isValid = true; // It's always valid if there's nothing selected.

  // Because of the audio competing policy, after a high priority audio channel
  // paused/stopped, the low priority channel is able to resume in the
  // background, so here we use audio context to occupy the channel until the
  // user leaves the ringtones app, see bug 958470 for details.
  this._player = new Audio();

  this._player.addEventListener('loadedmetadata', function() {
    if (this._player.src) { // Null URLs don't need to be validated here.
      this._isValid = true;
      this._player.dispatchEvent(new CustomEvent(
        'validated', { detail: this._isValid }
      ));
    }
  }.bind(this));
  this._player.addEventListener('error', function() {
    if (this._player.src) { // Null URLs don't need to be validated here.
      this._isValid = false;
      this._player.dispatchEvent(new CustomEvent(
        'validated', { detail: this._isValid }
      ));
    }
  }.bind(this));
  this._player.addEventListener('ended', function() {
    this._firePlayingCallback(false);
  }.bind(this));

  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      this.stop();
      this._setExclusiveMode(false);
    }
  }.bind(this));
}

TonePlayer.prototype = {
  /**
   * Select a tone and start playing a preview of this (this has the happy side
   * effect of ensuring the tone is actually playable before we save it). Note:
   * if this function is called twice with the same tone while the preview is
   * still playing, this will stop the preview. This is nice for really long
   * tones. However, it can be a bit confusing if the tone ends in a bunch of
   * silence, since it stops it, but you'd expect it to replay the tone.
   *
   * @param {Object} tone The tone to select and preview.
   * @param {Function} [callback] The callback to call when the playback status
   *   of the tone changes; takes a boolean value to indicate if the tone is
   *   currently playing.
   */
  setTone: function(tone, callback) {
    if (tone !== this._currentTone) {
      this._firePlayingCallback(false);
      this._currentTone = tone;
      this._playingCallback = callback;
      if (tone && tone.url) {
        this._isValid = undefined;
        this._player.src = tone.url;
        this._player.play();
        this._firePlayingCallback(true);
        this._setExclusiveMode(true);
      } else {
        this._isValid = true;
        this._player.removeAttribute('src');
        this._player.load();
      }
    } else {
      if (!this._isValid) {
        return;
      }
      if (this._player.paused || this._player.ended) {
        this._player.currentTime = 0;
        this._player.play();
        this._firePlayingCallback(true);
        this._setExclusiveMode(true);
      } else {
        this._player.pause();
        this._firePlayingCallback(false);
      }
    }
  },

  /**
   * Stop playing the current tone (if any). If we start playing it again,
   * setTone will reset the current time to 0. Note: even though we're stopping,
   * we don't want to clear the player's src URL, since we might need that to
   * restart playback of the same song.
   */
  stop: function() {
    this._player.pause();
    this._firePlayingCallback(false);
  },

  /**
   * Get the current tone that the TonePlayer is (or was) playing.
   */
  get currentTone() {
    return this._currentTone;
  },

  /**
   * Get the validation status of the currently-selected tone.
   *
   * @param {Function} callback A callback to call when we have the validation
   *   status. Takes one argument, which is a boolean representing whether the
   *   currently-selected tone is valid.
   */
  isValid: function(callback) {
    if (this._isValid !== undefined) {
      callback(this._isValid);
      return;
    }
    this._player.addEventListener('validated', function validated(event) {
      this.removeEventListener('validated', validated);
      callback(event.detail);
    });
  },

  _firePlayingCallback: function(playing) {
    if (this._playingCallback) {
      this._playingCallback(playing);
    }
  },

  /**
   * Creates an AudioContext with "ringer" priority to stop any background audio
   * from playing once we've started previewing ringtones, or destroys the
   * context.
   *
   * @param {Boolean} exclusive true to create the AudioContext, false to
   *   destroy.
   */
  _setExclusiveMode: function(exclusive) {
    if (exclusive) {
      if (!this._source) {
        this._context = new AudioContext('ringer');
        this._source = this._context.createMediaElementSource(this._player);
        this._source.connect(this._context.destination);
      }
    }
  }
};
