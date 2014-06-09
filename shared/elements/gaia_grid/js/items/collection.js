'use strict';
/* global GridItem */
/* global MozActivity */
/*jshint nonew: false */

(function(exports) {

  /**
   * Represents a single collection on the homepage.
   */
  function Collection(collection, entryPoint) {
    this.collection = collection;

    this.detail = {
      type: 'collection',
      name: collection.name,
      id: collection.id,
      categoryId: collection.categoryId,
      query: collection.query,
      icon: collection.icon,
      pinned: collection.pinned
    };
  }

  Collection.prototype = {

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

    /**
     * Returns the icon image path.
     */
    get icon() {
      return this.detail.icon || 'style/images/default_icon.png';
    },

    get identifier() {
      return this.detail.id;
    },

    update: function(detail) {
      this.detail = detail;
      this.detail.type = 'collection';
    },

    /**
     * Collections are always editable.
     */
    isEditable: function() {
      return true;
    },

    /**
     * Collections are always removable.
     */
    isRemovable: function() {
      return true;
    },

    /**
     * Launches the application for this icon.
     */
    launch: function() {
      new MozActivity({
        name: 'view-collection',
        data: this.detail
      });
    },


    /**
     * Opens a web activity to edit the collection.
     */
    edit: function() {
      new MozActivity({
        name: 'update-collection',
        data: this.detail
      });
    },

    /**
     * Uninstalls the application.
     */
    remove: function() {
      new MozActivity({
        name: 'delete-collection',
        data: this.detail
      });
    }
  };

  exports.Collection = Collection;

}(window));
