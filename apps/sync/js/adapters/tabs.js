/*
Copyright 2015, Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
  Tabs Data Adapter

    The feature of Tabs adapter is to retrieve Tab records from FxSync
  Service and merge to Tabs DataStore which has the same functionality, and
  the adapter is based on SyncEngine's design to handle 'update' and
  'handleConflict' request. Tabs Data Adapter provides Read-Only version
  currently, and the basic ideas are included:
  - Traverse all records from Tabs Collection (TC).
  - Add a new or existed tab to Tabs DataStore (TDS).
    - Convert the records from TC to TDS format.
    - Merge a new record and the existed one then write to TDS.
**/

'use strict';

/* global
  asyncStorage,
  DataAdapters,
  ERROR_SYNC_APP_RACE_CONDITION,
  LazyLoader
*/

const TABS_COLLECTION_MTIME = '::collections::tabs::mtime';
const TABS_LAST_REVISIONID = '::collections::tabs::revisionid';

var TabsHelper = (() => {
  var _store;
  function _ensureStore() {
    if (_store) {
      return Promise.resolve(_store);
    }
    return navigator.getDataStores('tabs').then(stores => {
      _store = stores[0];
      return _store;
    });
  }

  /* SyncedCollectionMTime is the time of the last successful sync run.
   * Subsequent sync runs will not check any records from the Kinto collection
   * that have not been modified since then. This value is stored separately for
   * each user (userid uniquely defines the FxSync account we're syncing with).
   */
  function setSyncedCollectionMtime(mtime, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + TABS_COLLECTION_MTIME, mtime, resolve);
    });
  }

  function removeSyncedCollectionMtime(userid) {
    return new Promise(resolve => {
      asyncStorage.removeItem(userid + TABS_COLLECTION_MTIME, resolve);
    });
  }

  function getSyncedCollectionMtime(userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + TABS_COLLECTION_MTIME, resolve);
    });
  }

  /* LastRevisionId is the revisionId the DataStore had at the beginning of the
   * last sync run. Even though there is only one DataStore, it is stored once
   * for each userid, because a sync run only syncs with the FxSync account of
   * the currently logged in user.
   */
  function getLastRevisionId(userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + TABS_LAST_REVISIONID, resolve);
    });
  }

  function setLastRevisionId(lastRevisionId, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + TABS_LAST_REVISIONID, lastRevisionId,
          resolve);
    });
  }

  function removeLastRevisionId(userid) {
    return new Promise(resolve => {
      asyncStorage.removeItem(userid + TABS_LAST_REVISIONID, resolve);
    });
  }

  function mergeRecordsToDataStore(localRecord, remoteRecord) {
    if (!localRecord.id || !remoteRecord.id ||
      typeof remoteRecord.id !== 'string' ||
      localRecord.id !== remoteRecord.id) {
      // The local record has different id with the new one.
      console.error('Inconsistent records on id', localRecord, remoteRecord);
      throw new Error('Inconsistent records on id');
    }

    if (!remoteRecord.clientName ||
      typeof remoteRecord.clientName !== 'string') {
      console.error('Incorrect clientName of remote record', remoteRecord);
      throw new Error('Incorrect clientName of remote record');
    }

    // We remember if a record had already been created locally before we got
    // remote data for that URL, so that we know not to remove it even when the
    // remote data is deleted. This applies only to readonly sync, and will be
    // removed when sync becomes read-write.
    if (localRecord.createdLocally === undefined) {
      localRecord.createdLocally = true;
    }

    // Remote-win strategy is applied here because the schema from FxSync is
    // identical to local DataStore.
    localRecord = remoteRecord;

    return localRecord;
  }

  function addTab(tab, userid) {
    // 1. Get tab by fxsync id
    // 2.A Merge the existing one and new one if it's an existing one,
    //     and update the tab.
    // 2.B Add a new record with RevisionId.
    // 3. Add the DataStore record ID into LocalID <-> RemoteID matching table.

    var id = tab.id;
    var revisionId;
    return _ensureStore().then(tabsStore => {
      revisionId = tabsStore.revisionId;
      return tabsStore.get(id).then(existedTab => {
        if (existedTab) {
          var newTab = mergeRecordsToDataStore(existedTab, tab);
          return tabsStore.put(newTab, id, revisionId);
        }
        // Setting createdLocally to false will cause the record to be deleted
        // again if it's deleted remotely. This applies only to readonly sync,
        // and will be removed when sync becomes read-write.
        tab.createdLocally = false;
        return tabsStore.add(tab, id, revisionId);
      });
    }).catch(e => {
      if (e.name === 'ConstraintError' &&
          e.message === 'RevisionId is not up-to-date') {
        return LazyLoader.load(['shared/js/sync/errors.js']).then(() => {
          throw new Error(ERROR_SYNC_APP_RACE_CONDITION);
        });
      }
      console.error(e);
    });
  }

  function checkIfClearedSince(lastRevisionId, userid) {
    return _ensureStore().then(store => {
      if (lastRevisionId === null) {
        var cursor = store.sync();
        // Skip first task which is always { id: null, operation: 'clear' }
        cursor.next().then(() => {
          return cursor;
        });
      }
      return store.sync(lastRevisionId);
    }).then(cursor => {
      var wasCleared = false;
      return new Promise(resolve => {
        function runNextTask(cursor) {
          cursor.next().then(task => {
            if (task.operation === 'done') {
              resolve({
                newRevisionId: task.revisionId,
                wasCleared
              });
            } else {
              // In readonly mode, if the DataStore was cleared, or some records
              // were removed, it's possible that previously imported data was
              // lost. Therefore, we return wasCleared: true after playing the
              // DataStore history to its current revisionId, so that
              // removeSyncedCollectionMtime will be called, and a full
              // re-import is triggered.
              // If only one record was removed then it would not be necessary
              // to re-import the whole Kinto collection, but right now we have
              // no efficient way to retrieve just one record from the Kinto
              // collection based on URL, because we don't have a mapping from
              // URL to fxsyncId. Since readonly sync is idempotent, there is
              // not much harm in this, but it could possibly be made more
              // efficient, see
              // https://bugzilla.mozilla.org/show_bug.cgi?id=1223418.
              if (['clear', 'remove'].indexOf(task.operation) !== -1) {
                wasCleared = true;
              }
              // Avoid stack overflow:
              setTimeout(() => {
                // Will eventually get to a 'done' task:
                runNextTask(cursor);
              });
            }
          });
        }
        runNextTask(cursor);
      });
    });
  }

  /*
   * handleClear - trigger re-import if DataStore was cleared
   *
   * In the future, the bookmarks and history DataAdapters will support
   * two-way sync, so they will not only import data from the kinto.js
   * collection into the DataStore, but also check what changes have
   * been made recently in the DataStore, and reflect these in the kinto.js
   * collection. Until then, the only thing we check from the DataStore is
   * whether it has been cleared. If a `clear` operation was executed on the
   * DataStore since the last time we checked (`lastRevisionId`), then the
   * lastModifiedTime of the kinto.js collection is removed from asyncStorage,
   * triggering a full import.
   */
  function handleClear(userid) {
    var newRevisionId;
    return getLastRevisionId(userid).then(lastRevisionId => {
      return checkIfClearedSince(lastRevisionId, userid);
    }).then(result => {
      newRevisionId = result.newRevisionId;
      if(result.wasCleared) {
        // Removing this from asyncStorage will trigger a full re-import.
        return removeSyncedCollectionMtime(userid);
      }
      return Promise.resolve();
    }).then(() => {
      return setLastRevisionId(newRevisionId, userid);
    });
  }

  function reset(userid) {
    return Promise.all([
      removeSyncedCollectionMtime(userid),
      removeLastRevisionId(userid)
    ]);
  }

  return {
    mergeRecordsToDataStore,
    setSyncedCollectionMtime,
    getSyncedCollectionMtime,
    addTab,
    handleClear,
    reset
  };
})();

