/* global module */
(function(module) {
  'use strict';

  /**
   * @constructor
   * @param {Marionette.Client} client Marionette client to use.
   */
  function Fullscreen_View(client) {
    this.client = client.scope({
    	searchTimeout: 20000
  	});
  }

  module.exports = Fullscreen_View;

  /**
   * @const {Object}
   */
  Fullscreen_View.Selector = Object.freeze({
    currentImage: '#frames .current > .image-view',
    fullscreenView: '#fullscreen-view',
    fullscreenBackButton: '#fullscreen-back-button-tiny',
    editButton: '#fullscreen-edit-button-tiny',
    shareButton: '#fullscreen-share-button-tiny',
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

  Fullscreen_View.prototype = {  
    
    client: null,

    /**
    * @return {Marionette.Element} Currently displayed image element.
    */
  	get displayedImage() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.currentImage);
    },

    /**
    * @return {numeric} Currently displayed image width.
    */
  	get width() {
  		return this.displayedImage.size().width;
  	},

    /**
    * @return {numeric} Currently displayed image height.
    */
    get height() {
    	return this.displayedImage.size().height;
  	},

    /**
    * @return {Marionette.Element} Container for fullscreen view of an image.
    */
    get fullscreenView() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.fullscreenView);
    },

    /**
    * @return {boolean} display status of Fullscreen View.
    */
    get displayed() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.fullscreenView).displayed();
    },

    /**
     * @return {Marionette.Element} Element to click to get back
     *                              to thumbnail view.
     */
    get fullscreenBackButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.fullscreenBackButton);
    },

    /**
     * @return {Marionette.Element} Element to click for image editing mode.
     */
    get editButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editButton);
    },

    /**
     * @return {Marionette.Element} Element to click for effects editing mode.
     */
    get editEffectButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editEffectButton);
    },

    /**
     * @return {Marionette.Element} Element to click for the auto-enhance
     *                              editing mode.
     */
    get editEnhanceButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editEnhanceButton);
    },

    /**
     * @return {Marionette.Element} Element to click for the exposure editing
     *                              mode.
     */
    get editExposureButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editExposureButton);
    },

    /**
     * @return {Marionette.Element} Element to click for crop editing mode.
     */
    get editCropButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editCropButton);
    },

    /**
     * @return {Marionette.Element} Container to host the exposure options.
     */
    get exposureOptions() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.exposureOptions);
    },

    /**
     * @return {Marionette.Element} Container to host the crop options.
     */
    get cropOptions() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.cropOptions);
    },

    /**
     * @return {Marionette.Element} Container to host the effect options.
     */
    get effectOptions() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.effectOptions);
    },

    /**
     * @return {Marionette.Element} Container to host the enhance options.
     */
    get enhanceOptions() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.enhanceOptions);
    },

    /**
     * @return {Marionette.Element} 
     * Element to swipe to change exposure settings.
     */
    get exposureSlider() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.exposureSlider);
    },

    /**
     * @return {Marionette.Element} 
     * Element to click to save changes from editing.
     */
    get editSaveButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editSaveButton);
    },

    /**
     * @return {Marionette.Element} Element to apply edits in edit tool.
     */
    get editToolApplyButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editToolApplyButton);
    },

    /**
     * @return {Marionette.Element} Element to click to crop an image.
     */
    get editCropAspectPortraitButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editCropAspectPortraitButton);
    },

    /**
     * @return {Marionette.Element} Element to click to apply a sepia affect.
     */
    get editEffectSepiaButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editEffectSepiaButton);
    },

    /**
     * @return {Marionette.Element} Container element to host fullscreen images.
     */
    get fullscreenFrame2() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.fullscreenFrame2);
    },

    /**
     * @return {Marionette.Element} Container element to host fullscreen images.
     */
    get fullscreenFrame3() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.fullscreenFrame3);
    },

    /**
     * @return {Marionette.Element} Done Button to finish crop and pick image.
     */
    get cropDoneButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.cropDoneButton);
    },

    /**
     * @return {Marionette.Element} edit crop canvas showing crop overlay.
     */
    get editCropCanvas() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.editCropCanvas);
    },



    /**
     * @return {Marionette.Element} Element to click for sharing image.
     */
    get shareButton() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.shareButton);
    },

      /**
     * @return {Marionette.Element} element to display image opened using
     * gallery app open activity.
     */
    get openActivityImage() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.openImage);
    },

    /**
     * @return {Marionette.Element} header element 
     * showing file name opened using gallery app open activity.
     */
    get openActivityImageTitle() {
      return this.client.helper.waitForElement(
        Fullscreen_View.Selector.openTitle);
    },

    /**
     * @return {Marionette.Element} save button that saves image opened using
     * gallery app open activity.
     */
    get openActivitySaveButton() {
      return this.client.findElement(Fullscreen_View.Selector.openSaveButton);
    },

    /**
    * Check referenced image src
    * is set with the URL provided
    */
    hasSrcImageBlobURL: function(appURL, image) {
      var url = 'blob:' + appURL;
      return image.getAttribute('src').indexOf(url) > -1;
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
      this.waitFor(Fullscreen_View.Selector.editCropButton);
      this.waitFor(Fullscreen_View.Selector.editEffectButton);
      this.waitFor(Fullscreen_View.Selector.editExposureButton);
      this.waitFor(Fullscreen_View.Selector.editEnhanceButton);
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

    performEditHeaderCancelAction: function() {
      this.waitFor(Fullscreen_View.Selector.editHeader).scriptWith(
        function(header) {
          var event = document.createEvent('HTMLEvents');
          event.initEvent('action', true, true);
          header.dispatchEvent(event);
        });
    },

    performEditEnhanceButtonClick: function() {
      this.waitFor(Fullscreen_View.Selector.editEnhanceButton).scriptWith(
        function(button) {
          var event = document.createEvent('HTMLEvents');
          event.initEvent('click', true, true);
          button.dispatchEvent(event);
        });
    },

    applyAutoEnhance: function() {
      this.client.waitFor(function() {
        return this.editEnhanceButton.enabled();
      }.bind(this));
      this.performEditEnhanceButtonClick();
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
    }
  };
})(module);
