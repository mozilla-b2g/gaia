'use strict';

/**
 * Create a new TonePicker that manages the logic for selecting a new ringtone
 * or alert tone.
 *
 * @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 * @param {Boolean} allowNone True if a null ringtone can be selected; false
 *   otherwise.
 */
function TonePicker(toneType, allowNone) {
  this.toneType = toneType;
  this.allowNone = allowNone;
  this._player = new Audio();
  this._pendingTone = null;
  this._isValid = true; // It's always valid if we're not changing the tone.

  var self = this;
  this._player.oncanplay = function() {
    if (this.src) { // Null URLs don't need to be validated here.
      self._isValid = true;
      this.dispatchEvent(new CustomEvent(
        'validated', { detail: self._isValid }
      ));
    }
  };
  this._player.onerror = function() {
    if (this.src) { // Null URLs don't need to be validated here.
      self._isValid = false;
      this.dispatchEvent(new CustomEvent(
        'validated', { detail: self._isValid }
      ));
    }
  };
}

TonePicker.prototype = {
  /**
   * Select a tone and start playing a preview of this (this has the happy side
   * effect of ensuring the tone is actually playable before we save it). Note:
   * if this function is called twice with the same tone while the preview is
   * still playing, this will stop the preview. This is nice for really long
   * tones. However, it can be a bit confusing if the tone ends in a bunch of
   * silence, since it stops it, but you'd expect it to replay the tone.
   *
   * @param {Object} tone The tone to select and preview.
   */
  select: function(tone) {
    if (tone !== this._pendingTone) {
      this._pendingTone = tone;
      if (tone && tone.url) {
        this._isValid = undefined;
        this._player.src = tone.url;
        this._player.play();
      } else {
        this._isValid = true;
        this._player.removeAttribute('src');
        this._player.load();
      }
    } else {
      if (this._player.paused || this._player.ended) {
        this._player.currentTime = 0;
        this._player.play();
      } else {
        this._player.pause();
      }
    }
  },

  /**
   * Get the validation status of the currently-selected tone.
   *
   * @param {Function} callback A callback to call when we have the validation
   *   status. Takes one argument, which is a boolean representing whether the
   *   currently-selected tone is valid.
   */
  _checkValidation: function(callback) {
    if (this._isValid !== undefined) {
      callback(this._isValid);
      return;
    }
    this._player.addEventListener('validated', function validated(event) {
      this.removeEventListener('validated', validated);
      callback(event.detail);
    });
  },

  /**
   * Save the currently-selected tone and quit. If there is no currently-
   * selected tone, don't bother saving anything, and just quit.
   */
  saveAndQuit: function() {
    // XXX: Currently, if a tone isn't valid, we just do nothing when saving.
    // This should normally be ok, since tones are validated when we store them.
    // In the future, we could throw up an alert, though.
    this._checkValidation(function(valid) {
      // Until Haida lands this is how users could go back to Settings app.
      var activity = new MozActivity({
        name: 'configure',
        data: {
          target: 'device'
        }
      });

      // Close the window when all remaining tasks are done.
      var remainingTasks = 1;
      function done() {
        if (--remainingTasks === 0) {
          window.close();
        }
      }

      // Close ourselves after the activity transition is completed.
      setTimeout(done, 1000);

      // If we have a tone that needs to be saved, save it too (and keep the
      // window around until saving is finished.
      if (this._pendingTone) {
        if (valid) {
          remainingTasks = 2;
          setTone(this.toneType, this._pendingTone, function(error) {
            if (error) {
              console.error('Error setting tone:', error);
            }
            done();
          });
        } else {
          console.error('Tried to save an invalid tone:',
                        this._pendingTone.id);
        }
      }
    }.bind(this));
  }
};

/**
 * Create a new ActivityTonePicker that manages the logic for selecting a new
 * ringtone or alert tone as an activity.
 *
 * @param {Object} activity The activity context.
 */
function ActivityTonePicker(activity) {
  var toneType = activity.source.data.type;
  var allowNone = activity.source.data.allowNone;

  // Handle the case where toneType is an array. Note that we can't display
  // both types of tones at once. But a client might ask for a ringtone or
  // 'audio/mpeg' and we have to handle that.
  if (Array.isArray(toneType)) {
    if (toneType.indexOf('ringtone') !== -1) {
      toneType = 'ringtone';
    } else if (toneType.indexOf('alerttone') !== -1) {
      toneType = 'alerttone';
    }
  }

  TonePicker.call(this, toneType, allowNone);
  this._activity = activity;
}
ActivityTonePicker.prototype = Object.create(TonePicker.prototype);
ActivityTonePicker.prototype.constructor = ActivityTonePicker;

/**
 * Send the currently-selected tone back to the caller and quit. If there is no
 * currently-selected tone, treat this as the user having canceled.
 */
ActivityTonePicker.prototype.saveAndQuit = function() {
  this._checkValidation(function(valid) {
    if (this._pendingTone) {
      if (valid) {
        // Return the tone's name and blob to the caller.
        this._pendingTone.getBlob(function(blob) {
          this._activity.postResult({
            name: this._pendingTone.name,
            blob: blob
          });
        }.bind(this));
      } else {
        // The tone couldn't be played. Just act like the user canceled.
        this._activity.postError('cancelled');
      }
    } else {
      // The user never selected a tone, so just cancel.
      this._activity.postError('cancelled');
    }
  }.bind(this));
};
