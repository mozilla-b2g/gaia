/* global module */
(function(module) {
  'use strict';

  /**
   * @constructor
   * @param {Marionette.Client} client Marionette client to use.
   */
  function VideoInfoView(client) {
    this.client = client.scope({
    	searchTimeout: 20000
  	});
  }

  module.exports = VideoInfoView;

  /**
   * @const {Object}
   */
  VideoInfoView.Selector = Object.freeze({
    infoView: '#info-view',
    infoName: '#info-name',
    infoLength: '#info-length',
    infoSize: '#info-size',
    infoType: '#info-type',
    infoDate: '#info-date',
    infoResolution: '#info-resolution',
    closeButton: '#info-close-button'
  });

  VideoInfoView.prototype = {  
    
    client: null,

    /**
    * @return {String} Currently displayed video name text.
    */
  	get displayedName() {
      return this.client.findElement(
        VideoInfoView.Selector.infoName).text();
    },

    /**
    * @return {String} Currently displayed video length.
    */
    get displayedLength() {
      return this.client.findElement(
        VideoInfoView.Selector.infoLength).text();
    },

    /**
    * @return {String} Currently displayed video size.
    */
    get displayedSize() {
      var size = this.client.findElement(
        VideoInfoView.Selector.infoSize).text();
      return this._trimTextContent(size);
    },

    /**
    * @return {String} Currently displayed video type.
    */
    get displayedType() {
      return this.client.findElement(
        VideoInfoView.Selector.infoType).text();
    },

    /**
    * @return {String} Currently displayed date (taken) for video.
    */
    get displayedDate() {
      return this.client.findElement(
        VideoInfoView.Selector.infoDate).text();
    },

    /**
    * @return {String} Currently displayed video resolution.
    */
    get displayedResolution() {
      return this.client.findElement(
        VideoInfoView.Selector.infoResolution).text();
    },

    /**
    * @return {Marionette.Element} close button.
    */
    get closeBtn() {
      return this.client.findElement(
        VideoInfoView.Selector.closeButton);
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
      VideoInfoView.Selector.infoView).displayed();
    },

    /**
    * Close the info view and waits for the player view
    */
    tapClose: function() {
      this.closeBtn.click();
    }

  };
})(module);
