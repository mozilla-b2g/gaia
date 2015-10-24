/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported SyncHistory */
/* global SyncBrowserDB */
/* global SyncDsHelper */

/*
exampleHistroyInIndexedDB = {
  "uri": "http://example.com/",
  "title": "Hello World",
  "frecency": 1,
  "iconUri": "http://example.com/favicon.ico",
  "screenshot": {}
}
*/

var SyncHistory = (function () {
  var syncDataStore;

  function handleTask(task) {
    return new Promise(resolve => {
      switch(task.operation) {
      case 'update':
      case 'add':
        var data = {};
        var syncedData = task.data;
        if (syncedData && syncedData.url &&
          Array.isArray(syncedData.visits) && syncedData.visits.length > 0) {
          data.uri = syncedData.url;
          data.title = syncedData.title;
          data.fxsyncId = syncedData.fxsyncId;
          data.timestamp = syncedData.visits[0];
        } else {
          console.warn('Invalid places record:', task);
          resolve();
          return;
        }
        SyncBrowserDB.updateRawHistory(data, () => {
          resolve();
        });
        break;
      case 'clear':
        // Ignore clear operation.
        resolve();
        break;
      case 'remove':
        SyncBrowserDB.removeHistory(task.id, () => {
          resolve();
        });
        break;
      case 'done':
        resolve();
        break;
      }
    });
  }

  function start() {
    if (syncDataStore) {
      return Promise.resolve();
    }
    syncDataStore = new SyncDsHelper('places');
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
