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
      var data = {};
      if (task.data) {
        data.uri = task.data.url;
        data.title = task.data.title;
        data.fxsyncId = task.data.fxsyncId;
        data.timestamp = task.data.visited;
      }
      switch(task.operation) {
      case 'update':
      case 'add':
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

  function init() {
    syncDataStore = new SyncDsHelper('places');
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
