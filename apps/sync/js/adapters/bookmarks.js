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

const BOOKMARKS_COLLECTION_MTIME = 'collections::bookmarks::mtime';
const BOOKMARKS_SYNCTOID_PREFIX = 'SynctoId::bookmarks::';

var BookmarksHelper = (() => {
  var bookmarksStore;
  function _ensureStore() {
    if (bookmarksStore) {
      return Promise.resolve(bookmarksStore);
    }
    return navigator.getDataStores('firefox-sync-bookmarks').then(stores => {
      bookmarksStore = stores[0];
      return bookmarksStore;
    });
  }

  function setSyncedCollectionMtime(mtime) {
    return new Promise(resolve => {
      asyncStorage.setItem(BOOKMARKS_COLLECTION_MTIME, mtime, resolve);
    });
  }

  function getSyncedCollectionMtime() {
    return new Promise(resolve => {
      asyncStorage.getItem(BOOKMARKS_COLLECTION_MTIME, resolve);
    });
  }

  function setDataStoreId(synctoId, dataStoreId) {
    return new Promise(resolve => {
      asyncStorage.setItem(
        BOOKMARKS_SYNCTOID_PREFIX + synctoId, dataStoreId, resolve);
    });
  }

  function getDataStoreId(synctoId) {
    return new Promise(resolve => {
      asyncStorage.getItem(BOOKMARKS_SYNCTOID_PREFIX + synctoId, resolve);
    });
  }

  function mergeRecordsToDataStore(localRecord, remoteRecord) {
    if (!localRecord || !remoteRecord ||
        localRecord.id !== remoteRecord.id ||
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

    localRecord.name = remoteRecord.name;
    localRecord.fxsyncPayload = remoteRecord.fxsyncPayload;

    return localRecord;
  }

  function addPlace(place) {
    // 1. Get place by url(id of DataStore)
    // 2.A Merge the existing one and new one if it's an existing one,
    //     and update the places.
    // 2.B Add a new record with RevisionId.
    // 3. Add the DataStore record ID into LocalID <-> RemoteID matching table.

    var id = place.id;
    var revisionId;
    return _ensureStore().then(bookmarksStore => {
      revisionId = bookmarksStore.revisionId;
      return bookmarksStore.get(id);
    }).then(existedPlace => {
      if (existedPlace) {
        var newPlace = mergeRecordsToDataStore(existedPlace, place);
        return bookmarksStore.put(newPlace, id, revisionId);
      }
      return bookmarksStore.add(place, id, revisionId).then(() => {
        return setDataStoreId(place.fxsyncId, id);
      });
    }).catch(e => {
      console.error(e);
    });
  }

  function updatePlaces(places) {
    return new Promise(resolve => {
      places.reduce((reduced, current) => {
        return reduced.then(() => {
          if (current.deleted) {
            return deletePlace(current.fxsyncId);
          }
          return addPlace(current);
        });
      }, Promise.resolve()).then(resolve);
    });
  }

  function deletePlace(fxsyncId) {
    var url;
    return getDataStoreId(fxsyncId).then(id => {
      url = id;
      return _ensureStore();
    }).then(bookmarksStore => {
      return bookmarksStore.remove(url);
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

DataAdapters.bookmarks = {
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
    "id": "http://mozilla.org/", // KEY in PDS
    "url": "http://mozilla.org/",
    "name": "Mozilla",
    "type": "url",
    "iconable": false,
    "icon": "http://www.lego.com/favicon.ico"
  }

  [2] Add/Update Records from History Collection (HC): {
    "id": "zMgfGkRinh92",
    "sortindex": 2000,
    "last_modified": 1442247272150,
    "payload": {
      "id": "zMgfGkRinh92",
      "type": "bookmark",
      "title": "Mozilla",
      "parentName": "mobile",
      "bmkUri": "http://mozilla.org/",
      "tags": [],
      "keyword": null,
      "description": null,
      "loadInSidebar": false,
      "parentid": "mobile"
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
  _update(remoteRecords, lastModifiedTime) {
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
      if (!payload.bmkUri) {
        console.warn('Incorrect payload? ', payload);
        continue;
      }

      places.push({
        id: payload.bmkUri,
        url: payload.bmkUri,
        name: payload.title,
        type: 'url',
        iconable: false,
        icon: '',
        fxsyncPayload: payload,
        fxsyncId: payload.id
      });
    }

    if (places.length === 0) {
      return Promise.resolve(false);
    }

    return BookmarksHelper.updatePlaces(places).then(() => {
      var latestMtime = remoteRecords[0].last_modified;
      return BookmarksHelper.setSyncedCollectionMtime(latestMtime);
    }).then(() => {
      // Always return false for a read-only operation.
      return Promise.resolve(false);
    });
  },

  update(remoteBookmarks) {
    var mtime;
    return LazyLoader.load(['shared/js/async_storage.js'])
    .then(BookmarksHelper.getSyncedCollectionMtime).then(_mtime => {
      mtime = _mtime;
      return remoteBookmarks.list();
    }).then(list => {
      return this._update(list.data, mtime);
    });
  },

  handleConflict(conflict) {
    // Because History adapter has not implemented record push yet,
    // handleConflict will always use remote records.
    return Promise.resolve(conflict.remote);
  }
};
