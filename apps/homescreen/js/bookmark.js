'use strict';

var Bookmark = function Bookmark(params, cb) {
  GridItem.call(this, params);

  this.type = GridItemsFactory.TYPE.BOOKMARK;
  cb && cb(this);
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
