'use strict';

var Bookmark = function Bookmark(params) {
  GridItem.call(this, params);

  var url = params.url && params.url.trim();
  if (!url) {
    // We are here because in pre-v2.0 the real url was not saved in indexedDB
    // and we have to extract this one from bookmarkURL ('bookmark:' + url). It
    // happens only the first time before bookmarks migration
    url = this.sanitizeURL(params.bookmarkURL);
  }
  var id = this.id = params.id || url;
  this.bookmarkURL = this.generateIndex(id);
  this.setURL(url);

  this.type = GridItemsFactory.TYPE.BOOKMARK;
};

Bookmark.prototype = {
  __proto__: GridItem.prototype,

  _INDEX_PREFIX: 'bookmark:',

  sanitizeURL: function bookmark_sanitizeURL(url) {
    url = url.trim();
    var prefix = this._INDEX_PREFIX;
    return url.startsWith(prefix) ? url.substr(prefix.length) : url;
  },

  generateIndex: function bookmark_generateIndex(url) {
    var prefix = this._INDEX_PREFIX;
    return url.startsWith(prefix) ? url : prefix + url;
  },

  launch: function bookmark_launch() {
    var features = this.getFeatures();

    window.open(this.url, '_blank', Object.keys(features).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(features[key]);
    }).join(','));
  },

  setURL: function bookmark_setURL(url) {
    this.url = this.origin = url;
  }
};

(function(exports) {
  var BookmarksListener = {
    handleEvent: function(e) {
      switch (e.type) {
        case 'added':
        case 'updated':
          GridManager.install(new Bookmark(e.target));
          break;
        case 'removed':
          var bookmarkIndex = Bookmark.prototype.generateIndex(e.target.id);
          var icon = GridManager.getIconForBookmark(bookmarkIndex);
          icon && icon.app.uninstall();
          break;
      }
      updateHomescreenRevisionId();
    }
  };

  var eventTypesToListenFor = ['added', 'updated', 'removed'];
  var revisionIdStorageKey = 'bookmarkRevisionStorageKey';

  function updateHomescreenRevisionId() {
    BookmarksDatabase.getRevisionId().then(function gotRevisionId(revisionId) {
      asyncStorage.setItem(revisionIdStorageKey, revisionId);
    });
  }

  exports.BookmarksManager = {
    attachListeners: function bm_attachListeners() {
      eventTypesToListenFor.forEach(function iterateTypes(type) {
        BookmarksDatabase.addEventListener(type, BookmarksListener);
      });
    },

    getHomescreenRevisionId: function bm_getHomescreenRevisionId(cb) {
      asyncStorage.getItem(revisionIdStorageKey, cb);
    },

    updateHomescreenRevisionId: updateHomescreenRevisionId
  };
}(window));
