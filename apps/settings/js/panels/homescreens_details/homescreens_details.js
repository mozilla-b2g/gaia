/**
 * Handle homescreens panel functionality
 */
define(function(require) {
  'use strict';

  var HomescreensDetails = function() {
    this._elements = {};
    this._manifestURL = '';
  };

  HomescreensDetails.prototype = {
    /**
     * initialization.
     */
    init: function h_init(elements) {
      this._elements = elements;

      this._elements.detailButton.addEventListener('click',
        this._handleChangeHomescreen.bind(this));
    },

    /**
     * update detail contents.
     * @param  {Object} options homescreen's data
     */
    onBeforeShow: function h_onBeforeShow(options) {
      this._manifestURL = options.manifestURL;
      this._elements.detailTitle.textContent = options.name;
      this._elements.detailDescription.textContent = options.description;
    },

    /**
     * Change to target Homescreen
     */
    _handleChangeHomescreen: function h_handleChangeHomescreen(evt) {
      navigator.mozSettings.createLock().set({
        'homescreen.manifestURL': this._manifestURL
      });
    }
  };

  return function ctor_homescreensDetails() {
    return new HomescreensDetails();
  };
});
