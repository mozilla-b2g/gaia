'use strict';
/* global Bookmark */
/* global MozActivity */
/* jshint nonew: false */

(function(exports) {

  const TYPE = 'marketplace-app';

  /**
   * Represents a single bookmark icon on the homepage.
   */
  function MarketPlaceApp(record) {
    this.detail = record;
    this.detail.type = TYPE;
  }

  MarketPlaceApp.prototype = {

    __proto__: Bookmark.prototype,

    launch: function() {
      new MozActivity({
        name: 'marketplace-app',
        data: {
          slug: this.detail.slug
        }
      });
    },
  };

  exports.MarketPlaceApp = MarketPlaceApp;

}(window));
