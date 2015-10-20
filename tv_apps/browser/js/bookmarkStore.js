/* globals BrowserDB */
'use strict';

(function(exports){
  var BookmarkStore = {
    cache: [],

    getByRange: function(start, num, folderId, cb) {
      var i = start,
          length = (start + num) > this.cache.length ?
              (this.cache.length - start) : (start + num),
          result = [];
      for(; i < length; i++) {
        result.push(this.cache[i]);
      }
      cb(result);
    },

    getByIndex: function(index, folderId, cb) {
      var result = null;
      if(index >= 0 && index < this.cache.length) {
        result = this.cache[index];
      }
      cb(result);
    },

    updateCache: function(cb){
      BrowserDB.getBookmarks((function(bookmarks){
        this.cache = bookmarks;
        cb();
      }).bind(this));
    }
  };

  exports.BookmarkStore = BookmarkStore;
})(window);
