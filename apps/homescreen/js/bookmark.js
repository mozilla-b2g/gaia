'use strict';

var Bookmark = function Bookmark(params) {
  GridItem.call(this, params);

  // The bookmarkURL is used for indexing bookmarks in the homescreen. "It's not
  // a real URL", just used for indexing in homescreen (bug #976955)
  var url = params.bookmarkURL.trim();
  this.bookmarkURL = this.generateIndex(url);
  this.setURL(url);

  this.type = GridItemsFactory.TYPE.BOOKMARK;
};

Bookmark.prototype = {
  __proto__: GridItem.prototype,

  _INDEX_PREFIX: 'bookmark/',

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
    this.url = this.origin = this.sanitizeURL(url);
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
          // TODO bug 988177
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