DataAdapters.tabs = {
/**
    KintoCollection.list() provides a list containing all the remotely retrieved
  Firefox Sync records sorted by "last_modified" property in descending order.
  After each sync request we save the "last_modified" property of the last
  processed record so we avoid going through the same records on following
  operations.

    Tab records are stored locally in a DataStore with format [1] while
  tab records coming from Firefox Sync (via Kinto collection) have
  format[2]. The payload in [2] can be recongise as [1].

  [1] Records stored in Tabs DataStore (TDS): {
    "id": "g8RUlXXr9Sur",
     "last_modified": 1455612348560,
     "payload": {
       "id": "g8RUlXXr9Sur", // As ID for DataStore
       "clientName": "someone's Firefox on someone-MacBook-Pro",
       "tabs": [
         {
           "title": "GitHub · Where software is built",
           "urlHistory": [
             "https://github.com/"
           ],
           "icon": "",
           "lastUsed": 1455612346
         },
         {
           "title": "Mozilla Firefox Web Browser — — Mozilla",
           "urlHistory": [
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
  }

  [2] Add/Update Records from Tab Collection (TC): {
    "id": "g8RUlXXr9Sur",
    "last_modified": 1455612348560,
    "payload": {
      Object... // The same content with [1].
    },
    "_status": "synced"
  }
**/

  _updateDeviceTabsList(payload, last_modified, userid) {
    if (!payload.clientName || typeof payload.clientName !== 'string' ||
        !payload.id || typeof payload.id !== 'string' ||
        !payload.tabs || !Array.isArray(payload.tabs)) {
      console.warn('Incorrect payload?', payload);
      return Promise.resolve();
    }

    var record = payload;
    record.timestamp = last_modified;

    return TabsHelper.addTab(record, userid);
  },

  _next(remoteRecords, lastModifiedTime, userid, cursor) {
    if (cursor === remoteRecords.length) {
      return Promise.resolve();
    }
    if (!Number.isInteger(remoteRecords[cursor].last_modified)) {
      console.warn('Incorrect last_modified?', remoteRecords[cursor]);
      return this._next(remoteRecords, lastModifiedTime, userid, cursor + 1);
    }
    if (remoteRecords[cursor].last_modified <= lastModifiedTime) {
      return Promise.resolve();
    }

    return this._updateDeviceTabsList(remoteRecords[cursor].payload,
        remoteRecords[cursor].last_modified, userid).then(() => {
      return this._next(remoteRecords, lastModifiedTime, userid, cursor + 1);
    });
  },

  update(remoteTab, options = { readonly: true }) {
    if (!options.readonly) {
      console.warn('Two-way sync not implemented yet for tabs.');
    }
    var mtime;
    return LazyLoader.load(['shared/js/async_storage.js']).then(() => {
      // We iterate over the records in the Kinto collection until we find a
      // record whose last modified time is older than the time of the last
      // successful sync run. However, if the DataStore has been cleared, or
      // records have been removed from the DataStore since the last sync run,
      // we cannot be sure that all older records are still there. So in both
      // those cases we remove the SyncedCollectionMtime from AsyncStorage, so
      // that this sync run will iterate over all the records in the Kinto
      // collection, and not only over the ones that were recently modified.
      return TabsHelper.handleClear(options.userid);
    }).then(() => {
      return TabsHelper.getSyncedCollectionMtime(options.userid);
    }).then(_mtime => {
      mtime = _mtime;
      return remoteTab.list();
    }).then(list => {
      return this._next(list.data, mtime, options.userid, 0).then(() => {
        if (list.data.length === 0) {
          return Promise.resolve();
        }
        var latestMtime = list.data[0].last_modified;
        return TabsHelper.setSyncedCollectionMtime(latestMtime,
            options.userid);
      }).then(() => {
       // Always return false for a read-only operation.
       return Promise.resolve(false);
     });
    }).catch(err => {
      console.error('Tab DataAdapter update error', err.message);
      throw err;
    });
  },

  handleConflict(conflict) {
    // Because Tab adapter has not implemented record push yet,
    // handleConflict will always use remote records.
    return Promise.resolve(conflict.remote);
  },

  reset(options) {
    return LazyLoader.load(['shared/js/async_storage.js']).then(() => {
      return TabsHelper.reset(options.userid);
    });
  }
};
