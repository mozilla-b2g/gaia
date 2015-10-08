/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* exported SyncDsHelper */
/* global localStorage */

var SyncDsHelper = function (dataStoreName) {
  if (typeof dataStoreName !== 'string') {
    throw new Event('Incorrect DataStore name.');
  }
  this.dataStoreName = dataStoreName;
  this.dataStoreRevId = dataStoreName + '::revId';
};

SyncDsHelper.prototype = {
  store: null,
  dataChangeHandler: null,

  init() {
    return this._ensureStore();
  },

  _ensureStore() {
    if (this.store) {
      return Promise.resolve(this.store);
    }
    return navigator.getDataStores(this.dataStoreName).then(stores => {
      this.store = stores[0];
      return this.store;
    });
  },

  setSyncedRevId(revId) {
    localStorage.setItem(this.dataStoreRevId, revId);
  },

  getSyncedRevId() {
    return localStorage.getItem(this.dataStoreRevId);
  },

  registerStoreChangeEvent(handler) {
    this._ensureStore().then(() => {
      if (!this.dataChangeHandler) {
        this.store.removeEventListener('change', this.dataChangeHandler);
      }
      this.dataChangeHandler = handler;
      this.store.addEventListener('change', this.dataChangeHandler);
    });
  },

  unregisterStoreChangeEvent() {
    this._ensureStore().then(() => {
      this.store.removeEventListener('change', this.dataChangeHandler);
      this.dataChangeHandler = null;
    });
  },

  dataStoreSync(handle) {
    return this._ensureStore().then(() => {
      var _revId = this.getSyncedRevId();
      return new Promise((resolve, reject) => {
        var runNextTask = (cursor) => {
          cursor.next().then(task => {
            manageTask(cursor, task);
          });
        };

        var post = (cursor, task) => {
          if (task.operation === 'done') {
            this.setSyncedRevId(this.store.revisionId);
            resolve();
            return;
          }
          runNextTask(cursor);
        };

        var manageTask = (cursor, task) => {
          if (handle) {
            handle(task).then(() => post(cursor, task));
          } else {
            post(cursor, task);
          }
        };

        runNextTask(this.store.sync(_revId));
      });
    });
  }
};

