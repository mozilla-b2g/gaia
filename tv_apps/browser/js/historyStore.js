/* globals BrowserDB, SyncBrowserDB, SyncManagerBridge */
'use strict';

(function(exports){

  const INITIAL_HISTORY_COUNT = 21;

  const DAY_IN_MILLI_SECOND = 86400000;

  // TODO: for the live time history data loading task.
  var HistoryStore = {
    isSynced: false,

    cache: new Map(),

    cacheIndexStartAt: 0,

    cacheIndexEndAt: 0,

    lastDataIndex: null,

    currentFolder: null,

    isHandlingCache: false,

    cacheEventQueue: [],

    reset: function (cb) {
      return new Promise(resolve => {
        this.cache.clear();
        this.cacheIndexStartAt = 0;
        this.cacheIndexEndAt = 0;
        this.lastDataIndex = null;
        this.currentFolder = null;
        this.isHandlingCache = false;
        this.cacheEventQueue = [];
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

//IFDEF_FIREFOX_SYNC
    traverseNextCache: function(cacheIndex) {
      return new Promise(resolve => {
        var traverse = () =>{
          var start = this.cache.get(this.cacheIndexStartAt).timestamp;
          SyncBrowserDB.getHistoryTimestamp(start, 'next', false,
            timestamp => {
              if(timestamp) {
                this.updateCacheByNextHistory(timestamp).then(() => {
                  var history = this.cache.get(cacheIndex);
                  if(!history) {
                    traverse();
                  } else {
                    resolve(history);
                  }
                });
              } else {
                resolve(null);
              }
            }
          );
        };

        traverse();
      });
    },
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
    traversePreviousCache: function(cacheIndex) {
      return new Promise(resolve => {
        var traverse = () => {
          var start = this.cache.get(this.cacheIndexEndAt).timestamp;
          SyncBrowserDB.getHistoryTimestamp(start, 'prev', false,
            timestamp => {
              if(timestamp) {
                this.updateCacheByPreviousHistory(timestamp).then(() => {
                  var history = this.cache.get(cacheIndex);
                  if(!history) {
                    traverse();
                  } else {
                    resolve(history);
                  }
                });
              } else {
                this.lastDataIndex = this.cacheIndexEndAt;
                resolve(null);
              }
            }
          );
        };
        traverse();
      });
    },
//ENDIF_FIREFOX_SYNC

    getCache: function(cacheIndex) {
      return new Promise(resolve => {
        var history = null;

//IFNDEF_FIREFOX_SYNC
        if(this.cacheIndexStartAt <= cacheIndex <= this.cacheIndexEndAt) {
          resolve(null);
        } else {
          history = this.cache.get(cacheIndex);
          resolve(history);
        }
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
        if(cacheIndex < this.cacheIndexStartAt) {
          this.traverseNextCache(cacheIndex).then(history => {
            resolve(history);
          });
        } else if (cacheIndex > this.cacheIndexEndAt) {
          if(this.lastDataIndex && cacheIndex > this.lastDataIndex) {
            resolve(history);
          } else {
            this.traversePreviousCache(cacheIndex).then(history => {
              resolve(history);
            });
          }
        } else {
          history = this.cache.get(cacheIndex);
          resolve(history);
        }
//ENDIF_FIREFOX_SYNC

      });
    },

    handleCacheEvent: function() {
      if(!this.isHandlingCache) {
        this.isHandlingCache = true;
        var handler = this.cacheEventQueue.shift();
        handler().then(() => {
          this.isHandlingCache = false;
          if(this.cacheEventQueue.length > 0) {
            this.handleCacheEvent();
          }
        });
      }
    },

    getByIndex: function (index, folderId, cb) {
      var handler = () => new Promise(resolve => {
        if(folderId !== this.currentFolder) {
          this.currentFolder = folderId;
          this.fetchCache().then(() => {
            this.getCache(index).then(history => {
              cb(history);
              resolve();
            });
          });
        } else {
          this.getCache(index).then(history => {
            cb(history);
            resolve();
          });
        }
      });

      this.cacheEventQueue.push(handler);
      this.handleCacheEvent();
    },

    fetchCache: function () {
      this.cache.clear();
      this.cacheIndexStartAt = 0;
      this.cacheIndexEndAt = -1;
      this.lastDataIndex = null;

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
//IFNDEF_FIREFOX_SYNC
        resolve();
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
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
//ENDIF_FIREFOX_SYNC
        }
      });
    },

//IFDEF_FIREFOX_SYNC
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
//ENDIF_FIREFOX_SYNC

//IFDEF_FIREFOX_SYNC
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
