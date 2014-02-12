'use strict';

/**
 * Get the base path for the tone settings.
 *
 * @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 */
function getSettingsBase(toneType) {
  switch (toneType) {
  case 'ringtone':
    return 'dialer.ringtone';
  case 'alerttone':
    return 'notification.ringtone';
  default:
    throw new Error('tone type not supported');
  }
}

/**
 * Store a tone in the settings.
 *
 * @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 * @param {Object} tone The tone to store.
 * @param {Function} callback A callback to call when storing has finished. If
 *   an error occurs, the first argument will be the error object.
 */
function setTone(toneType, tone, callback) {
  tone.getBlob(function(blob) {
    try {
      var settingsBase = getSettingsBase(toneType);
      var settings = {};
      settings[settingsBase] = blob;
      settings[settingsBase + '.name'] = tone.name;
      settings[settingsBase + '.id'] = tone.id;

      var result = navigator.mozSettings.createLock().set(settings);
      result.onsuccess = function() { callback(); };
      result.onerror = function() { callback(result.error); };
    } catch (e) {
      callback(e);
    }
  });
}

/**
 * Get the ID of the current tone.
 *
 * @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 * @param {Function} callback A callback to call once the ID has been retrieved.
 */
function getCurrentToneId(toneType, callback) {
  var settingKey = getSettingsBase(toneType) + '.id';
  navigator.mozSettings.createLock().get(settingKey).onsuccess = function(e) {
    callback(e.target.result[settingKey]);
  };
}

function NullRingtone() {}

NullRingtone.prototype = {
  get l10nId() {
    return 'none';
  },

  get id() {
    return 'none';
  },

  get name() {
    return navigator.mozL10n.get(this.l10nId);
  },

  get url() {
    return null;
  },

  getBlob: function(callback) {
    callback(null);
  }
};
