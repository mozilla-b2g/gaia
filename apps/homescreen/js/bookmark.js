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
