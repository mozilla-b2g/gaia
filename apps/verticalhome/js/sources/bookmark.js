'use strict';
/* global GaiaGrid */
/* global BookmarksDatabase */
/* global appManager */

(function(exports) {

  var eventTypesToListenFor = ['added', 'updated', 'removed'];

  /**
   * BookmarkSource is responsible for populating the iniial bookmark
   * results as well as keeping the grid in sync with the bookmark datastore.
   * @param {Object} store The backing database store class.
   */
  function BookmarkSource(store) {
    this.store = store;
    this.entries = [];

    eventTypesToListenFor.forEach(function iterateTypes(type) {
      BookmarksDatabase.addEventListener(type, this);
    }, this);
  }

  BookmarkSource.prototype = {

    /**
     * Synchronizes our local result set with datastre.
     */
    synchronize: function() {
      var allAppBookmarks = {};
      var toAdd = [];
      var icons = app.grid.getIcons();

      for (var i in icons) {
        var icon = icons[i];
        if (!(icon instanceof GaiaGrid.Bookmark)) {
          continue;
        }
        allAppBookmarks[icon.detail.url] = icon;
      }

      for (var j = 0, jLen = this.entries.length; j < jLen; j++) {
        var entry = this.entries[j];
        if (!allAppBookmarks[entry.detail.url]) {
          toAdd.push(entry);
        } else {
          delete allAppBookmarks[entry.detail.url];
        }
      }

      for (i in allAppBookmarks) {
        this.removeIconFromGrid(allAppBookmarks[i].detail.url);
      }

      for (i = 0; i < toAdd.length; i++) {
        this.addIconToGrid(toAdd[i].detail);
      }

      app.itemStore.save(app.grid.getItems());
    },

    /**
     * Populates the initial bookmark data.
     * @param {Function} success Called after we fetch all initial data.
     */
    populate: function(success) {
      var self = this;
      BookmarksDatabase.getAll().then(function(systemBookmarks) {
        // We are going to iterate over system bookmarks
        Object.keys(systemBookmarks).forEach(function(id) {
          self.entries.push(new GaiaGrid.Bookmark(systemBookmarks[id]));
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
          app.itemStore.save(app.grid.getItems());
          if (e.type === 'added') {
            appManager.sendEventToCollectionApp('install',
              { id: e.target.id });
          }
          break;
        case 'removed':
          // The 'id' of a bookmark is really the url.
          var id = e.target.id;
          this.removeIconFromGrid(id);
          appManager.sendEventToCollectionApp('uninstall',
            { id: id });
          break;
      }
    },

    /**
     * Adds a bookmark icon to the grid.
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

      var bookmark = new GaiaGrid.Bookmark(detail);
      bookmark.setPosition(this.store.getNextPosition());
      this.entries.push(bookmark);

      // Manually inject this book mark into the app item list for now.
      // Remove and re-append a divider if the last item is a divider
      var lastDivider = app.grid.removeUntilDivider();
      app.grid.add(bookmark);
      app.grid.add(lastDivider);

      app.grid.render();
    },

    /**
     * Removes a bookmark icon from the grid.
     */
    removeIconFromGrid: function(url) {
      var icons = app.grid.getIcons();
      var appObject = icons[url];

      if (appObject) {
        appObject.removeFromGrid();
      }
    }

  };

  exports.BookmarkSource = BookmarkSource;

}(window));
