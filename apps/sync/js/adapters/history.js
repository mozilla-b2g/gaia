/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
  History Data Adapter

    The feature of History adapter is to retrieve History records from FxSync
  Service and merge to Places DataStore which has the same functionality, and
  the adapter is based on SyncEngine's design to handle 'update' and
  'handleConflict' request. History Data Adapter provides Read-Only version
  currently, and the basic ideas are included:
  - Traverse all records from History Collection (HC).
  - Add a new or existed place to Places DataStore (PDS).
    - Convert the records from HC to PDS format.
    - Merge a new record and the existed one then write to PDS.
  - Remove an existed place when receiving a "deleted: true" record.
**/

'use strict';

/* global
  asyncStorage,
  ERROR_SYNC_APP_RACE_CONDITION,
  LazyLoader,
  placesModel,
  RegisterDataAdapter
*/

const HISTORY_COLLECTION_MTIME = '::collections::history::mtime';
const HISTORY_LAST_REVISIONID = '::collections::history::revisionid';
const HISTORY_SYNCTOID_PREFIX = '::synctoid::history::';

RegisterDataAdapter('history', (() => {
  /* SyncedCollectionMTime is the time of the last successful sync run.
   * Subsequent sync runs will not check any records from the Kinto collection
   * that have not been modified since then. This value is stored separately for
   * each user (userid uniquely defines the FxSync account we're syncing with).
   */
  function setSyncedCollectionMtime(mtime, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + HISTORY_COLLECTION_MTIME, mtime, resolve);
    });
  }

  function removeSyncedCollectionMtime(userid) {
    return new Promise(resolve => {
      asyncStorage.removeItem(userid + HISTORY_COLLECTION_MTIME, resolve);
    });
  }

  function getSyncedCollectionMtime(userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + HISTORY_COLLECTION_MTIME, resolve);
    });
  }

  /* LastRevisionId is the revisionId the DataStore had at the beginning of the
   * last sync run. Even though there is only one DataStore, it is stored once
   * for each userid, because a sync run only syncs with the FxSync account of
   * the currently logged in user.
   */
  function getLastRevisionId(userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + HISTORY_LAST_REVISIONID, resolve);
    });
  }

  function setLastRevisionId(lastRevisionId, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + HISTORY_LAST_REVISIONID, lastRevisionId,
          resolve);
    });
  }

  function removeLastRevisionId(userid) {
    return new Promise(resolve => {
      asyncStorage.removeItem(userid + HISTORY_LAST_REVISIONID, resolve);
    });
  }

  /*
   * setDataStoreId and getDataStoreId are used to create a table for caching
   * SynctoId to DataStoreId matching. When a `deleted: true` record comes from
   * FxSync, getDataStoreId can help to get DataStoreId easily. So a new record
   * comes, the adapter has to use setDataStoreId to store the ID matching.
   * Since both the synctoId and the dataStoreId for a given URL are unique to
   * the currently logged in user, we store these values prefixed per `userid`
   * (`xClientState` of the currently logged in user).
   */
  function setDataStoreId(synctoId, dataStoreId, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + HISTORY_SYNCTOID_PREFIX + synctoId,
                           dataStoreId,
                           resolve);
    });
  }

  function getDataStoreId(synctoId, userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + HISTORY_SYNCTOID_PREFIX + synctoId,
                           resolve);
    });
  }

  function deletePlace(fxsyncId, userid) {
    return getDataStoreId(fxsyncId, userid).then(id => {
      if (!id) {
        console.warn('Ignoring incoming tombstone for unknown FxSyncID',
            fxsyncId);
        return Promise.resolve();
      }
      return placesModel.deleteByDataStoreId(id);
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
      return placesModel.checkIfClearedSince(lastRevisionId, userid);
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

  function updateRecord(payload, userid) {
    if (payload.deleted) {
      return deletePlace(payload.id, userid);
    }

    if (!payload.histUri || !payload.visits) {
      console.warn('Incorrect payload?', payload);
      return Promise.resolve();
    }

    return LazyLoader.load(['shared/js/places_model.js']).then(() => {
      if (payload.histUri && Array.isArray(payload.visits) &&
          payload.visits.length === 0) {
        return placesModel.deleteByDataStoreId(payload.histUri);
      }

      return placesModel.addPlace({
        url: payload.histUri,
        title: payload.title,
        visits: payload.visits.map(elem => Math.floor(elem.date / 1000)),
        fxsyncId: payload.id
      }, userid).then(() => {
        return setDataStoreId(payload.id, payload.histUri, userid);
      }).catch(e => {
        if (e.name === 'ConstraintError' &&
            e.message === 'RevisionId is not up-to-date') {
          return LazyLoader.load(['shared/js/sync/errors.js']).then(() => {
            throw new Error(ERROR_SYNC_APP_RACE_CONDITION);
          });
        }
        console.error(e);
      });
    });
  }

  function reset(userid) {
    return Promise.all([
      removeSyncedCollectionMtime(userid),
      removeLastRevisionId(userid)
    ]);
  }

  return {
    setSyncedCollectionMtime,
    getSyncedCollectionMtime,
    handleClear,
    updateRecord,
    reset
  };
})());

/**
    History records are stored locally in a DataStore with format [1] while
  history records coming from Firefox Sync (via Kinto collection) have
  format[2]. We need to convert from [1] to [2] and viceversa. Also, we need to
  add the remote record ID[1.1] from the Kinto collection to its corresponding
  match in the local DataStore, so we can remove the local record afterwards
  when any deleting record requests with the format [3] are coming from FxSync.

  [1] Records stored in Places DataStore (PDS): {
    "url": "http://mozilla.org/", // KEY in PDS
    "title": "Mozilla",
    "icons": {
      "http://mozilla.org/favicon.ico": {
        "sizes": []
      }
    },
    "frecency": 1,
    "visits": [
      // NOTICE: date/time without ms
      1442247252490, 1442247250001
    ],
    "screenshot": {},
    "fxsyncId" "REMOTE_ID", // [1.1]
    "visited": 1442247252490
  }

  [2] Add/Update Records from History Collection (HC): {
    "id": "zMgfGkRinh92",
    "sortindex": 2000,
    "last_modified": 1442247272150,
    "payload": {
      "id": "zMgfGkRinh92",
      "histUri": "http://mozilla.org/",
      "title": "Mozilla",
      "visits": [
         // NOTICE: date/time with ms
        { "date": 1442247252490018, "type": 2 },
        { "date": 1442247250001234, "type": 2 }
      ]
    },
    "_status": "synced"
  }

  [3] Delete Records from History Collection (HC): {
    "id": "_Avscjx5srFy",
    "sortindex": 100,
    "last_modified": 1441985077970,
    "payload": {
      "id": "_Avscjx5srFy",
      "deleted": true
    },
    "_status": "synced"
  }
**/
