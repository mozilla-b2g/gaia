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
  DataAdapters,
  LazyLoader
*/

const HISTORY_COLLECTION_MTIME = '::collections::history::mtime';
const HISTORY_SYNCTOID_PREFIX = '::synctoid::history::';

var HistoryHelper = (() => {
  var placesStore;
  function _ensureStore() {
    if (placesStore) {
      return Promise.resolve(placesStore);
    }
    return navigator.getDataStores('places').then(stores => {
      placesStore = stores[0];
      return placesStore;
    });
  }

  function setSyncedCollectionMtime(mtime, userid) {
    return new Promise(resolve => {
      asyncStorage.setItem(userid + HISTORY_COLLECTION_MTIME, mtime, resolve);
    });
  }

  function getSyncedCollectionMtime(userid) {
    return new Promise(resolve => {
      asyncStorage.getItem(userid + HISTORY_COLLECTION_MTIME, resolve);
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

  function mergeRecordsToDataStore(localRecord, remoteRecord) {
    if (!localRecord || !remoteRecord ||
        localRecord.url !== remoteRecord.url) {
      // The local record has different url(id) with the new one.
      console.error('Inconsistent records on url', localRecord, remoteRecord);
      throw new Error('Inconsistent records on url');
    }
    if (!localRecord.fxsyncId && typeof remoteRecord.fxsyncId === 'string') {
      /* When a localRecord is existed without fxsyncId, assign fxsyncId to it
         from a remoteRecord. This case always happens at first synchronization
         or merging two records with the same URL. */
      localRecord.fxsyncId = remoteRecord.fxsyncId;
    } else if (localRecord.fxsyncId !== remoteRecord.fxsyncId) {
      // Two records have different fxsyncId but have the same url(id).
      console.log('Inconsistent records on FxSync ID',
        localRecord, remoteRecord);
      throw new Error('Inconsistent records on FxSync ID',
        localRecord, remoteRecord);
    }

    localRecord.visits = localRecord.visits || [];
    // If a localRecord is without any visit records or with older visit
    // than remoteRecord, its title will be replaced by remoteRecord's.
    if ((localRecord.visits.length === 0 && remoteRecord.title) ||
        (remoteRecord.visits[0] >= localRecord.visits[0])) {
      localRecord.title = remoteRecord.title;
    }

    remoteRecord.visits.forEach(item => {
      if (localRecord.visits.indexOf(item) === -1) {
        localRecord.visits.push(item);
      }
    });

    localRecord.visits.sort((a, b) => {
      // sort in descending order
      return b - a;
    });

    return localRecord;
  }

  function addPlace(place, userid) {
    // 1. Get place by url(id of DataStore)
    // 2.A Merge the existing one and new one if it's an existing one,
    //     and update the places.
    // 2.B Add a new record with RevisionId.
    // 3. Add the DataStore record ID into LocalID <-> RemoteID matching table.

    var id = place.url;
    var revisionId;
    return _ensureStore().then(placesStore => {
      revisionId = placesStore.revisionId;
      return placesStore.get(id);
    }).then(existedPlace => {
      // Bug 1208352 - PlacesDS accessing code should be extracted to a shared
      // code to prevent drifting out of sync from different piece codes.
      if (existedPlace) {
        var newPlace = mergeRecordsToDataStore(existedPlace, place);
        return placesStore.put(newPlace, id, revisionId);
      }
      return placesStore.add(place, id, revisionId).then(() => {
        return setDataStoreId(place.fxsyncId, id, userid);
      });
    }).catch(e => {
      console.error(e);
    });
  }

  function updatePlaces(places, userid) {
    return new Promise(resolve => {
      places.reduce((reduced, current) => {
        return reduced.then(() => {
          if (current.url && Array.isArray(current.visits) &&
              current.visits.length === 0) {
            return deleteByDataStoreId(current.url);
          }
          if (current.deleted) {
            return deletePlace(current.fxsyncId, userid);
          }
          return addPlace(current, userid);
        });
      }, Promise.resolve()).then(resolve);
    });
  }

  function deleteByDataStoreId(id) {
    return _ensureStore().then(store => {
      return store.remove(id);
    });
  }

  function deletePlace(fxsyncId, userid) {
    return getDataStoreId(fxsyncId, userid).then(id => {
      if (!id) {
        console.warn('Ignoring incoming tombstone for unknown FxSyncID',
            fxsyncId);
        return Promise.resolve();
      }
      return deleteByDataStoreId(id);
    });
  }

  return {
    mergeRecordsToDataStore: mergeRecordsToDataStore,
    setSyncedCollectionMtime: setSyncedCollectionMtime,
    getSyncedCollectionMtime: getSyncedCollectionMtime,
    updatePlaces: updatePlaces,
    deletePlace: deletePlace
  };
})();

DataAdapters.history = {
/**
    KintoCollection.list() provides a list containing all the remotely retrieved
  Firefox Sync records sorted by "last_modified" property in descending order.
  After each sync request we save the "last_modified" property of the last
  processed record so we avoid going through the same records on following
  operations.

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
  _update(remoteRecords, lastModifiedTime, userid) {
    var places = [];
    for (var i = 0; i < remoteRecords.length; i++) {
      var payload = remoteRecords[i].payload;
      if (!Number.isInteger(remoteRecords[i].last_modified)) {
        console.warn('Incorrect payload::last_modified? ', payload);
        continue;
      }
      if (remoteRecords[i].last_modified <= lastModifiedTime) {
        break;
      }
      if (payload.deleted) {
        places.push({
          deleted: true,
          fxsyncId: payload.id
        });
        continue;
      }
      if (!payload.histUri || !payload.visits) {
        console.warn('Incorrect payload? ', payload);
        continue;
      }

      places.push({
        url: payload.histUri,
        title: payload.title,
        visits: payload.visits.map(elem => Math.floor(elem.date / 1000)),
        fxsyncId: payload.id
      });
    }

    if (places.length === 0) {
      return Promise.resolve(false);
    }
    return HistoryHelper.updatePlaces(places, userid).then(() => {
      var latestMtime = remoteRecords[0].last_modified;
      return HistoryHelper.setSyncedCollectionMtime(latestMtime, userid);
    }).then(() => {
      // Always return false for a read-only operation.
      return Promise.resolve(false);
    });
  },

  update(remoteHistory, options = { readonly: true }) {
    if (!options.readonly) {
      console.warn('Two-way sync not implemented yet for bookmarks.');
    }
    var mtime;
    return LazyLoader.load(['shared/js/async_storage.js'])
    .then(() => {
      return HistoryHelper.getSyncedCollectionMtime(options.userid);
    }).then(_mtime => {
      mtime = _mtime;
      return remoteHistory.list();
    }).then(list => {
      return this._update(list.data, mtime, options.userid);
    });
  },

  handleConflict(conflict) {
    // Because History adapter has not implemented record push yet,
    // handleConflict will always use remote records.
    return Promise.resolve(conflict.remote);
  }
};
