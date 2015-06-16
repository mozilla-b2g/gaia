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
  thumbnailsView: '#thumbnail-views > footer.thumbnails-list',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button',
  confirmButton: '#confirm-ok',
  overlayView: '#overlay',
  overlayTitle: '#overlay-title',
  overlayText: '#overlay-text',
  overlayCameraButton: '#overlay-camera-button'
});

Gallery.prototype = {
  /**
   * Marionette client to use.
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * @return {Marionette.Element} First element of all thumbnail images.
   */
  get thumbnail() {
    return this.client.helper.waitForElement(Gallery.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} List of elements of thumbnail images.
   */
  get thumbnails() {
    return this.client.findElements(Gallery.Selector.thumbnail);
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
   * @return {Marionette.Element} Element to click to confirm the delete dialog.
   */
  get confirmButton() {
    return this.client.helper.waitForElement(Gallery.Selector.confirmButton);
  }, 

  tapFirstThumbnail: function() {
    this.thumbnail.click();
  },

  tapThumbnail: function(n) {
    this.thumbnails[n].click();
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
