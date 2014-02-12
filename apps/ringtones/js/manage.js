'use strict';

var toneType = location.hash.substr(1);

// XXX: Later, I'll design a tone picker for the "pick" activity, which should
// make it really easy to use most of the same code for management and picking.
function TonePicker() {
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
   *
   * @param {String} toneType The type of the tone to save ('ringtone' or
   *   'alerttone').
   */
  saveAndQuit: function(toneType) {
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
          setTone(toneType, this._pendingTone, function(error) {
            if (error)
              console.error('Error setting tone:', error);
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

var tonePicker = new TonePicker();

document.getElementById('back').addEventListener('click', function() {
  tonePicker.saveAndQuit(toneType);
});

getCurrentToneId(toneType, function(currentToneId) {
  var defaultTones = document.getElementById('default-tones');
  var customTones = document.getElementById('custom-tones');
  var template = new Template('sound-item-template');

  // Convert a string of HTML to a DOM node.
  function domify(htmlText) {
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;

    return dummyDiv.firstElementChild;
  }

  function addToneToList(list, tone) {
    var item = domify(template.interpolate(tone));
    if (tone.l10nId) {
      navigator.mozL10n.ready(function() {
        navigator.mozL10n.translate(item);
      });
    }

    var input = item.querySelector('input');
    input.checked = (tone.id === currentToneId);
    input.addEventListener('click', function() {
      tonePicker.select(tone);
    });

    list.querySelector('ul').appendChild(item);
    list.hidden = false;
  }

  if (toneType === 'alerttone')
    addToneToList(defaultTones, new NullRingtone());

  window.defaultRingtones.list(
    toneType, addToneToList.bind(null, defaultTones)
  );

  window.customRingtones.list(
    addToneToList.bind(null, customTones)
  );
});

window.addEventListener('localized', function() {
  // Localize the titles text based on the tone type
  var titles = ['title', 'default-title', 'custom-title'];
  titles.forEach(function(title) {
    navigator.mozL10n.localize(
      document.getElementById(title), toneType + '-' + title
    );
  });
});
