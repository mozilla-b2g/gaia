/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * See ../js/sync-engine/syncengine.js for an explanation of how DataAdapters
 * are used by the SyncEngine.
 *
 * There needs to be one DataAdapter for each collection (history, passwords,
 * bookmarks, tabs). If the user enabled syncing for a specific collection in
 * Settings, the DataAdapter's `update` method will be called each time sync
 * runs. The Kinto collection passed to `update` will contain a local copy of
 * the remote data. It can be queried using its `list` and `get` methods.
 *
 * It is the task of the DataAdapter to compare this data with wherever the
 * corresponding data lives on the device (e.g. the 'places' DataStore for
 * history, the 'bookmarks_store' DataStore for bookmarks, etc.), and to update
 * the device's live data based on the data in the Kinto collection.
 *
 * Subsequently, or at the same time, the DataAdapter should detect when data
 * from the device needs to be added or changed in the Kinto collection, so that
 * the SyncEngine can propagate these changes to the user's Firefox Sync
 * account on the server.
 *
 * Before and after `update` is called, the SyncEngine synchronizes the Kinto
 * collection with the remote server. In both cases, conflicts may occur. If
 * they do, the `handleConflict` method on the DataAdapter is called once for
 * each conflict, and has the opportunity to let the local copy win, let the
 * remote copy win, or return a merged version of the two.
 */

'use strict';

/* exported ExampleAdapter */

var ExampleAdapter = {
  update: function(kintoCollection) {
    kintoCollection.list().then(list => {
      for(var i = 0; i < list.data.length; i++) {
        console.log(`Record ${i}:`, list.data[i].payload);
      }
    });
  },
  handleConflict: function(conflict) {
    console.log('Example adapter handleConflict function called with:',
                conflict.local,
                conflict.remote);
    return conflict.local;
  }
};
