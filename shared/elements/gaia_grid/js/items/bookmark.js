'use strict';
/* global GaiaGrid */
/* global GridIconRenderer */
/* global MozActivity */
/* jshint nonew: false */

(function(exports) {

  const TYPE = 'bookmark';

  /**
   * Represents a single bookmark icon on the homepage.
   */
  function Bookmark(record, features) {
    this.detail = record;
    this.features = features || {};
    this.detail.type = TYPE;
  }

  Bookmark.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    /**
     * Bookmarks use a custom icon renderer because they are likely much
     * smaller than a standard icon.
     */
    renderer: GridIconRenderer.TYPE.FAVICON,

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return this.grid.layout.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     */
    gridWidth: 1,

    get name() {
      return this.detail.name;
    },

    get icon() {
      return this.detail.icon || this.defaultIcon;
    },

    get identifier() {
      return this.detail.id;
    },

    update: function(record) {
      this.detail = record;
      this.detail.type = TYPE;
      var nameEl = this.element.querySelector('.title');
      if (nameEl) {
        nameEl.textContent = this.name;

        // Bug 1007743 - Workaround for projected content nodes disappearing
        document.body.clientTop;
        this.element.style.display = 'none';
        document.body.clientTop;
        this.element.style.display = '';
      }
    },

    /**
     * Bookmarks are always editable.
     */
    isEditable: function() {
      return true;
    },

    /**
     * Bookmarks are always removable.
     */
    isRemovable: function() {
      return true;
    },

    /**
     * This method overrides the GridItem.render function.
     */
    render: function(coordinates, index) {
      GaiaGrid.GridItem.prototype.render.call(this, coordinates, index);
      this.element.classList.add('bookmark');
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

      var url = this.detail.url;
      if (this.features.search) {
        features.searchName = this.name;
        features.searchUrl = url;
      }

      window.open(url, '_blank', Object.keys(features)
        .map(function eachFeature(key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(features[key]);
      }).join(','));
    },

    /**
     * Opens a web activity to remove the bookmark.
     */
    remove: function() {
      new MozActivity({
        name: 'remove-bookmark',
        data: {
          type: 'url',
          url: this.detail.id
        }
      });
    },

    /**
     * Opens a web activity to edit the bookmark.
     */
    edit: function() {
      new MozActivity({
        name: 'save-bookmark',
        data: {
          type: 'url',
          url: this.detail.id
        }
      });
    }
  };

  exports.GaiaGrid.Bookmark = Bookmark;

}(window));
