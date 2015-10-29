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
            // XXX: Ideally we should use Promise.all for
            // SyncBrowserDB.getBookmark and BrowserDB.getBookmarks.
            // But now the implementation of these function are not
            // return Promise.
            SyncBrowserDB.getBookmark({
              parentid: SYNC_BOOKMARK_ROOT_FOLDER_ID
            }, syncPlacesBookmark => {
              // We query remote bookmarks by parentid with
              // SYNC_BOOKMARK_ROOT_FOLDER_ID for checking if the indexedDB has
              // remote bookmark data. If there is any remote data, we create a
              // folder item to show the synced bookmark.
              if(syncPlacesBookmark.length > 0) {
                this.cache.push(this.syncBookmarkRootFolderCache);

                // If there is mobile folder and also has children in it,
                // create a folder item to show the synced mobile bookmark
                SyncBrowserDB.getBookmark({
                  parentid: SYNC_BOOKMARK_MOBILE_FOLDER_ID
                }, syncMobileBookmark => {
                  if(syncMobileBookmark.length > 0) {
                    this.cache.push(this.syncBookmarkMobileFolderCache);
                  }
                  // get bookmark data from origin indexdDB
                  BrowserDB.getBookmarks(bookmarks => {
                    this.cache = this.cache.concat(bookmarks);
                    resolve();
                  });
                });
              } else {
                // get bookmark data from origin indexdDB
                BrowserDB.getBookmarks(bookmarks => {
                  this.cache = this.cache.concat(bookmarks);
                  resolve();
                });
              }
            });
          } else {
            SyncBrowserDB.getBookmark({
              parentid: this.currentFolder
            }, syncBookmark => {
              var length = syncBookmark.length,
                  bookmark = null;
              for(var i=0; i<length; i++) {
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
          }
//ENDIF_FIREFOX_SYNC
        }
      });
    }
  };

  exports.BookmarkStore = BookmarkStore;
})(window);
