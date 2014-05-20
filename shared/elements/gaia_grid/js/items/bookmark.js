'use strict';
/* global GridItem */
/* global MozActivity */
/* jshint nonew: false */

(function(exports) {

  const TYPE = 'bookmark';

  /**
   * Represents a single bookmark icon on the homepage.
   */
  function Bookmark(record) {
    this.detail = record;
    this.detail.type = TYPE;
  }

  Bookmark.prototype = {

    __proto__: GridItem.prototype,

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
      return this.detail.icon || 'style/images/default_icon.png';
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
      GridItem.prototype.render.call(this, coordinates, index);
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

      window.open(this.detail.url, '_blank', Object.keys(features)
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

  exports.Bookmark = Bookmark;

}(window));
