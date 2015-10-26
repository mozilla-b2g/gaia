/* globals BrowserDB, SyncBrowserDB, SyncManagerBridge */
'use strict';

(function(exports){

  // TODO: for the live time bookmark data loading task.
  var BookmarkStore = {
    isSynced: false,

    cache: [],

    currentFolder : null,

    reset: function(cb) {
      return new Promise(resolve => {
        this.cache = [];
        this.currentFolder = null;
        SyncManagerBridge.getInfo().then(message => {
          this.isSynced = (message.state === 'enabled') ? true : false;
          resolve();
        });
      });
    },

    getByRange: function(start, num, folderId, cb) {
      var self = this;
      function getCaches(){
        var length = (start + num) > self.cache.length ?
          (self.cache.length - start) : (start + num);
        var result = [];

        for(var i = start; i < length; i++) {
          result.push(self.cache[i]);
        }
        return result;
      }

      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.updateCache().then(() => {
          cb(getCaches());
        });
      } else {
        cb(getCaches());
      }
    },

    getByIndex: function(index, folderId, cb) {
      var self = this;
      function getCache(){
        var result = null;
        if(index >= 0 && index < self.cache.length) {
          result = self.cache[index];
        }
        return result;
      }

      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.updateCache().then(() => {
          cb(getCache());
        });
      } else {
        cb(getCache());
      }
    },

    updateCache: function(){
      this.cache = [];
      return new Promise( resolve => {
        if(!this.isSynced) {
          // Get bookmark data from origin indexdDB
          BrowserDB.getBookmarks(bookmarks => {
            this.cache = bookmarks;
            resolve();
          });
        } else {
          if(!this.currentFolder) {
            // XXX: Ideally we should use Promise.all for
            // SyncBrowserDB.getBookmark and BrowserDB.getBookmarks.
            // But now the implementation of these function are not
            // return Promise.
            SyncBrowserDB.getBookmark('places', bookmark => {
              // make sure if firefox synced data saved in indexdDB
              if(bookmark) {
                this.cache.push({
                  id: bookmark.id,
                  title: bookmark.title ? bookmark.title : 'Synced Bookmarks',
                  type: bookmark.type,
                  readOnly: true
                });
              }

              // get bookmark data from origin indexdDB
              BrowserDB.getBookmarks(bookmarks => {
                this.cache = this.cache.concat(bookmarks);
                resolve();
              });
            });
          } else {
            SyncBrowserDB.getBookmark({
              parentid: this.currentFolder
            }, bookmarks => {
              bookmarks.forEach((bookmark, i) => {
                // XXX: Now we only support two types: folder and bookmark.
                // And the data from firefox sync can't be modified.
                if(bookmark.type === 'folder' && bookmark.title) {
                  bookmark.readOnly = true;
                  this.cache.push(bookmark);
                } else if (bookmark.type === 'bookmark') {
                  bookmark.uri = bookmark.bmkUri;
                  bookmark.readOnly = true;
                  this.cache.push(bookmark);
                }
              });
              resolve();
            });
          }
        }
      });
    }
  };

  exports.BookmarkStore = BookmarkStore;
})(window);
