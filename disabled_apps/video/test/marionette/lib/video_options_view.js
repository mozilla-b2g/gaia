/* global module */
(function(module) {
  'use strict';

  /**
   * @constructor
   * @param {Marionette.Client} client Marionette client to use.
   */
  function VideoOptionsView(client) {
    this.client = client.scope({
    	searchTimeout: 20000
  	});
  }

  module.exports = VideoOptionsView;

  /**
   * @const {Object}
   */
  VideoOptionsView.Selector = Object.freeze({
    optionsView: '#options-view',
    shareButton: '.single-share-button',
    infoButton: '.single-info-button',
    deleteButton: '.single-delete-button',
    cancelButton: '.gaia-menu-cancel'
  });

  VideoOptionsView.prototype = {  
    
    client: null,

    /**
    * @return {Marionette.element} share button object
    */
  	get shareButton() {
      return this.client.findElement(
        VideoOptionsView.Selector.shareButton);
    },

    /**
    *  @return {Marionette.element} more info button object
    */
    get infoButton() {
      return this.client.findElement(
        VideoOptionsView.Selector.infoButton);
    },

    /**
    *  @return {Marionette.element} delete button object
    */
    get deleteButton() {
      return this.client.findElement(
        VideoOptionsView.Selector.deleteButton);
    },

    /**
    *  @return {Marionette.element} cancel button object
    */
    get cancelButton() {
      return this.client.findElement(
        VideoOptionsView.Selector.cancelButton);
    },

    /**
    * @return {boolean} the display status of the options view
    */
    waitForOptionsViewDisplayed: function() {
      return this.client.helper.waitForElement(
      VideoOptionsView.Selector.optionsView).displayed();
    },

    tapShare: function() {
      this.shareButton.click();
    },

    tapMoreInfo: function() {
      this.infoButton.click();
    },

    tapDelete: function() {
      this.deleteButton.click();
    },

    tapCancel: function() {
      this.cancelButton.click();
    }

  };
})(module);
