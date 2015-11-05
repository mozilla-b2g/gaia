/* globals BrowserDB, SyncBrowserDB, SyncManagerBridge */
'use strict';

(function(exports){

  /**
   * history query limit for SyncBrowserDB.getHistory
   * @type {Number}
   */
  const MAX_HISTORY_QUERY_COUNT = 21;

  /**
   * Milli seconds for one day
   * @type {Number}
   */
  const DAY_IN_MILLI_SECOND = 86400000;

  // TODO: for the live time history data loading task.
  var HistoryStore = {
    /**
     * Is data sync enabled
     * @type {Boolean}
     */
    isSynced: false,

    /**
     * history cache map
     * @type {Map}
     */
    cache: new Map(),

    /**
     * history cache start index
     * @type {Number}
     */
    cacheIndexStartAt: 0,

    /**
     * history cache end index
     * @type {Number}
     */
    cacheIndexEndAt: 0,

    /**
     * The last history record index.
     * @type {Number}
     */
    lastDataIndex: null,

    /**
     * Current display folder of history
     * @type {String}
     */
    currentFolder : null,

//IFDEF_FIREFOX_SYNC
    /**
     * History cache for synced history root folder
     * @type {Object}
     */
    syncHistoryRootFolderCache: {
      id: 'synced_history',
      title: '',
      type: 'folder',
      readOnly: true
    },
//ENDIF_FIREFOX_SYNC

    init: function () {

//IFDEF_FIREFOX_SYNC

      // get l10n string and update syncHistoryRootFolderCache
      navigator.mozL10n.formatValue('fxsync-synced-history')
        .then(l10nFxsyncSyncedHistory => {
          this.syncHistoryRootFolderCache.title = l10nFxsyncSyncedHistory;
        }
      );
//ENDIF_FIREFOX_SYNC

    },

    reset: function (cb) {
      this.cache.clear();
      this.cacheIndexStartAt = 0;
      this.cacheIndexEndAt = 0;
      this.lastDataIndex = null;
      this.currentFolder = null;

      return new Promise(resolve => {

//IFNDEF_FIREFOX_SYNC
        resolve();
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC

        // update data sync status
        SyncManagerBridge.getInfo().then(message => {
          this.isSynced = (message.state === 'enabled') ? true : false;
          resolve();
        });
//ENDIF_FIREFOX_SYNC

      });
    },

    /**
     * Get specific number of history cache from start index
     * @param  {Number}   start - query start index
     * @param  {Number}   num - query length
     * @param  {String}   folderId - folder id
     * @param  {Function} cb - callback function with history cache as parameter
     */
    getByRange: function (start, num, folderId, cb) {
      var self = this;
      function getCaches() {
        return new Promise(resolve => {
          var length = (start + num) > self.cache.size ?
            (self.cache.size - start) : (start + num);
          var result = [];

          for(var i = start; i < length; i++) {
            result.push(self.cache.get(i));
          }
          resolve(result);
        });
      }

      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.fetchCache()
          .then(getCaches)
          .then(cb);
      } else {
        getCaches()
          .then(cb);
      }
    },


    /**
     * Get cache data by index. If index out of currant cache range, traverse
     * new cache.
     * @param  {Number} index - cache index
     */
    getCache: function(index){
      var self = this;
      return new Promise(resolve => {
        var history = null;
//IFNDEF_FIREFOX_SYNC
        if(self.cacheIndexStartAt <= index <= self.cacheIndexEndAt) {
          history = self.cache.get(index);
          resolve(history);
        } else {
          resolve(null);
        }
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC

        /**
         * traverse next history cache which timestamp laster than current
         * cache.
         * @param  {Number} index - cache index
         */
        function traverseNextCache(index) {
          var start = self.cache.get(self.cacheIndexStartAt).timestamp;
          SyncBrowserDB.getHistoryTimestamp(start, 'next', false,
            timestamp => {
              if(timestamp) {
                self.updateCacheByNextHistory(timestamp).then(() => {
                  history = self.cache.get(index);
                  if(!history) {
                    traverseNextCache(index);
                  } else {
                    resolve(history);
                  }
                });
              } else {
                resolve(null);
              }
            }
          );
        }

        /**
         * traverse previous history cache which timestamp is earlier than
         * current cache.
         * @param  {Number} index - cache index
         */
        function traversePreviousCache(index) {
          var start = self.cache.get(self.cacheIndexEndAt).timestamp;
          SyncBrowserDB.getHistoryTimestamp(start, 'prev', false,
            timestamp => {
              if(timestamp) {
                self.updateCacheByPreviousHistory(timestamp).then(() => {
                  history = self.cache.get(index);
                  if(!history) {
                    traversePreviousCache(index);
                  } else {
                    resolve(history);
                  }
                });
              } else {
                self.lastDataIndex = self.cacheIndexEndAt;
                resolve(null);
              }
            }
          );
        }

        if(index < self.cacheIndexStartAt) {
          traverseNextCache(index);
        } else if (index > self.cacheIndexEndAt) {
          if(self.lastDataIndex && index > self.lastDataIndex) {
            resolve(history);
          } else {
            traversePreviousCache(index);
          }
        } else {
          history = self.cache.get(index);
          resolve(history);
        }
//ENDIF_FIREFOX_SYNC
      });
    },

    /**
     * Get history cache by index.
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
          .then(() => this.getCache(index))
          .then(cb);
      } else {
        this.getCache(index)
          .then(cb);
      }
    },

    /**
     * update cache with local indexedDB
     */
    _updateLocalCache: function () {
      return new Promise(resolve => {
        BrowserDB.getHistory(localHistory => {
          localHistory.forEach(history => {
            this.cacheIndexEndAt++;
            this.cache.set(this.cacheIndexEndAt, history);
          });
          this.lastDataIndex = this.cacheIndexEndAt;
          resolve();
        });
      });
    },

//IFDEF_FIREFOX_SYNC

    /**
     * create root folder cache
     */
    _createRootFolderCache: function () {
      var self = this;

      // We query remote history by parentid for checking if
      // the indexedDB has remote history data. If there is
      // any remote data, we create a folder item to show the
      // synced history.
      function getSyncHistory() {
        return new Promise(resolve => {
          SyncBrowserDB.getHistoryTimestamp(Date.now(), 'prev', true,
            timestamp => {
              if(timestamp) {
                self.cacheIndexEndAt++;
                self.cache.set(self.cacheIndexEndAt,
                  self.syncHistoryRootFolderCache);
              }
              resolve();
            }
          );
        });
      }

      return getSyncHistory()
        .then(() => {
          return this._updateLocalCache();
        });
    },
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC

    /**
     * update cache with sync indexedDB
     */
    _updateFolderCache: function () {
      return new Promise(resolve => {
        SyncBrowserDB.getHistory(MAX_HISTORY_QUERY_COUNT, syncHistory => {
          syncHistory.forEach(history => {
            // XXX: the data from firefox sync can't be modified.
            history.readOnly = true;
            this.cacheIndexEndAt++;
            this.cache.set(this.cacheIndexEndAt, history);
          });

          if(syncHistory.length < MAX_HISTORY_QUERY_COUNT) {
            this.lastDataIndex = this.cacheIndexEndAt;
          }
          resolve();
        });
      });
    },
//ENDIF_FIREFOX_SYNC

    fetchCache: function () {
      this.cache.clear();
      this.cacheIndexStartAt = 0;
      this.cacheIndexEndAt = -1;
      this.lastDataIndex = null;

      return new Promise( resolve => {
        if(!this.isSynced) {
          this._updateLocalCache().then(resolve);
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
    },

//IFDEF_FIREFOX_SYNC

    /**
     * update history cache with the next history which laster than current
     * history cache.
     * @param  {Number} start - start timestamp
     */
    updateCacheByNextHistory: function (start) {
      var promise = new Promise(resolve => {
        var end = start + DAY_IN_MILLI_SECOND;

        SyncBrowserDB.getHistoryByTime(start, end, true, true, syncHistory => {
          var historyLength = syncHistory.length;
          this.cache.clear();
          this.cacheIndexStartAt = this.cacheIndexStartAt - historyLength;
          this.cacheIndexEndAt = this.cacheIndexStartAt + historyLength - 1;

          var cacheIndex = 0;
          var history = null;
          for(var i = 0; i < historyLength; i++) {
            history = syncHistory[i];
            history.readOnly = true;
            cacheIndex = i + this.cacheIndexStartAt;
            this.cache.set(cacheIndex, history);
          }
          resolve();
        });
      });
      return promise;
    },
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC

    /**
     * update history cache with the previous history which earlier than
     * current history cache.
     * @param  {Number} start - start timestamp
     */
    updateCacheByPreviousHistory: function (end) {
      var promise = new Promise(resolve => {
        var start = end - DAY_IN_MILLI_SECOND;

        SyncBrowserDB.getHistoryByTime(start, end, true, true, syncHistory => {
          var historyLength = syncHistory.length;
          this.cache.clear();
          this.cacheIndexStartAt = this.cacheIndexEndAt + 1;
          this.cacheIndexEndAt = this.cacheIndexStartAt + syncHistory.length -1;

          var cacheIndex = 0;
          var history = null;
          for(var i = 0; i < historyLength; i++) {
            history = syncHistory[i];
            history.readOnly = true;
            cacheIndex = i + this.cacheIndexStartAt;
            this.cache.set(cacheIndex, history);
          }
          resolve();
        });
      });
      return promise;
    },
//ENDIF_FIREFOX_SYNC

    removeCache: function (index) {
      if(this.cacheIndexStartAt <= index <= this.cacheIndexEndAt) {
        var value = null;
        for(var i = index; i<this.cacheIndexEndAt; i++) {
          value = this.cache.get(i+1);
          this.cache.set(i, value);
        }
        this.cache.delete(this.cacheIndexEndAt);
        this.cacheIndexEndAt--;
      }
    }
  };

  exports.HistoryStore = HistoryStore;
})(window);
