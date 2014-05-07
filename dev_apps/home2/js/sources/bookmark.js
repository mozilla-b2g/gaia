'use strict';
/* global Bookmark */
/* global BookmarksDatabase */
/* global Divider */

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

      for (var i in app.icons) {
        var icon = app.icons[i];
        if (!(icon instanceof Bookmark)) {
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
        this.removeIconFromGrid(allAppBookmarks[i].detail);
      }

      for (i = 0; i < toAdd.length; i++) {
        this.addIconToGrid(toAdd[i].detail);
      }

      app.itemStore.save(app.items);
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
          self.entries.push(new Bookmark(systemBookmarks[id]));
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
          // The 'id' of a bookmark is really the url.
          this.removeIconFromGrid(e.target.id);
          break;
      }
    },

    /**
     * Adds a bookmark icon to the grid.
     */
    addIconToGrid: function(detail) {

      // If there is a pre-existing icon, just update it.
      var existing = app.icons[detail.id];
      if (existing) {
        existing.update(detail);
        app.render();
        return;
      }

      var bookmark = new Bookmark(detail);
      bookmark.setPosition(this.store.getNextPosition());
      this.entries.push(bookmark);

      // Manually inject this book mark into the app item list for now.
      // Remove and re-append a divider if the last item is a divider
      var lastItem = app.items[app.items.length - 1];
      if ((lastItem instanceof Divider)) {
        var divider = app.items.pop();
        app.items.push(bookmark);
        app.items.push(divider);
      } else {
        app.items.push(bookmark);
      }

      app.icons[bookmark.identifier] = bookmark;
      app.render();
    },

    /**
     * Removes a bookmark icon from the grid.
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

  exports.BookmarkSource = BookmarkSource;

}(window));
