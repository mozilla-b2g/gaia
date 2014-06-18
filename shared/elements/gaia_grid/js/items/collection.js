'use strict';
/* global GaiaGrid */
/* global GridIconRenderer */
/* global MozActivity */
/*jshint nonew: false */

(function(exports) {
  const l10nKey = 'collection-categoryId-';

  var _ = navigator.mozL10n.get;

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
      cName: collection.cName,
      query: collection.query,
      icon: collection.icon,
      pinned: collection.pinned,
      defaultIconBlob: collection.defaultIconBlob
    };

    // XXX: One listener per collection may not be ideal.
    window.addEventListener('localized', this.onLocalize.bind(this));
  }

  Collection.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    renderer: GridIconRenderer.TYPE.CLIP,

    /**
    Bug 1026236 l10n does not automatically handle these for us so
    we handle locale updates ourselves.
    */
    onLocalize: function() {
      if (!this.element) {
        return;
      }
      var nameEl = this.element.querySelector('.title');
      nameEl.textContent = this.name;
    },

    /**
     * Returns the height in pixels of each icon.
     */
    get pixelHeight() {
      return this.grid.layout.gridItemHeight;
    },

    /**
     * Width in grid units for each icon.
     * nameEl.textContent = this.name;
     */
    gridWidth: 1,

    get name() {
      // first attempt to use the localized name
      return _(l10nKey + this.detail.categoryId) || this.detail.name;
    },

    /**
     * Returns the icon image path.
     */
    get icon() {
      return this.detail.icon || this.defaultIcon;
    },

    get identifier() {
      return this.detail.id;
    },

    update: GaiaGrid.GridItem.prototype.updateFromDatastore,

    render: function(coordinates, index) {
      // Add 'collection' to the class list when the element gets created
      var setClassName = !this.element;
      GaiaGrid.GridItem.prototype.render.call(this, coordinates, index);
      if (setClassName) {
        this.element.classList.add('collection');
      }
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

  exports.GaiaGrid.Collection = Collection;

}(window));
