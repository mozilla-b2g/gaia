/* globals BrowserDB, SyncBrowserDB, SyncManagerBridge */
'use strict';

(function(exports){

  const INITIAL_HISTORY_COUNT = 21;

  const DAY_IN_MILLI_SECOND = 86400000;

  // TODO: for the live time history data loading task.
  var HistoryStore = {
    isSynced: false,

    isMoreData: false,

    cache: new Map(),

    cacheIndexStartAt: 0,

    cacheIndexEndAt: 0,

    lastDataIndex: undefined,

    currentFolder : undefined,

    reset: function (cb) {
      return new Promise(resolve => {
        this.isMoreDat = false;
        this.cache.clear();
        this.cacheIndexStartAt = 0;
        this.cacheIndexEndAt = 0;
        this.lastDataIndex = undefined;
        this.currentFolder = undefined;
        SyncManagerBridge.getInfo().then(message => {
          this.isSynced = (message.state === 'enabled') ? true : false;
          resolve();
        });
      });
    },

    getByRange: function (start, num, folderId, cb) {
      var self = this;
      function getCaches(){

        var length = (start + num) > self.cache.size ?
          (self.cache.size - start) : (start + num);
        var result = [];

        for(var i = start; i < length; i++) {
          result.push(self.cache.get(i));
        }
        return result;

      }

      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.fetchCache().then(() => {
          cb(getCaches());
        });
      } else {
        cb(getCaches());
      }
    },

    getByIndex: function (index, folderId, cb) {
      var self = this;
      function getCache(cacheIndex){
        var promise = new Promise(resolve => {
          var start = null,
              history = null;

          function traverseNextCache(cacheIndex) {
            start = self.cache.get(self.cacheIndexStartAt).timestamp;
            SyncBrowserDB.getHistoryTimestamp(start, 'next', false,
              timestamp => {
                if(timestamp) {
                  self.updateCacheByNextHistory(timestamp).then(() => {
                    history = self.cache.get(cacheIndex);
                    if(!history) {
                      traverseNextCache(cacheIndex);
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

          function traversePreviousCache(cacheIndex) {
            start = self.cache.get(self.cacheIndexEndAt).timestamp;
            SyncBrowserDB.getHistoryTimestamp(start, 'prev', false,
              timestamp => {
                if(timestamp) {
                  self.updateCacheByPreviousHistory(timestamp).then(() => {
                    history = self.cache.get(cacheIndex);
                    if(!history) {
                      traversePreviousCache(cacheIndex);
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

          if(cacheIndex < self.cacheIndexStartAt) {
            traverseNextCache(cacheIndex);
          } else if (cacheIndex > self.cacheIndexEndAt) {
            if(self.lastDataIndex && cacheIndex > self.lastDataIndex) {
              resolve(history);
            } else {
              traversePreviousCache(cacheIndex);
            }
          } else {
            history = self.cache.get(cacheIndex);
            resolve(history);
          }
        });
        return promise;
      }

      if(folderId !== this.currentFolder) {
        this.currentFolder = folderId;
        this.fetchCache().then(() => {
          getCache(index).then(history => {
            cb(history);
          });
        });
      } else {
        getCache(index).then(history => {
          cb(history);
        });
      }
    },

    fetchCache: function () {
      this.cache.clear();
      this.cacheIndexStartAt = 0;
      this.cacheIndexEndAt = -1;
      this.lastDataIndex = undefined;

      return new Promise( resolve => {
        if(!this.isSynced) {
          // Get bookmark data from origin indexdDB
          BrowserDB.getHistory(localHistory => {
            localHistory.forEach(history => {
              this.cacheIndexEndAt++;
              this.cache.set(this.cacheIndexEndAt, history);
            });
            this.lastDataIndex = this.cacheIndexEndAt;
            resolve();
          });
        } else {
          if(!this.currentFolder) {
            // XXX: Ideally we should use Promise.all for
            // SyncBrowserDB.getBookmark and BrowserDB.getBookmarks.
            // But now the implementation of these function are not
            // return Promise.
            SyncBrowserDB.getHistoryTimestamp(Date.now(), 'prev', true,
              timestamp => {
                // We query remote history by parentid for checking if
                // the indexedDB has remote history data. If there is
                // any remote data, we create a folder item to show the
                // synced history.
                if(timestamp) {
                  this.cacheIndexEndAt++;
                  this.cache.set(this.cacheIndexEndAt, {
                    id: 'sync_history',
                    title: 'Synced History',
                    type: 'folder',
                    readOnly: true
                  });
                }

                // get bookmark data from origin indexdDB
                BrowserDB.getHistory(localHistory => {
                  localHistory.forEach(history => {
                    this.cacheIndexEndAt++;
                    this.cache.set(this.cacheIndexEndAt, history);
                  });
                  this.lastDataIndex = this.cacheIndexEndAt;
                  resolve();
                });
              }
            );
          } else {
            SyncBrowserDB.getHistory(INITIAL_HISTORY_COUNT, syncHistory => {
              syncHistory.forEach(history => {
                // XXX: the data from firefox sync can't be modified.
                history.readOnly = true;
                this.cacheIndexEndAt++;
                this.cache.set(this.cacheIndexEndAt, history);
              });

              if(syncHistory.length < INITIAL_HISTORY_COUNT) {
                this.lastDataIndex = this.cacheIndexEndAt;
              }
              resolve();
            });
          }
        }
      });
    },

    updateCacheByNextHistory: function (timestamp) {
      var promise = new Promise(resolve => {
        var start = timestamp,
            end = timestamp + DAY_IN_MILLI_SECOND;

        SyncBrowserDB.getHistoryByTime(start, end, true, true, syncHistory => {
          this.cache.clear();
          this.cacheIndexEndAt = this.cacheIndexStartAt - 1;
          var length = syncHistory.length;
          while(length--) {
            this.cacheIndexStartAt--;
            this.cache.set(this.cacheIndexStartAt, syncHistory[length]);
          }
          resolve();
        });
      });
      return promise;
    },

    updateCacheByPreviousHistory: function (timestamp) {
      var promise = new Promise(resolve => {
        var start = timestamp - DAY_IN_MILLI_SECOND,
            end = timestamp;

        SyncBrowserDB.getHistoryByTime(start, end, true, true, syncHistory => {
          this.cache.clear();
          this.cacheIndexStartAt = this.cacheIndexEndAt + 1;
          syncHistory.forEach(history => {
            // XXX: the data from firefox sync can't be modified.
            history.readOnly = true;
            this.cacheIndexEndAt++;
            this.cache.set(this.cacheIndexEndAt, history);
          });
          resolve();
        });
      });
      return promise;
    },

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
