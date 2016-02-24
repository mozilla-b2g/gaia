/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported SyncTabs */
/* global SyncBrowserDB */
/* global SyncDsHelper */

/*
exampleTabInIndexedDB = {
  "id": "g8RUlXXr9Sur",
  "clientName": "someone's Firefox on someone-MacBook-Pro",
  "tabs": [
    {
      "title": "Mozilla Firefox Web Browser — — Mozilla",
      "urlHistory": [
        "https://www.mozilla.org/en-US/firefox/44.0.2/firstrun/",
        "https://www.mozilla.org/en-US/firefox/44.0.2/firstrun/"
      ],
      "icon": "",
      "lastUsed": 1455612303
    },
    {
      "title": "More protection. The most privacy. Only from Firefox.",
      "urlHistory": [
        "https://www.mozilla.org/en-US/firefox/44.0.2/firstrun/learnmore/"
      ],
      "icon": "",
      "lastUsed": 1455612296
    }
  ]
}
*/

var SyncTabs = (function () {
  var syncDataStore;

  function handleTask(task) {
    return new Promise(resolve => {
      switch(task.operation) {
      case 'update':
      case 'add':
        SyncBrowserDB.updateDeviceTabs(task.data, () => {
          resolve();
        });
        break;
      case 'clear':
        // Ignore clear operation.
        resolve();
        break;
      case 'remove':
        SyncBrowserDB.removeDeviceTabs(task.id, () => {
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
    syncDataStore = new SyncDsHelper('tabs');
    return syncDataStore.init().then(() => {
      return syncDataStore.start(handleTask);
    });
  }

  function stop() {
    if (!syncDataStore) {
      return Promise.reject('Uninitialized DataStore');
    }
    return syncDataStore.stop().then(() => {
      syncDataStore = null;
      return SyncBrowserDB.clearAllDeviceTabs();
    });
  }

  return {
    start: start,
    stop: stop
  };
})();
