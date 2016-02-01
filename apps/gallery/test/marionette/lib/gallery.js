'use strict';
/* jshint node:true */

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Gallery(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = Gallery;

/**
 * @const {string}
 */
Gallery.ORIGIN = 'app://gallery.gaiamobile.org';

/**
 * @const {Object}
 */
Gallery.Selector = Object.freeze({
  thumbnail: '.thumbnail',
  thumbnailImage: '.thumbnailImage',
  thumbnailsView: '#thumbnail-views > footer.thumbnails-list',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button',
  thumbnailsShareButton: '#thumbnails-share-button',
  confirmButton: '#confirm-ok',
  confirmCancelButton: '#confirm-cancel',
  overlayView: '#overlay',
  overlayTitle: '#overlay-title',
  overlayText: '#overlay-text',
  overlayCameraButton: '#overlay-camera-button',
  thumbnailsNumberSelected: '#thumbnails-number-selected'
});

Gallery.prototype = {
  /**
   * Marionette client to use.
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * @return {Marionette.Element} First thumbnail containing element
   */
  get thumbnail() {
    return this.client.helper.waitForElement(Gallery.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} List of thumbnail containing elements
   */
  get thumbnails() {
    return this.client.findElements(Gallery.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} List of thumbnail images
   */
  get thumbnailsImage() {
    return this.client.findElements(Gallery.Selector.thumbnailImage);
  },

  /**
   * @return {Marionette.Element} Container for thumbnails list view.
   */
  get thumbnailsView() {
    return this.client.helper.waitForElement(Gallery.Selector.thumbnailsView);
  },

  /**
   * @return {boolean} thumbnails view display status.
   */
  get thumbnailsViewDisplayed() {
    return this.client.helper.waitForElement(
      Gallery.Selector.thumbnailsView).displayed();
  },  

  /**
   * @return {Marionette.Element} Container for different overlay messages.
   */
  get overlayView() {
    return this.client.helper.waitForElement(Gallery.Selector.overlayView);
  },

  /**
   * @return {Marionette.Element} Container for overlay message title.
   */
  get overlayTitle() {
    return this.client.helper.waitForElement(Gallery.Selector.overlayTitle);
  },
  
  /**
   * @return {Marionette.Element} Container for overlay message content.
   */
  get overlayText() {
    return this.client.helper.waitForElement(Gallery.Selector.overlayText);
  },

  /**
   * @return {Marionette.Element} Container for the camera button 
   *                              when no media is found.
   */
  get cameraButton() {
    return this.client.helper.waitForElement(Gallery.Selector.
      overlayCameraButton);
  },

  /**
   * @return {Marionette.Element} Element to click to select thumbnails.
   */
  get thumbnailsSelectButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.thumbnailsSelectButton);
  },

  /**
   * @return {Marionette.Element} Element to click to delete images.
   */
  get thumbnailsDeleteButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.thumbnailsDeleteButton);
  },

  /**
   * @return {Marionette.Element} Element to click to share multiple images.
   */
  get thumbnailsShareButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.thumbnailsShareButton);
  },

  /**
   * @return {Marionette.Element} Element to click to confirm the delete dialog.
   */
  get confirmButton() {
    return this.client.helper.waitForElement(Gallery.Selector.confirmButton);
  },

  /**
   * @return {Marionette.Element} Element to click to cancel the delete dialog.
   */
  get confirmCancelButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.confirmCancelButton);
  },

  /**
   * @return {Marionette.Element} Element to display number of selected items
   */
  get thumbnailsNumberSelected() {
    return this.client.helper.waitForElement(
      Gallery.Selector.thumbnailsNumberSelected);
  },

  switchToSelectView: function() {
    this.thumbnailsSelectButton.click();
    this.client.waitFor(function() {
      return this.thumbnailsNumberSelected.displayed();
    }.bind(this));
  },

  tapFirstThumbnail: function() {
    this.thumbnail.click();
  },

  tapThumbnail: function(n) {
    this.thumbnails[n].click();
  },

  isThumbnailSelected: function(n) {
    this.client.waitFor(function() {
      return this.thumbnails[n].cssProperty('outline') != null;
    }.bind(this));
  },

  getThumbnailFileName: function(n) {
    return this.thumbnailsImage[n].getAttribute('data-filename');
  },

  /**
   * Start the Gallery, save the client for future ops, and wait for the
   * Gallery to finish an initial render.
   */
  launch: function(nomedia) {
    this.client.apps.launch(Gallery.ORIGIN);
    this.client.apps.switchToApp(Gallery.ORIGIN);
    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
    // Make sure the gallery is done scanning for new content.
    this.client.setSearchTimeout(1000);

    // Check for thumbnail when loaded with images
    if (!nomedia) {
      this.client.helper.waitForElement(Gallery.Selector.thumbnail); 
    }
  }
};
