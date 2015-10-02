/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
  Bookmarks Data Adapter

    The purpose of the Bookmarks adapter is to retrieve bookmark records from
  Firefox Sync and merge them in a local bookmarks DataStore
  ('sync_bookmarks_store') which will be hosting Firefox Sync records only.
  This adapter implements the API defined by SyncEngine. For now the
  implementation allows only to retrieve bookmarks from Sync but it is not ready
  for pushing any changes. The high level algorithm implemented here is the
  following:
  - Traverse all the records coming from Firefox Sync and stored locally
    in Kinto.
  - Convert any new bookmark from the Firefox Sync format to the
    'sync_bookmarks_store' DataStore one.
  - For existing bookmarks merge the remote with the local bookmark after
    converting them to the proper 'sync_bookmarks_store' DS format.
  - Remove any existing bookmark that has been remotely deleted (these records
    come with a 'deleted: true' property).
**/

'use strict';

/* global
  asyncStorage,
  DataAdapters,
  LazyLoader
*/

const BOOKMARKS_COLLECTION_MTIME = 'collections::bookmarks::mtime';
const BOOKMARKS_SYNCTOID_PREFIX = 'synctoid::bookmarks::';

var BookmarksHelper = (() => {
  var store;
  function _ensureStore() {
    if (store) {
      return Promise.resolve(store);
    }
    return navigator.getDataStores('sync_bookmarks_store').then(stores => {
      store = stores[0];
      return store;
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

  /*
      setDataStoreId and getDataStoreId are used to create a table for caching
    SynctoId to DataStoreId matching. When a delete: true record comes from
    FxSync, getDataStoreId can help to get DataStoreId easily. So a new record
    comes, the adapter has to use setDataStoreId to store the ID matching.
    Due to this common requirement, bug 1207468 will have an improvement for
    this case.
  */
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
        (remoteRecord.type === 'url' && localRecord.url !== remoteRecord.url)) {
      // Local and remote records have different url(id).
      console.error('Inconsistent records', localRecord, remoteRecord);
      throw new Error('Inconsistent records');
    }
    if (!localRecord.fxsyncId && typeof remoteRecord.fxsyncId === 'string') {
      /* When a localRecord has no fxsyncId, assign fxsyncId to it from a
         remoteRecord. This case always happens at first synchronization or
         merging two records with the same URL. */
      localRecord.fxsyncId = remoteRecord.fxsyncId;
    } else if (localRecord.fxsyncId !== remoteRecord.fxsyncId) {
      // Two records have different fxsyncId but have the same url(id).
      console.log('Records should have the same Firefox Sync ID',
        localRecord, remoteRecord);
      throw new Error('Records should have the same Firefox Sync ID',
        localRecord, remoteRecord);
    }

    localRecord.name = remoteRecord.name;
    localRecord.fxsyncPayload = remoteRecord.fxsyncPayload;

    return localRecord;
  }

  function addBookmark(remoteRecord) {
    // 1. Get bookmark by url(id of DataStore)
    // 2.A. If the bookmark already exists locally,
    //     we merge it with the remote one.
    // 2.B Add a new record with RevisionId.
    // 3. Add the DataStore record ID into LocalID <-> RemoteID matching table.

    var id = remoteRecord.id;
    var revisionId;
    return _ensureStore().then(store => {
      revisionId = store.revisionId;
      return store.get(id);
    }).then(localRecord => {
      if (localRecord) {
        var newBookmark = mergeRecordsToDataStore(localRecord, remoteRecord);
        return store.put(newBookmark, id, revisionId);
      }
      return store.add(remoteRecord, id, revisionId).then(() => {
        return setDataStoreId(remoteRecord.fxsyncId, id);
      });
    }).catch(e => {
      console.error(e);
    });
  }

  function updateBookmarks(records) {
    return new Promise(resolve => {
      records.reduce((reduced, current) => {
        return reduced.then(() => {
          if (current.deleted) {
            return deleteBookmark(current.fxsyncId);
          }
          return addBookmark(current);
        });
      }, Promise.resolve()).then(resolve);
    });
  }

  function deleteBookmark(fxsyncId) {
    var url;
    return getDataStoreId(fxsyncId).then(id => {
      if (!id) {
        console.warn('No DataStore ID corresponded to FxSyncID', fxsyncId);
      }
      url = id;
      return _ensureStore();
    }).then(store => {
      return store.remove(url);
    });
  }

  return {
    mergeRecordsToDataStore: mergeRecordsToDataStore,
    setSyncedCollectionMtime: setSyncedCollectionMtime,
    getSyncedCollectionMtime: getSyncedCollectionMtime,
    updateBookmarks: updateBookmarks,
    deleteBookmark: deleteBookmark
  };
})();

DataAdapters.bookmarks = {
/**
    KintoCollection.list() provides a list containing all the remotely retrieved
  Firefox Sync records sorted by "last_modified" property in descending order.
  After each sync request we save the "last_modified" property of the last
  processed record so we avoid going through the same records on following
  operations.

    Bookmark records are stored locally in a DataStore with format [1] while
  bookmark records coming from Firefox Sync (via Kinto collection) have
  format[2]. [4] is the detailed information for 6 different types defined in
  FxSync BC. We need to convert from [1] to [2] and viceversa. Also, we need to
  add the remote record ID[1.1] from the Kinto collection to its corresponding
  match in the local DataStore, so we can remove the local record afterwards
  when any deleting record requests with the format [3] are coming from FxSync.

  [1] Records stored in Bookmarks DataStore (BDS): {
    "id": "http://mozilla.org/", // KEY in PDS
    "url": "http://mozilla.org/",
    "name": "Mozilla",
    "type": "url",
    "iconable": false,
    "icon": "http://www.lego.com/favicon.ico",
    "fxsyncPayload": Object, // payload from BC
    "fxsyncId": "REMOTE_ID" // [1.1]
  }

  [2] Add/Update Records from Bookmark Collection (BC): {
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

  [3] Delete Records from Bookmark Collection (BC): {
    "id": "_Avscjx5srFy",
    "sortindex": 100,
    "last_modified": 1441985077970,
    "payload": {
      "id": "_Avscjx5srFy",
      "deleted": true
    },
    "_status": "synced"
  }

  [4] The schema table for 6 different types from [5]:
  +---------------+---------------+---------------+
  |   bookmark    | microsummary**|     query     |
  +---------------+---------------+---------------+
  |               | *generatorUri | *folderName   |
  |               | *staticTitle  | *queryId      |
  | title         | title         | title         |
  | bmkUri        | bmkUri        | bmkUri        |
  | description   | description   | description   |
  | loadInSidebar | loadInSidebar | loadInSidebar |
  | tags          | tags          | tags          |
  | keyword       | keyword       | keyword       |
  | parentid      | parentid      | parentid      |
  | parentName    | parentName    | parentName    |
  | predecessorid | predecessorid | predecessorid |
  | type          | type          | type          |
  +---------------+---------------+---------------+

  +---------------+---------------+---------------+
  | folder        | livemark      | separator     |
  +---------------+---------------+---------------+
  |               | *siteUri      | *pos          |
  |               | *feedUri      |               |
  | title         | title         |               |
  | parentid      | parentid      | parentid      |
  | parentName    | parentName    | parentName    |
  | predecessorid | predecessorid | predecessorid |
  | type          | type          | type          |
  +---------------+---------------+---------------+

  [*] Special property for its type.
  [**] microsummary is OBSOLETED. Please see here:
       https://wiki.mozilla.org/Microsummaries

  [5] https://docs.services.mozilla.com/sync/objectformats.html#bookmarks

**/
  _update(remoteRecords, lastModifiedTime) {
    var bookmarks = [];
    for (var i = 0; i < remoteRecords.length; i++) {
      var payload = remoteRecords[i].payload;
      if (payload.type === 'microsummary') {
        console.warn('microsummary is OBSOLETED ', payload);
        continue;
      }
      if (['query', 'bookmark', 'folder', 'livemark', 'separator']
          .every(value => value !== payload.type)) {
        console.error('Unknown type? ', payload);
        continue;
      }
      if (!Number.isInteger(remoteRecords[i].last_modified)) {
        console.warn('Incorrect payload::last_modified? ', payload);
        continue;
      }
      if (remoteRecords[i].last_modified <= lastModifiedTime) {
        break;
      }
      if (payload.deleted) {
        bookmarks.push({
          deleted: true,
          fxsyncId: payload.id
        });
        continue;
      }
      var typeWithUri = ['query', 'bookmark']
          .some(value => value === payload.type);
      if (typeWithUri && !payload.bmkUri) {
        console.warn('Incorrect payload? ', payload);
        continue;
      }
      bookmarks.push({
        // URL is the ID for bookmark records in bookmarks_store, but there are
        // some types without a valid URL except bookmark type. URL is used as
        // its ID to compatible bookmarks_store for bookmark type record.
        // The combination of type and fxsyncID is used as its ID for the types
        // except bookmark.
        id: payload.type === 'bookmark' ? payload.bmkUri :
          (payload.type + '|' + payload.id),
        url: payload.bmkUri,
        name: payload.title,
        type: payload.type === 'bookmark' ? 'url' : 'others',
        iconable: false,
        icon: '',
        fxsyncPayload: payload,
        fxsyncId: payload.id
      });
    }

    if (bookmarks.length === 0) {
      return Promise.resolve(false /* no writes done into kinto */);
    }

    return BookmarksHelper.updateBookmarks(bookmarks).then(() => {
      var latestMtime = remoteRecords[0].last_modified;
      return BookmarksHelper.setSyncedCollectionMtime(latestMtime);
    }).then(() => {
      // Always return false for a read-only operation.
      return Promise.resolve(false /* no writes done into kinto */);
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
    // Because Bookmark adapter has not implemented record push yet,
    // handleConflict will always use remote records.
    return Promise.resolve(conflict.remote);
  }
};
