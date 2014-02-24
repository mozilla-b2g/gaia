'use strict';

var Bookmark = function Bookmark(params) {
  GridItem.call(this, params);

  this.url = this.origin = params.bookmarkURL.trim();
  // The bookmarkURL is used for indexing bookmarks in the homescreen. "It's not
  // a real URL", just used for indexing in homescreen (bug #976955)
  this.bookmarkURL = this.generateIndex(this.url);
  this.type = GridItemsFactory.TYPE.BOOKMARK;
};

Bookmark.prototype = {
  __proto__: GridItem.prototype,

  generateIndex: function bookmark_generateIndex(url) {
    return 'bookmark:' + url;
  },

  launch: function bookmark_launch() {
    var features = this.getFeatures();

    window.open(this.url, '_blank', Object.keys(features).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(features[key]);
    }).join(','));
  }
};
