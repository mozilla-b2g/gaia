'use strict';
var Base = require('../base');

/**
 * Abstraction around settings media storage panel
 * @constructor
 * @param {Marionette.Client} client for operations.
 */
function MediaStoragePanel(client) {

  // Call the Base constructor to initiate base class.
  Base.call(this, client, null, MediaStoragePanel.Selectors);

}

function hasNumbers(t) {
  return /\d/.test(t);
}

module.exports = MediaStoragePanel;

MediaStoragePanel.Selectors = {
  'formatSdcardButton':
    '#mediaStorage button[data-l10n-id="format-sdcard-external-0"]',
  'formatSdcardDialog': '#format-sdcard-dialog',
  'mediaLocationSelector':
    '#mediaStorage select[name="device.storage.writable.name"]',
  'musicSpace': 'a[data-l10n-id="music-space"]>span',
  'pictureSpace': 'a[data-l10n-id="pictures-space"]>span',
  'videoSpace': 'a[data-l10n-id="videos-space"]>span',
  'mediaFreeSpace': 'a[data-l10n-id="free-space"]>span',
  'mediaTotalSpace': 'a[data-l10n-id="total-space"]>span'
};

MediaStoragePanel.prototype = {

  __proto__: Base.prototype,

  tapOnFormatSdcardButton: function() {
    this.waitForElement('formatSdcardButton').tap();
  },

  get isFormatSdcardDialogShowed() {
    return this.findElement('formatSdcardDialog')
      .getAttribute('hidden');
  },

  get isMediaLocationSelectorEnabled() {
    return !this.findElement('mediaLocationSelector')
      .getAttribute('disabled');
  },

  get containNumberInMusicSpace() {
    return hasNumbers(this.waitForElement('musicSpace').text());
  },

  get containNumberInPictureSpace() {
    return hasNumbers(this.waitForElement('pictureSpace').text());
  },

  get containNumberInVideoSpace() {
    return hasNumbers(this.waitForElement('videoSpace').text());
  },

  get containNumberInFreeSpace() {
    return hasNumbers(this.waitForElement('mediaFreeSpace').text());
  },

  get containNumberInTotalSpace() {
    return hasNumbers(this.waitForElement('mediaTotalSpace').text());
  }

};
