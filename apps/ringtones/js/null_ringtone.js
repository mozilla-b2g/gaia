/* global Promise */
/* exported NullRingtone */
'use strict';

/**
 * Create a ringtone with no audio data backing it.
 */
function NullRingtone() {}

NullRingtone.prototype = {
  /**
   * @return {String} A unique ID for the ringtone.
   */
  get id() {
    return 'none:none';
  },

  /**
   * @return {String} The l10n ID of the ringtone.
   */
  get l10nID() {
    return 'ringtone-none';
  },

  /**
   * @return {String} The localized name of the ringtone. Assumes mozL10n has
   *   been initialized.
   */
  get name() {
    return navigator.mozL10n.get(this.l10nID);
  },

  /**
   * @return {String} The filename of the ringtone (null in this case).
   */
  get filename() {
    return null;
  },

  /**
   * @return {String} The URL of the ringtone (null in this case).
   */
  get url() {
    return null;
  },

  /**
   * @return {Boolean} Whether this ringtone is shareable (always false).
   */
  get shareable() {
    return false;
  },

  /**
   * @return {Boolean} Whether this ringtone is deletable (always false).
   */
  get deletable() {
    return false;
  },

  /**
   * Gets a blob for this tone.
   *
   * @return {Promise} A promise returning the audio data (always null, since
   *   this is a null ringtone).
   */
  getBlob: function() {
    return new Promise(function(resolve, reject) {
      resolve(null);
    });
  }
};
