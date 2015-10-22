/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported SyncBookmark */
/* global SyncBrowserDB */
/* global SyncDsHelper */

var SyncBookmark = (function () {
  var syncDataStore;

  function updateWrapper(data) {
    return new Promise(resolve => {
      if (data.deleted) {
        SyncBrowserDB.removeBookmark(data.id, () => {
          resolve();
        });
      } else {
        SyncBrowserDB.updateRawBookmark(data, () => {
          resolve();
        });
      }
    });
  }

  function handleTask(task) {
    return new Promise((resolve, reject) => {
      var data = [];
      if (task.data && task.data.fxsyncRecords) {
        for (var key in task.data.fxsyncRecords) {
          data.push(task.data.fxsyncRecords[key]);
        }
      }
      switch(task.operation) {
      case 'update':
      case 'add':
        Promise.all(data.map(updateWrapper)).then(resolve);
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
          var fxsyncId = tmp[1];
          SyncBrowserDB.getBookmark(fxsyncId, callback);
        } else {
          console.warn('trying to delete a unknown type?', dsid);
          callback(null);
        }
      }
    });
  }

  function start() {
    if (syncDataStore) {
      return Promise.resolve();
    }
    syncDataStore = new SyncDsHelper('bookmarks_store');
    return syncDataStore.init().then(() => {
      syncDataStore.registerStoreChangeEvent(() => {
        syncDataStore.dataStoreSync(handleTask);
      });
      return syncDataStore.dataStoreSync(handleTask);
    });
  }

  function stop() {
    if (!syncDataStore) {
      return Promise.reject('Uninitialized DataStore');
    }
    return syncDataStore.unregisterStoreChangeEvent();
  }

  return {
    start: start,
    stop: stop
  };
})();
