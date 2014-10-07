'use strict';
/* global GaiaGrid */
/* global configurator */

(function(exports) {

  /**
   * ShelfSource is responsible for populating the initial shelves.
   */
  function ShelfSource(store) {
    this.store = store;
    this.entries = [];
  }

  ShelfSource.prototype = {

    /**
     * Synchronizes our local result set with datastre.
     */
    synchronize: function() {
      console.log('OMFG SYNCHRONIZE CALLED.')
    },

    /**
     * Populates the initial Collection data.
     * @param {Function} success Called after we fetch all initial data.
     */
    populate: function(success) {
      var defaultShelves = configurator.getItems('shelf');

      for (var i in defaultShelves) {
console.log('Make!', JSON.stringify(defaultShelves[i]))
console.log('Make it:', JSON.stringify(new GaiaGrid.Shelf(defaultShelves[i])))
        this.entries.push(new GaiaGrid.Shelf(defaultShelves[i]));
      }
console.log('Made it calling success.', JSON.stringify(this.entries))
      success(this.entries);
    },

    /**
     * Adds a Collection icon to the grid.
     */
    addIconToGrid: function(detail) {
      var shelf = new GaiaGrid.Shelf(detail);
      shelf.setPosition(this.store.getNextPosition());
      this.entries.push(shelf);
    }
  };

  exports.ShelfSource = ShelfSource;

}(window));
