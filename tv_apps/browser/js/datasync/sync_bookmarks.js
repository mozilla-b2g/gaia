/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported SyncBookmark */
/* global SyncBrowserDB */
/* global SyncDsHelper */

var SyncBookmark = (function () {
  var syncDataStore;

  function handleTask(task) {
    return new Promise(resolve => {
      var data, recordIds;
      if (task.data && task.data.fxsyncRecords) {
        recordIds = Object.keys(task.data.fxsyncRecords);
        if (!recordIds.length) {
          console.error('Bookmark should have at least one FxSync record');
        }
        if (recordIds.length > 1) {
          console.warn(`TODO: Import duplicate bookmarks for ${task.data.id}`);
        }
        data = task.data.fxsyncRecords[recordIds[0]].payload;
        data.timestamp = task.data.fxsyncRecords[recordIds[0]].last_modified;
      }
      switch(task.operation) {
      case 'update':
        SyncBrowserDB.updateBookmark(data, () => {
          resolve();
        });
        break;
      case 'add':
        SyncBrowserDB.addBookmark(data, () => {
          resolve();
        });
        break;
      case 'clear':
        // Ignore clear operation.
        resolve();
        break;
      case 'remove':
        getBookmarkByDsId(task.id, bookmark => {
          if (bookmark) {
            SyncBrowserDB.removeBookmark(bookmark.id, () => {
              resolve();
            });
          }
        });
        break;
      case 'done':
        resolve();
        break;
      }
    });
  }

  function getBookmarkByDsId(dsid, callback) {
    SyncBrowserDB.getBookmark({bmkUri: dsid}, bookmark => {
      if (bookmark) {
        callback(bookmark);
      } else {
        var specialType =
          ['query', 'microsummary', 'folder', 'livemark', 'separator'];
        var isSpecialType = specialType.some(value => {
          return dsid.indexOf(value + '|') === 0;
        });
        var tmp = dsid.split('|');
        if (isSpecialType && tmp.length === 2) {
          var fxSyncId = tmp[1];
          SyncBrowserDB.getBookmark(fxSyncId, callback);
        } else {
          callback(null);
        }
      }
    });
  }

  function init() {
    syncDataStore = new SyncDsHelper('bookmarks_store');
    return syncDataStore.init();
  }

  function start() {
    if (!syncDataStore) {
      return Promise.reject('Uninitialized DataStore');
    }
    syncDataStore.registerStoreChangeEvent(() => {
      syncDataStore.dataStoreSync(handleTask);
    });
    return syncDataStore.dataStoreSync(handleTask);
  }

  function stop() {
    if (!syncDataStore) {
      return Promise.reject('Uninitialized DataStore');
    }
    syncDataStore.unregisterStoreChangeEvent();
    return Promise.resolve();
  }

  return {
    init: init,
    start: start,
    stop: stop
  };
})();
