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
  fullscreenView: '#fullscreen-view',
  thumbnailsView: '#thumbnail-views > footer.thumbnails-list',
  thumbnailsSelectButton: '#thumbnails-select-button',
  thumbnailsDeleteButton: '#thumbnails-delete-button',
  fullscreenBackButton: '#fullscreen-back-button-tiny',
  editButton: '#fullscreen-edit-button-tiny',
  shareButton: '#fullscreen-share-button-tiny',
  confirmButton: '#confirm-ok',
  overlayView: '#overlay',
  overlayTitle: '#overlay-title',
  overlayText: '#overlay-text',
  overlayCameraButton: '#overlay-camera-button',
  editView: '#edit-view',
  editExposureButton: '#edit-exposure-button',
  editCropButton: '#edit-crop-button',
  editEffectButton: '#edit-effect-button',
  editEnhanceButton: '#edit-enhance-button',
  exposureOptions: '#exposure-slider',
  cropOptions: '#edit-crop-options',
  effectOptions: '#edit-effect-options',
  exposureSlider: '#sliderthumb',
  editCropAspectPortraitButton: '#edit-crop-aspect-portrait',
  editEffectSepiaButton: '#edit-effect-sepia',
  editSaveButton: '#edit-save-button',
  editToolApplyButton: '#edit-tool-apply-button',
  editHeader: '#edit-view gaia-header',
  fullscreenFrame2: '#frame2',
  fullscreenFrame3: '#frame3',
  cropDoneButton: '#crop-done-button',
  editCropCanvas: '#edit-crop-canvas',
  openTitle: '#filename',
  openImage: '#frame > .image-view',
  openSaveButton: '#save'
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
   * @return {Marionette.Element} Element to click for sharing image.
   */
  get shareButton() {
    return this.client.helper.waitForElement(Gallery.Selector.shareButton);
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
   * @return {Marionette.Element} Element to apply edits in edit tool.
   */
  get editToolApplyButton() {
    return this.client.helper
               .waitForElement(Gallery.Selector.editToolApplyButton);
  },

  /**
   * @return {Marionette.Element} Element to click to crop an image.
   */
  get editCropAspectPortraitButton() {
    return this.client.helper
               .waitForElement(Gallery.Selector.editCropAspectPortraitButton);
  },

  /**
   * @return {Marionette.Element} Element to click to apply a sepia affect.
   */
  get editEffectSepiaButton() {
    return this.client.helper
               .waitForElement(Gallery.Selector.editEffectSepiaButton);
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
   * @return {Marionette.Element} Done Button to finish crop and pick image.
   */
  get cropDoneButton() {
    return this.client.helper.waitForElement(Gallery.Selector.cropDoneButton);
  },

  /**
   * @return {Marionette.Element} edit crop canvas showing crop overlay.
   */
  get editCropCanvas() {
    return this.client.helper.waitForElement(Gallery.Selector.editCropCanvas);
  },

   /**
   * @return {Marionette.Element} element to display image opened using
   * gallery app open activity.
   */
  get openActivityImage() {
    return this.client.helper.waitForElement(Gallery.Selector.openImage);
  },

  /**
   * @return {Marionette.Element} header element showing file name opened using
   * gallery app open activity.
   */
  get openActivityImageTitle() {
    return this.client.helper.waitForElement(Gallery.Selector.openTitle);
  },

  /**
   * @return {Marionette.Element} save button that saves image opened using
   * gallery app open activity.
   */
  get openActivitySaveButton() {
    return this.client.findElement(Gallery.Selector.openSaveButton);
  },

  /**
   * Read the translateX style and return its integer value.
   */
  getFrameTranslation: function(frame) {
    var style = frame.getAttribute('style');
    return parseInt(style.match(/.*:\s.*\((\d*).*/)[1]);
  },

  waitFor: function(selector) {
    return this.client.helper.waitForElement(selector);
  },

  /**
  * Wait for the image editor view to render before continuing with the tests.
  */
  waitForImageEditor: function() {
    this.waitFor(Gallery.Selector.editCropButton);
    this.waitFor(Gallery.Selector.editEffectButton);
    this.waitFor(Gallery.Selector.editExposureButton);
    this.waitFor(Gallery.Selector.editEnhanceButton);
  },

  enterMainEditScreen: function() {
    this.thumbnail.click();
    this.editButton.click();
  },

  tapCancel: function() {
    this.waitFor(Gallery.Selector.editHeader).tap(25, 25);
  },

  getExposureSliderPosition: function() {
    return this.exposureSlider.text();
  },

  applyEditToolOptions: function() {
    this.editToolApplyButton.click();
  },

  saveEditedImage: function() {
    this.editSaveButton.click();
  },

  waitForCropAspectPortraitSelected: function() {
    this.client.waitFor(function() {
      return this.editCropAspectPortraitButton
                        .getAttribute('class').indexOf('selected') > -1;
    }.bind(this));
  },

  waitForSepiaEffectSelected: function() {
    this.client.waitFor(function() {
      return this.editEffectSepiaButton
                        .getAttribute('class').indexOf('selected') > -1;
    }.bind(this));
  },

  waitForAutoEnhanceButtonOn: function() {
    this.client.waitFor(function() {
      return this.editEnhanceButton
                        .getAttribute('class').split(' ').indexOf('on') > -1;
    }.bind(this));
  },

  waitForAutoEnhanceButtonOff: function() {
    this.client.waitFor(function() {
      return this.editEnhanceButton
                        .getAttribute('class').split(' ').indexOf('on') < 0;
    }.bind(this));
  },

  tapFirstThumbnail: function() {
    this.thumbnail.click();
  },

  /**
  * For gallery app open activity, check opened image src
  * is set with URL
  */
  hasSrcImageBlobURL: function() {
    var url = 'blob:' + Gallery.ORIGIN;
    return this.openActivityImage
               .getAttribute('src').indexOf(url) > -1;
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
