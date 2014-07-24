'use strict';
/* global GaiaGrid */
/* global CollectionsDatabase */

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

  }

  CollectionSource.prototype = {

    _setListeners: function() {
      eventTypesToListenFor.forEach(function iterateTypes(type) {
        CollectionsDatabase.addEventListener(type, this);
      }, this);

      window.addEventListener('context-menu-open', this);
      window.addEventListener('collections-create-begin', this);
      window.addEventListener('collections-create-return', this);

      // Turn this function into a no-op so we  don't add listeners again.
      this._setListeners = function() {};
    },


    /**
     * Whether or not we are currently in a create activity.
     * If we are in a create activity, we buffer all collection create requests
     * until we have the expected order from the activity.
     */
    inCreateActivity: false,

    /**
     * A list of pending collection IDs that we are going to add in order.
     */
    pendingIds: [],

    /**
     * A list of pending collections to add once we return from the create page.
     * These are keyed by the colleciton id.
     */
    pendingCollections: {},

    /**
     * The position to insert icons at after the next activity.
     */
    insertPosition: null,

    /**
     * Synchronizes our local result set with datastre.
     */
    synchronize: function() {
      var allCollections = {};
      var toAdd = [];
      var icons = app.grid.getIcons();

      for (var i in icons) {
        var icon = icons[i];
        if (icon.detail.type !== 'collection') {
          continue;
        }
        allCollections[icon.identifier] = icon;
      }

      for (var j = 0, jLen = this.entries.length; j < jLen; j++) {
        var entry = this.entries[j];
        if (!allCollections[entry.identifier]) {
          toAdd.push(entry);
        } else {
          delete allCollections[entry.identifier];
        }
      }

      for (i in allCollections) {
        this.removeIconFromGrid(allCollections[i].identifier);
      }

      for (i = 0; i < toAdd.length; i++) {
        this.addIconToGrid(toAdd[i].detail);
      }

      app.itemStore.save(app.grid.getItems());
      this._setListeners();
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
          self.entries.push(new GaiaGrid.Collection(systemCollections[id]));
        });
        self._setListeners();

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
          app.grid.render();
          app.itemStore.save(app.grid.getItems());
          break;
        case 'removed':
          // The 'id' of a Collection is really the url.
          this.removeIconFromGrid(e.target.id);
          // Save the layout once a collection has been removed
          app.itemStore.save(app.grid.getItems());
          break;
        case 'context-menu-open':
          this.insertPosition = e.detail.nearestIndex;
          break;
        case 'collections-create-begin':
          this.inCreateActivity = true;
          break;
        case 'collections-create-return':
          this.inCreateActivity = false;
          this.pendingIds = this.pendingIds.concat(e.detail.ids || []);
          // If we've already received enough items, process.
          if(this.isPendingFulfilled()) {
            this.processPending();
          }
          break;
      }
    },

    /**
     * Adds a Collection icon to the grid.
     */
    addIconToGrid: function(detail) {
      // If there is a pre-existing icon, just update it.
      var icons = app.grid.getIcons();
      var existing = icons[detail.id];
      if (existing) {
        existing.update(detail);
        app.grid.render();
        return;
      }

      // Add to pending if needed.
      this.maybeAddToPending(detail);

      // If we are creating more collections, or we are waiting for collections,
      // wait until we come back from the activity before processing them.
      if(this.isPendingFulfilled()) {
        // We are not in the create activity, but have a list of IDs we are
        // waiting to fill. If we have reached the number of collections we
        // are expecting, start processing them.
        this.processPending();
        return;
      } else if (this.inCreateActivity || this.pendingIds.length) {
        // If we have pending Ids and we're not done, return.
        return;
      }

      var collection = new GaiaGrid.Collection(detail);
      collection.setPosition(this.store.getNextPosition());
      this.entries.push(collection);

      if (this.insertPosition) {
        // If we are inserting in any index we can just call render
        // with the index.
        app.grid.add(collection, this.insertPosition);
      } else {
        // Manually inject this book mark into the app item list for now.
        // Remove and re-append a divider if the last item is a divider
        var lastDivider = app.grid.removeUntilDivider();
        app.grid.add(collection);
        app.grid.add(lastDivider);
      }
    },

    /**
     * Removes a Collection icon from the grid.
     */
    removeIconFromGrid: function(url) {
      var icons = app.grid.getIcons();
      var appObject = icons[url];
      if (appObject) {
        appObject.removeFromGrid();
      }
    },

    /**
     * Checks if our pending collections are fulfilled or not.
     */
    isPendingFulfilled: function() {
      if (!this.pendingIds.length) {
        return false;
      }

      for (var i = 0; i < this.pendingIds.length; i++) {
        var id = this.pendingIds[i];
        if (!this.pendingCollections[id]) {
          return false;
        }
      }

      return !this.inCreateActivity;
    },

    /**
     * Adds an item to the pending collections if we're waiting on the id.
     */
    maybeAddToPending: function(collection) {
      if (this.inCreateActivity ||
          this.pendingIds.indexOf(collection.id) !== -1) {
        this.pendingCollections[collection.id] = collection;
      }
    },

    /**
     * Processes all pending collections and adds them to the grid.
     */
    processPending: function() {
      // An ordered array of detail objects.
      var ordered = [];

      var id;
      while ((id = this.pendingIds.shift())) {
        ordered.push(this.pendingCollections[id]);
        delete this.pendingCollections[id];
      }

      ordered.forEach(item => {
        this.addIconToGrid(item);

        // Increment the insertion position as we are inserting in order.
        this.insertPosition++;
      });

      // Reset the position as we've now inserted all of our expected
      // icons from the activity.
      this.insertPosition = null;

      // It is unlikely that we will ever get here, but the if the user managed
      // to add more smart collections from somewhere else, we may have some in
      // pendingCollectionsById. Render them.
      for (var i in this.pendingCollections) {
        this.addIconToGrid(this.pendingCollections[i]);
        delete this.pendingCollections[i];
      }

      app.grid.render();
    }
  };

  exports.CollectionSource = CollectionSource;

}(window));
