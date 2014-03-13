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
  fullscreenBackButton: '#fullscreen-back-button-tiny',
  editButton: '#fullscreen-edit-button-tiny',
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
  fullscreenFrame3: '#frame3',
  frame2Image: '#frame2 > img:first-child'
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
   * @return {Marionette.Element} Container for fullscreen view of an image.
   */
  get fullscreenView() {
    return this.client.helper.waitForElement(Gallery.Selector.fullscreenView);
  },

  /**
   * @return {Marionette.Element} Container for thumbnails list view.
   */
  get thumbnailsView() {
    return this.client.helper.waitForElement(Gallery.Selector.thumbnailsView);
  },

  /**
   * @return {Marionette.Element} Container for different overlay messages.
   */
  get overlayView() {
    return this.client.helper.waitForElement(Gallery.Selector.overlayView);
  },

  /**
   * @return {Marionette.Element} Element to click to get back
   *                              to thumbnail view.
   */
  get fullscreenBackButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.fullscreenBackButton);
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

  /**
   * @return {Marionette.Element} Element to click for image editing mode.
   */
  get editButton() {
    return this.client.helper.waitForElement(Gallery.Selector.editButton);
  },

  /**
   * @return {Marionette.Element} Element to click for effects editing mode.
   */
  get editEffectButton() {
    return this.client.helper.waitForElement(Gallery.Selector.editEffectButton);
  },

  /**
   * @return {Marionette.Element} Element to click for the exposure
   *                              editing mode.
   */
  get editEnhanceButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.editEnhanceButton);
  },

  /**
   * @return {Marionette.Element} Element to click for the exposure editing
   *                              mode.
   */
  get editExposureButton() {
    return this.client.helper.waitForElement(
      Gallery.Selector.editExposureButton);
  },

  /**
   * @return {Marionette.Element} Element to click for crop editing mode.
   */
  get editCropButton() {
    return this.client.helper.waitForElement(Gallery.Selector.editCropButton);
  },

  /**
   * @return {Marionette.Element} Container to host the exposure options' tab.
   */
  get exposureOptions() {
    return this.client.helper.waitForElement(Gallery.Selector.exposureOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the crop options' tab.
   */
  get cropOptions() {
    return this.client.helper.waitForElement(Gallery.Selector.cropOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the effect options' tab.
   */
  get effectOptions() {
    return this.client.helper.waitForElement(Gallery.Selector.effectOptions);
  },

  /**
   * @return {Marionette.Element} Container to host the enhance options' tab.
   */
  get enhanceOptions() {
    return this.client.helper.waitForElement(Gallery.Selector.enhanceOptions);
  },

  /**
   * @return {Marionette.Element} Element to swipe to change exposure settings.
   */
  get exposureSlider() {
    return this.client.helper.waitForElement(Gallery.Selector.exposureSlider);
  },

  /**
   * @return {Marionette.Element} Element to click to save changes from editing.
   */
  get editSaveButton() {
    return this.client.helper.waitForElement(Gallery.Selector.editSaveButton);
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
    return this.client.helper.waitForElement(Gallery.Selector.fullscreenFrame2);
  },

  /**
   * @return {Marionette.Element} Container element to host fullscreen images.
   */
  get fullscreenFrame3() {
    return this.client.helper.waitForElement(Gallery.Selector.fullscreenFrame3);
  },

  /**
   * @return {Marionette.Element} Image element inside frame2.
   */
  get frame2Image() {
    return this.client.helper.waitForElement(Gallery.Selector.frame2Image);
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
  * Check the image style and return true
  * if scale value exist in style
  */
  checkImgScale: function(el, val) {
    return el.getAttribute('style').
      indexOf('scale(' + val + ')') !== -1;
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
    // Make sure the gallery is done scanning for new content.
    this.client.setSearchTimeout(3000);
    this.client.helper.waitForElement(Gallery.Selector.thumbnail);
  }
};
