'use strict';
/* global GaiaGrid */
/* global GridIconRenderer */
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

    __proto__: GaiaGrid.Bookmark.prototype,

    renderer: GridIconRenderer.TYPE.STANDARD,

    launch: function() {
      new MozActivity({
        name: 'marketplace-app',
        data: {
          slug: this.detail.slug
        }
      });
    },
  };

  exports.GaiaGrid.MarketPlaceApp = MarketPlaceApp;

}(window));
