'use strict';

/* global HomeState, GridItemsFactory, CollectionsDatabase, BookmarksDatabase */

(function(exports) {

  function Migrator() {
    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
  }

  Migrator.prototype = {
    /**
     * It performs the migration task.
     */
    start: function(event) {
      if (this.migrating) {
        // Migration in progress
        return;
      }

      this.migrating = this.iterating = true;
      this.pendingItems = 0;
      HomeState.openDB(HomeState.getGrid.bind(undefined,
                          this.iteratePage.bind(this),
                          this.onHomeStateSuccess.bind(this),
                          this.onHomeStateError.bind(this)),
                          this.onHomeStateError.bind(this));
    },

    /**
     * This method iterates icons within a page. If an icon is a bookmark or
     * collection, it will be added to their own datastore
     */
    iteratePage: function(page) {
      console.debug('Migrating the page number', page.index);

      var types = GridItemsFactory.TYPE;
      var onItemMigrated = this.onItemMigrated.bind(this);
      page.icons.forEach(function(icon) {
        var type = icon.type;

        if (!type && icon.bookmarkURL) {
          // pre-1.3 bookmarks
          type = icon.type = types.BOOKMARK;
        }

        var database = null;

        if (type === types.COLLECTION) {
          database = CollectionsDatabase;
        } else if (type === types.BOOKMARK) {
          database = BookmarksDatabase;
        }

        if (!database) {
          return;
        }

        ++this.pendingItems;
        // We are going to propagate the bookmark/collection to datastore
        GridItemsFactory.create(icon).getDescriptor(function(descriptor) {
          database.add(descriptor).then(onItemMigrated, onItemMigrated);
        });
      }.bind(this));
    },

    onConnection: function(connectionRequest) {
      if (connectionRequest.keyword !== 'migrate') {
        return;
      }

      var port = this.port = connectionRequest.port;
      port.onmessage = this.start.bind(this);
      port.start();
    },

    /**
     * This method is performed when the migration finishes.
     */
    onFinish: function() {
      this.migrating = this.iterating = false;
      this.port.postMessage('Done');
    },

    /**
     * This method is performed when a item has been migrated.
     */
    onItemMigrated: function(event) {
      --this.pendingItems === 0 && !this.iterating && this.onFinish();
    },

    /**
     * This method is performed when indexedDB has been read and iterated.
     */
    onHomeStateSuccess: function() {
      this.iterating = false;
      this.pendingItems === 0 && this.onFinish();
    },

    /**
     * This method is performed when an error happens loading indexedDB.
     */
    onHomeStateError: function(error) {
      this.migrating = this.iterating = false;
      this.port.postMessage('Failed');
      console.error('Bookmarks & collections migration failed', error);
    }
  };

  exports.migrator = new Migrator();
}(window));
