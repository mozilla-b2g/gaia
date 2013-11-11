define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var proto = Sounds.prototype;

/**
 * Exports
 */

module.exports = Sounds;

/**
 * Initialize a new `Sounds` interface.
 *
 * @constructor
 */
function Sounds(list) {
  this.items = {};
  (list || []).forEach(this.add, this);
}

/**
 * Add a new sound.
 *
 * Checks if this sound
 * is enabled, and sets
 * up an observer.
 *
 * @param {Object} data
 *
 */
proto.add = function(data) {
  var self = this;
  var sound = {
    name: data.name,
    url: data.url,
    setting: data.setting,
    enabled: false
  };

  // Prefetch audio
  sound.audio = this.createAudio(sound.url);

  this.items[data.name] = sound;
  this.isEnabled(sound, function(value) {
    self.setEnabled(sound, value);
    self.observeSetting(sound);
  });
};

/**
 * Check if a sound is
 * enabled inside mozSettings.
 *
 * @param  {Object}   sound
 * @param  {Function} done
 *
 */
proto.isEnabled = function(sound, done) {
  var mozSettings = navigator.mozSettings;
  var key = sound.setting;

  // Requires navigator.mozSettings
  if (!mozSettings) {
    return;
  }

  mozSettings
    .createLock()
    .get(key)
    .onsuccess = onSuccess;

  function onSuccess(e) {
    var result = e.target.result[key];
    done(result);
  }
};

/**
 * Observe mozSettings for changes
 * on the given settings key.
 *
 * @param  {Object} sound
 *
 */
proto.observeSetting = function(sound) {
  var mozSettings = navigator.mozSettings;
  var key = sound.setting;
  var self = this;
  if (mozSettings) {
    mozSettings.addObserver(key, function(e) {
      self.setEnabled(sound, e.settingValue);
    });
  }
};

/**
 * Set a sounds `enabled` key.
 * @param {Object} sound
 * @param {Boolean} value
 *
 */
proto.setEnabled = function(sound, value) {
  sound.enabled = value;
};

/**
 * Play a sound by name.
 *
 * @param  {String} name
 *
 */
proto.play = function(name) {
  this.playSound(this.items[name]);
};

/**
 * Play a sound.
 *
 * @param  {Object} sound
 *
 */
proto.playSound = function(sound) {
  if (sound.enabled) {
    sound.audio.play();
  }
};

/**
 * Create an audio element.
 *
 * @param  {String} url
 * @return {HTMLAudioElement}
 *
 */
proto.createAudio = function(url) {
  var audio = new Audio(url);
  audio.mozAudioChannelType = 'notification';
  return audio;
};

});
