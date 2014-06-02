/* global Promise */
'use strict';

/**
 * window.systemTones is responsible for managing the systemwide ringtones and
 * alert tones (i.e. the default ringer and alert). The following methods are
 * provided:
 *
 * getDefault():
 *   Get the factory default tone.
 *
 *   @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 *   @return {Promise} A promise returning the tone's ID.
 *
 * set():
 *   Set a tone as the systemwide tone.
 *
 *   @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
 *   @param {Object} tone The tone to store.
 *   @return {Promise} A promise for setting the tone.
 *
 * isInUse():
 *   Check if a tone is currently in use (either as the default ringer or
 *   default alert tone).
 *
 *   @param {String} tone The tone to check
 *   @return {Promise} A promise returning an array of the tone types that the
 *     tone is in use as.
 *
 * XXX: In the future, it might make sense to add a get() function that returns
 * the currently-selected systemwide tone, but that's not currently necessary.
 * Probably the best way to do this would be to register all the tone providers
 * (builtInRingtones, customRingtones, and NullRingtone) with the scheme in
 * their IDs and just delegate to the correct provider's get() method.
 */
window.systemTones = (function() {

  /**
   * Get the base path for the tone settings.
   *
   * @param {String} toneType The type of the tone ('ringtone' or 'alerttone').
   */
  function _getSettingsBase(toneType) {
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
   * Get the value of a setting.
   *
   * @param {String} settingKey The name of the setting.
   * @return {Promise} A promise returning the setting's value.
   */
  function _getSetting(settingKey) {
    return new Promise(function(resolve, reject) {
      var req = navigator.mozSettings.createLock().get(settingKey);
      req.onsuccess = function() {
        resolve(req.result[settingKey]);
      };
      req.onerror = function() {
        reject(req.error);
      };
    });
  }

  function getDefault(toneType) {
    var settingKey = _getSettingsBase(toneType) + '.default.id';
    return _getSetting(settingKey).then(function(id) {
      // XXX: Eventually, maybe we should allow things other than "built-in"
      // tones to be the factory default (e.g. the null ringtone).
      return window.builtInRingtones.get(toneType, id);
    });
  }

  function set(toneType, tone) {
    var settingsBase = _getSettingsBase(toneType);

    return tone.getBlob().then(function(blob) {
      return new Promise(function(resolve, reject) {
        navigator.mozL10n.once(function() {
          var settings = {};

          var name = tone.l10nID ? {l10nID : tone.l10nID} : tone.name;

          settings[settingsBase] = blob;
          settings[settingsBase + '.name'] = name || '';
          settings[settingsBase + '.id'] = tone.id;

          var req = navigator.mozSettings.createLock().set(settings);
          req.onsuccess = function() { resolve(); };
          req.onerror = function() { reject(req.error); };
        });
      });
    });
  }

  function isInUse(tone) {
    var inUseAs = [];
    var getCurrentID = function(toneType) {
      return _getSetting(_getSettingsBase(toneType) + '.id');
    };

    return getCurrentID('ringtone').then(function(id) {
      if (tone.id === id) {
        inUseAs.push('ringtone');
      }

      return getCurrentID('alerttone').then(function(id) {
        if (tone.id === id) {
          inUseAs.push('alerttone');
        }

        // Finally, we're done! This is the value the user will get eventually.
        return inUseAs;
      });
    });
  }

  return {
    getDefault: getDefault,
    set: set,
    isInUse: isInUse
  };
})();
