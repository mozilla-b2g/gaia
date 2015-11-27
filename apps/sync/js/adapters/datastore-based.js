/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 /**
   DataStore-based DataAdapter

   There are a number of functions that all DataAdapters that access a DataStore
   probably have in common:
   * keeping track of the Kinto collection changes and the DataStore changes
   * translating additions, updates, and deletions back and forth

   This class should make it easy to write a DataAdapter that translates between
   a certain FxSync collection and a certain DataStore on the device.
 **/


'use strict';

/* global
  DataAdapters,
  LazyLoader
*/

/* exported RegisterDataAdapter */

function RegisterDataAdapter(collection, helper) {
  DataAdapters[collection] = {
    /**
        KintoCollection.list() provides a list containing all the remotely
      retrieved Firefox Sync records sorted by "last_modified" property in
      descending order.
      After each sync request we save the "last_modified" property of the last
      processed record so we avoid going through the same records on following
      operations.
    **/
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

      return helper.updateRecord(remoteRecords[cursor].payload, userid,
          remoteRecords[cursor].last_modified).then(() => {
        return this._next(remoteRecords, lastModifiedTime, userid, cursor + 1);
      });
    },

    update(kintoCollection, options = { readonly: true }) {
      if (!options.readonly) {
        console.warn('Two-way sync not implemented yet.');
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
        return helper.handleClear(options.userid);
      }).then(() => {
        return helper.getSyncedCollectionMtime(options.userid);
      }).then(_mtime => {
        mtime = _mtime;
        return kintoCollection.list();
      }).then(list => {
        return this._next(list.data, mtime, options.userid, 0).then(() => {
          if (list.data.length === 0) {
            return Promise.resolve();
          }
          var latestMtime = list.data[0].last_modified;
          return helper.setSyncedCollectionMtime(latestMtime,
              options.userid);
        }).then(() => {
          // Always return false for a read-only operation.
          return false;
        });
      }).catch(err => {
        console.error('DataAdapter update error', err.message);
        throw err;
      });
    },

    handleConflict(conflict) {
      // Because current DataAdapters have not implemented record push yet,
      // handleConflict will always use remote records.
      return Promise.resolve(conflict.remote);
    },

    reset(options) {
      return helper.reset(options.userid);
    }
  };
}
