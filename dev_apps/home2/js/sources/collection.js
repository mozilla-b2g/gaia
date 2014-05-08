'use strict';
/* global Collection */
/* global CollectionsDatabase */
/* global Divider */

(function(exports) {

  var eventTypesToListenFor = ['added', 'updated', 'removed'];

  /**
   * CollectionSource is responsible for populating the initial Collection
   * results as well as keeping the grid in sync with the collection datastore.
   * @param {Object} store The backing database store class.
   */
  function CollectionSource(store) {
    this.store = store;
    this.entries = [];

    eventTypesToListenFor.forEach(function iterateTypes(type) {
      CollectionsDatabase.addEventListener(type, this);
    }, this);
  }

  CollectionSource.prototype = {

    /**
     * Synchronizes our local result set with datastre.
     */
    synchronize: function() {
      // TODO: Synchronize logic.
    },

    /**
     * Populates the initial Collection data.
     * @param {Function} success Called after we fetch all initial data.
     */
    populate: function(success) {
      var self = this;
      CollectionsDatabase.getAll().then(function(systemCollections) {
        // We are going to iterate over system Collections
        Object.keys(systemCollections).forEach(function(id) {
          self.entries.push(new Collection(systemCollections[id]));
        });

        success(self.entries);
      }, success);
    },

    /**
     * General datastore event handler.
     * @param {Event} e
     */
    handleEvent: function(e) {
      switch (e.type) {
        case 'added':
        case 'updated':
          this.addIconToGrid(e.target);
          app.itemStore.save(app.items);
          break;
        case 'removed':
          // The 'id' of a Collection is really the url.
          this.removeIconFromGrid(e.target.id);
          break;
      }
    },

    /**
     * Adds a Collection icon to the grid.
     */
    addIconToGrid: function(detail) {
      // If there is a pre-existing icon, just update it.
      var existing = app.icons[detail.id];
      if (existing) {
        existing.update(detail);
        app.render();
        return;
      }

      var collection = new Collection(detail);
      collection.setPosition(this.store.getNextPosition());
      this.entries.push(collection);

      // Manually inject this book mark into the app item list for now.
      // Remove and re-append a divider if the last item is a divider
      var lastItem = app.items[app.items.length - 1];
      if ((lastItem instanceof Divider)) {
        var divider = app.items.pop();
        app.items.push(collection);
        app.items.push(divider);
      } else {
        app.items.push(collection);
      }

      app.icons[collection.identifier] = collection;
      app.render();
    },

    /**
     * Removes a Collection icon from the grid.
     */
    removeIconFromGrid: function(url) {
      var appObject = app.icons[url];
      delete app.icons[appObject.identifier];

      var itemIndex = app.items.indexOf(appObject);
      app.items.splice(itemIndex, 1);
      app.render();

      if (appObject.element) {
        appObject.element.parentNode.removeChild(appObject.element);
      }
    }

  };

  exports.CollectionSource = CollectionSource;

}(window));
