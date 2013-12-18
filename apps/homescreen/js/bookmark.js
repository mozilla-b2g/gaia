'use strict';

var Bookmark = function Bookmark(params) {
  GridItem.call(this, params);

  var url = params.bookmarkURL.trim();
  this.url = this.origin = this.bookmarkURL = url.endsWith('/') ? url :
                                                                  url + '/';
  this.type = GridItemsFactory.TYPE.BOOKMARK;
};

Bookmark.prototype = {
  __proto__: GridItem.prototype,

  launch: function bookmark_launch() {
    var features = this.getFeatures();

    window.open(this.url, '_blank', Object.keys(features).map(function(key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(features[key]);
    }).join(','));
  }
};
