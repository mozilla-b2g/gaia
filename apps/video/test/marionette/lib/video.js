/* global module */
'use strict';

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Video(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

/**
 * @const {string}
 */

Video.ORIGIN = 'app://video.gaiamobile.org';

module.exports = Video;

/**
 * @const {Object}
 */
Video.Selector = Object.freeze({
  thumbnail: 'li.thumbnail',
  fullscreenView: '#player-view',
  infoView: '#info-view',
  thumbnailsSingleInfoButton: 'a.button.single-info-button',
  thumbnailsSingleDeleteButton: 'a.button.single-delete-button',
  thumbnailsSingleShareButton: 'a.button.single-share-button',
  player: 'video#player',
  overlay: '#overlay',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailSelectTop: '#thumbnail-select-top',
  thumbnailsShareButton: '#thumbnails-share-button',
  thumbnailsVideoButton: '#thumbnails-video-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button',
  confirmOkButton: '.modal-dialog-confirm-ok'
});

Video.prototype = {
  /**
   * Marionette client to use
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * @return {Marionette.Element} Container for fullscreen view of an video.
   */
  get fullscreenView() {
    return this.client.findElement(Video.Selector.fullscreenView);
  },

  /**
   * @return {Marionette.Element} Container for info view of an video.
   */
  get infoView() {
    return this.client.findElement(Video.Selector.infoView);
  },

  /**
   * @return {Marionette.Element} overlay that displays message load videos
   * to get started.
   */
  get overlay() {
    return this.client.findElement(Video.Selector.overlay);
  },

  /**
   * @return {Marionette.Element} that share videos in selection mode.
   */
  get thumbnailsShare() {
    return this.client.findElement(Video.Selector.thumbnailsShareButton);
  },

  /**
   * @return {Marionette.Element} that opens camera view.
   */
  get thumbnailsVideo() {
    return this.client.findElement(Video.Selector.thumbnailsVideoButton);
  },

  /**
   * @return {Marionette.Element} that opens select view.
   */
  get thumbnailsSelectButton() {
    return this.client.findElement(Video.Selector.thumbnailsSelectButton);
  },

  /**
   * @return {Marionette.Element} that delete videos in selection mode.
   */
  get thumbnailsDelete() {
    return this.client.findElement(Video.Selector.thumbnailsDeleteButton);
  },

  /**
   * @return {Marionette.Element} to view info about the playing current video.
   */
  get thumbnailsSingleInfo() {
    return this.client.findElement(Video.Selector.thumbnailsSingleInfoButton);
  },

  /**
   * @return {Marionette.Element} to delete the playing current video.
   */
  get thumbnailsSingleDelete() {
    return this.client.findElement(Video.Selector.thumbnailsSingleDeleteButton);
  },

  /**
   * @return {Marionette.Element} to share the playing current video.
   */
  get thumbnailsSingleShare() {
    return this.client.findElement(Video.Selector.thumbnailsSingleShareButton);
  },

  /**
   * @return {Marionette.Element} ok button in confirm delete files dialog.
   */
  get confirmOk() {
    // selector specific to the out-of-app confirm dialog
    // found in System App
    return this.client.findElement(Video.Selector.confirmOkButton);
  },

  /**
   * @return {Marionette.Element} First element of all thumbnail images.
   */
  get thumbnail() {
    return this.client.findElement(Video.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} video player element.
   */
  get player() {
    return this.client.findElement(Video.Selector.player);
  },

  /**
   * @return {Marionette.Element} List of elements of thumbnail videos.
   */
  getThumbnails: function() {
   return this.client.findElements(Video.Selector.thumbnail);
  },

  /**
   * Click select button in the video gallery view footer to enter
   * selection mode to share or delete multiple videos.
   */
  enterSelectionMode: function() {
    this.client.helper.waitForElement(Video.Selector.thumbnailsSelectButton)
      .click();
    this.client.helper.waitForElement(Video.Selector.thumbnailSelectTop);
  },

  /**
   * Click first thumbnail in gallery view to play the video
   */
  playVideoFromGalleryView: function() {
    this.client.helper.waitForElement(Video.Selector.thumbnail).click();
  },

  /**
   * Select first element of thumbnail videos
   * list in selection mode.
   */
  selectThumbnail: function() {
    var firstItem = this.client.helper.waitForElement(Video.Selector.thumbnail);
    firstItem.click();
    // Wait for element is shown as selected, otherwise error
    this.client.waitFor(function() {
      var classList = firstItem.getAttribute('class').split(' ');
      return classList.indexOf('selected') > -1;
    });
  },

  /**
   * Start the Video, save the client for future ops, and wait for the
   * Video to finish an initial render.
   */
  launch: function() {
    this.client.apps.launch(Video.ORIGIN);
    this.client.apps.switchToApp(Video.ORIGIN);
    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
  }
};
