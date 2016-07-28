/* global module */
(function(module) {
  'use strict';

  /**
   * @constructor
   * @param {Marionette.Client} client Marionette client to use.
   */
  function GalleryInfoView(client) {
    this.client = client.scope({
    	searchTimeout: 20000
  	});
  }

  module.exports = GalleryInfoView;

  /**
   * @const {Object}
   */
  GalleryInfoView.Selector = Object.freeze({
    infoView: '#info-view',
    infoName: '#info-name',
    infoSize: '#info-size',
    infoType: '#info-type',
    infoDate: '#info-date',
    infoResolution: '#info-resolution',
    closeButton: '#info-close-button'
  });

  GalleryInfoView.prototype = {  
    
    client: null,

    /**
    * @return {String} Currently displayed media name text.
    */
  	get displayedName() {
      return this.client.findElement(
        GalleryInfoView.Selector.infoName).text();
    },

    /**
    * @return {String} Currently displayed media size.
    */
    get displayedSize() {
      var size = this.client.findElement(
        GalleryInfoView.Selector.infoSize).text();
      return this._trimTextContent(size);
    },

    /**
    * @return {String} Currently displayed media type.
    */
    get displayedType() {
      return this.client.findElement(
        GalleryInfoView.Selector.infoType).text();
    },

    /**
    * @return {String} Currently displayed date (taken).
    */
    get displayedDate() {
      return this.client.findElement(
        GalleryInfoView.Selector.infoDate).text();
    },

    /**
    * @return {String} Currently displayed media resolution.
    */
    get displayedResolution() {
      return this.client.findElement(
        GalleryInfoView.Selector.infoResolution).text();
    },

    /**
    * @return {Marionette.Element} close button.
    */
    get closeBtn() {
      return this.client.findElement(
        GalleryInfoView.Selector.closeButton);
    },

    // strip l10n delimiters
    _trimTextContent: function(text) {
      // for some reason these unicode delimiters are inserted
      // in the text node
      return text.trim().replace(/[\u2068\u2069]/g, '');
    },
    
    /**
    * @return {Boolean} display status of info view.
    */
    waitForInfoViewDisplayed: function() {
      return this.client.helper.waitForElement(
      GalleryInfoView.Selector.infoView).displayed();
    },

    /**
    * Close the info view and waits for the player view
    */
    tapClose: function() {
      this.closeBtn.click();
    }

  };
})(module);
