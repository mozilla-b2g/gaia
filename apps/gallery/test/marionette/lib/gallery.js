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
  fullscreenView: '#fullscreen-view',
  thumbnailsView: '#thumbnail-list-view',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button',
  fullscreenBackButton: '#fullscreen-back-button',
  editButton: '#fullscreen-edit-button',
  confirmButton: '#confirm-ok',
  overlayView: '#overlay',
  editView: '#edit-view',
  editExposureButton: '#edit-exposure-button',
  editCropButton: '#edit-crop-button',
  editEffectButton: '#edit-effect-button',
  editEnhanceButton: '#edit-enhance-button',
  exposureOptions: '#exposure-slider',
  cropOptions: '#edit-crop-options',
  effectOptions: '#edit-effect-options',
  enhanceOptions: '#edit-enhance-options',
  exposureSlider: '#sliderthumb',
  editCropAspectPortraitButton: '#edit-crop-aspect-portrait',
  editEffectSepiaButton: '#edit-effect-sepia',
  editSaveButton: '#edit-save-button',
  fullscreenFrame2: '#frame2',
  fullscreenFrame3: '#frame3'
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
    return this.client.findElement(Gallery.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} List of elements of thumbnail images.
   */
  get thumbnails() {
    return this.client.findElements(Gallery.Selector.thumbnail);
  },

  /**
   * @return {Marionette.Element} Container for fullscreen view of an image.
   */
  get fullscreenView() {
    return this.client.findElement(Gallery.Selector.fullscreenView);
  },

  /**
   * @return {Marionette.Element} Container for thumbnails list view.
   */
  get thumbnailsView() {
    return this.client.findElement(Gallery.Selector.thumbnailsView);
  },

  /**
   * @return {Marionette.Element} Container for different overlay messages.
   */
  get overlayView() {
    return this.client.findElement(Gallery.Selector.overlayView);
  },

  /**
   * @return {Marionette.Element} Element to click to get back to thumbnail view
   */
  get fullscreenBackButton() {
    return this.client.findElement(Gallery.Selector.fullscreenBackButton);
  },

  /**
   * @return {Marionette.Element} Element to click to select thumbnails.
   */
  get thumbnailsSelectButton() {
    return this.client.findElement(Gallery.Selector.thumbnailsSelectButton);
  },

  /**
   * @return {Marionette.Element} Element to click to delete images.
   */
  get thumbnailsDeleteButton() {
    return this.client.findElement(Gallery.Selector.thumbnailsDeleteButton);
  },

  /**
   * @return {Marionette.Element} Element to click to confirm the delete dialog.
   */
  get confirmButton() {
    return this.client.findElement(Gallery.Selector.confirmButton);
  },

  /**
   * @return {Marionette.Element} Element to click for image editing mode.
   */
  get editButton() {
    return this.client.findElement(Gallery.Selector.editButton);
  },

  /**
   * @return {Marionette.Element} Element to click for effects editing mode.
   */
  get editEffectButton() {
    return this.client.findElement(Gallery.Selector.editEffectButton);
  },

  /**
   * @return {Marionette.Element} Element to click for enhance editing mode.
   */
  get editEnhanceButton() {
    return this.client.findElement(Gallery.Selector.editEnhanceButton);
  },

  /**
   * @return {Marionette.Element} Element to click for the exposure editing mode
   */
  get editExposureButton() {
    return this.client.findElement(Gallery.Selector.editExposureButton);
  },

  /**
   * @return {Marionette.Element} Element to click for crop editing mode.
   */
  get editCropButton() {
    return this.client.findElement(Gallery.Selector.editCropButton);
  },

  /**
   * @return {Marionette.Element} Container to host the exposure options' tab.
   */
  get exposureOptions() {
    return this.client.findElement(Gallery.Selector.exposureOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the crop options' tab.
   */
  get cropOptions() {
    return this.client.findElement(Gallery.Selector.cropOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the effect options' tab.
   */
  get effectOptions() {
    return this.client.findElement(Gallery.Selector.effectOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the enhance options' tab.
   */
  get enhanceOptions() {
    return this.client.findElement(Gallery.Selector.enhanceOptions);
  },

  /**
   * @return {Marionette.Element} Element to swipe to change exposure settings.
   */
  get exposureSlider() {
    return this.client.findElement(Gallery.Selector.exposureSlider);
  },

  /**
   * @return {Marionette.Element} Element to click to save changes from editing.
   */
  get editSaveButton() {
    return this.client.findElement(Gallery.Selector.editSaveButton);
  },

  /**
   * @return {Marionette.Element} Element to click to crop an image.
   */
  get editCropAspectPortraitButton() {
    return this.client
               .findElement(Gallery.Selector.editCropAspectPortraitButton);
  },

  /**
   * @return {Marionette.Element} Element to click to apply a sepia affect.
   */
  get editEffectSepiaButton() {
    return this.client.findElement(Gallery.Selector.editEffectSepiaButton);
  },

  /**
   * @return {Marionette.Element} Container element to host fullscreen images.
   */
  get fullscreenFrame2() {
    return this.client.findElement(Gallery.Selector.fullscreenFrame2);
  },

  /**
   * @return {Marionette.Element} Container element to host fullscreen images.
   */
  get fullscreenFrame3() {
    return this.client.findElement(Gallery.Selector.fullscreenFrame3);
  },

  /**
   * @return {boolean} Whether or not the thumbnail view is in list mode.
   */
  isThumbnailListViewVisible: function() {
    var elementClass = this.client
      .findElement('#thumbnails')
      .getAttribute('class');
    return elementClass == 'list';
  },

  /**
   * Read the translateX style and return its integer value.
   */
  getFrameTranslation: function(frame) {
    var style = frame.getAttribute('style');
    return parseInt(style.match(/.*:\s.*\((\d*).*/)[1]);
  },

  /**
  * Wait for the image editor view to render before continuing with the tests.
  */
  waitForImageEditor: function() {
    this.client.helper.waitForElement(Gallery.Selector.editCropButton);
    this.client.helper.waitForElement(Gallery.Selector.editEffectButton);
    this.client.helper.waitForElement(Gallery.Selector.editExposureButton);
  },

  /**
   * Start the Gallery, save the client for future ops, and wait for the
   * Gallery to finish an initial render.
   */
  launch: function() {

    this.client.apps.launch(Gallery.ORIGIN);
    this.client.apps.switchToApp(Gallery.ORIGIN);
    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
    // Make sure the gallery is done scanning for new content. Unfortunately
    // takes a while. (metadata parsing, thumbnail creation, saving to DB, etc)
    this.client.setSearchTimeout(300000);
    this.client.helper.waitForElement(Gallery.Selector.thumbnail);
  }
};
