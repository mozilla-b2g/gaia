'use strict';
/* global GridItem */

(function(exports) {

  /**
   * Represents a single bookmark icon on the homepage.
   */
  function Bookmark(record) {
    this.detail = record;
    this.detail.type = 'bookmark';
  }

  Bookmark.prototype = {

    __proto__: GridItem.prototype,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return app.zoom.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    get name() {
      return this.detail.name;
    },

    get icon() {
      return this.detail.icon;
    },

    get identifier() {
      return this.detail.url;
    },

    /**
     * Launches the bookmark in a browser window.
     */
    launch: function() {
      var features = {
        name: this.name,
        icon: this.icon,
        remote: true,
        useAsyncPanZoom: true
      };

      window.open(this.detail.url, '_blank', Object.keys(features)
        .map(function eachFeature(key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(features[key]);
      }).join(','));
    }
  };

  exports.Bookmark = Bookmark;

}(window));
