/* globals BrowserDB, SyncBrowserDB, SyncManagerBridge */
'use strict';

(function(exports){

//IFDEF_FIREFOX_SYNC
  /**
   * The root folder id of synced bookmark data.
   * @type {String}
   */
  const SYNC_BOOKMARK_ROOT_FOLDER_ID = 'places';
  /**
   * The mobile folder id of synced bookmark data.
   * @type {String}
   */
  const SYNC_BOOKMARK_MOBILE_FOLDER_ID = 'mobile';
//ENDIF_FIREFOX_SYNC

  // TODO: for the live time bookmark data loading task.
  var BookmarkStore = {
    isSynced: false,

    cache: [],

    currentFolder : null,

//IFDEF_FIREFOX_SYNC
    syncBookmarkRootFolderCache: {
      id: SYNC_BOOKMARK_ROOT_FOLDER_ID,
      title: '',
      type: 'folder',
      readOnly: true
    },

    syncBookmarkMobileFolderCache: {
      id: SYNC_BOOKMARK_MOBILE_FOLDER_ID,
      title: '',
      type: 'folder',
      readOnly: true
    },
//ENDIF_FIREFOX_SYNC

    init: function () {

//IFDEF_FIREFOX_SYNC
      var l10nPromises = [];
      l10nPromises
        .push(navigator.mozL10n.formatValue('fxsync-desktop-bookmarks'));
      l10nPromises
        .push(navigator.mozL10n.formatValue('fxsync-mobile-bookmarks'));
      Promise.all(l10nPromises).then(
        ([l10nFxsyncDesktopBookmarks, l10nFxsyncMobileBookmarks]) => {
          this.syncBookmarkRootFolderCache.title = l10nFxsyncDesktopBookmarks;
          this.syncBookmarkMobileFolderCache.title = l10nFxsyncMobileBookmarks;
        }
      );
//ENDIF_FIREFOX_SYNC

    },

    reset: function(cb) {
      this.cache = [];
      this.currentFolder = null;

      return new Promise(resolve => {

//IFNDEF_FIREFOX_SYNC
        resolve();
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
        SyncManagerBridge.getInfo().then(message => {
          this.isSynced = (message.state === 'enabled') ? true : false;
          resolve();
        });
//ENDIF_FIREFOX_SYNC

      });
    },

    /**
     * get the latest cache based on maxNum
     * @param  {Number} maxNum - max query length
     */
    _getCaches: function(maxNum) {
      var self = this;
      return new Promise(resolve => {
        var length = maxNum > self.cache.length ? self.cache.length : maxNum;
        var result = [];

        for(var i = 0; i < length; i++) {
          result.push(self.cache[i]);
        }
        resolve(result);
      });
    },

    /**
     * Get specific number of the latest bookmark cache
     * @param  {Number}   maxNum - max query length
     * @param  {String}   folderId - folder id
     * @param  {Function} cb - callback function with history cache as parameter
     */
    getByNumber: function (maxNum, folderId, cb) {
      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.fetchCache()
          .then(() => this._getCaches(maxNum))
          .then(cb);
      } else {
        this._getCaches(maxNum)
          .then(cb);
      }
    },

    /**
     * Get cache data by index. If index out of currant cache range, traverse
     * new cache.
     * @param  {Number} index - cache index
     */
    _getCache: function(index) {
      var self = this;
      return new Promise(resolve => {
        var result = null;
        if(index >= 0 && index < self.cache.length) {
          result = self.cache[index];
        }
        resolve(result);
      });
    },

    /**
     * Get bookmark cache by index.
     * If the index out of current cache index range, traverse new cache until
     * there no history record.
     * @param  {Number}   index - query cache index
     * @param  {String}   folderId - folder id
     * @param  {Function} cb - callback function with history cache as parameter
     */
    getByIndex: function (index, folderId, cb) {
      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.fetchCache()
          .then(() => this._getCache(index))
          .then(cb);
      } else {
        this._getCache(index)
          .then(cb);
      }
    },

//IFDEF_FIREFOX_SYNC
    _createRootFolderCache: function () {
      var self = this;
      // We query remote bookmarks by parentid with
      // SYNC_BOOKMARK_ROOT_FOLDER_ID for checking if the indexedDB has
      // remote bookmark data. If there is any remote data, we create a
      // folder item to show the synced bookmark.
      function getPlacesBookmarks() {
        return new Promise(resolve => {
          SyncBrowserDB.getBookmark({
            parentid: SYNC_BOOKMARK_ROOT_FOLDER_ID
          }, syncPlacesBookmarks => {
            if(syncPlacesBookmarks.length > 0) {
              self.cache.push(self.syncBookmarkRootFolderCache);
            }
            resolve();
          });
        });
      }

      // If there is mobile folder and also has children in it,
      // create a folder item to show the synced mobile bookmark
      function getMobileBookmarks() {
        return new Promise(resolve => {
          SyncBrowserDB.getBookmark({
            parentid: SYNC_BOOKMARK_MOBILE_FOLDER_ID
          }, syncMobileBookmarks => {
            if(syncMobileBookmarks.length > 0) {
              self.cache.push(self.syncBookmarkMobileFolderCache);
            }
            resolve();
          });
        });
      }

      // get bookmark data from origin indexdDB
      function getLocalBookmarks() {
        return new Promise(resolve => {
          BrowserDB.getBookmarks(localBookmarks => {
            if(localBookmarks.length > 0) {
              self.cache = self.cache.concat(localBookmarks);
            }
            resolve();
          });
        });
      }

      return getPlacesBookmarks()
        .then(getMobileBookmarks)
        .then(getLocalBookmarks);
    },

    _updateFolderCache: function () {
      return new Promise(resolve => {
        SyncBrowserDB.getBookmark({
          parentid: this.currentFolder
        }, syncBookmark => {
          var length = syncBookmark.length,
              bookmark = null;
          for(var i = 0; i < length; i++) {
            bookmark = syncBookmark[i];
            //hide mobile folder in sync bookmark folder
            if(this.currentFolder === SYNC_BOOKMARK_ROOT_FOLDER_ID &&
              bookmark.id === SYNC_BOOKMARK_MOBILE_FOLDER_ID) {
              continue;
            }

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
          }
          resolve();
        });
      });
    },
//ENDIF_FIREFOX_SYNC

    fetchCache: function(){
      this.cache = [];
      return new Promise(resolve => {
        if(!this.isSynced) {
          // Get bookmark data from origin indexedDB
          BrowserDB.getBookmarks(bookmarks => {
            this.cache = bookmarks;
            resolve();
          });
        } else {
//IFNDEF_FIREFOX_SYNC
          resolve();
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
          if(!this.currentFolder) {
            this._createRootFolderCache().then(resolve);
          } else {
            this._updateFolderCache().then(resolve);
          }
//ENDIF_FIREFOX_SYNC
        }
      });
    }
  };

  exports.BookmarkStore = BookmarkStore;
})(window);
