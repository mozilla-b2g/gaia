/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  LazyLoader,
  SyncEngine,
  SyncCredentials
*/

/* exported
  App
*/

var SYNC_DEBUG = {};

var DataAdapters = {
  // To be filled by js/adapters/*.js
};

var App = {
  loadScripts: function() {
    return new Promise(function(resolve, reject) {
      LazyLoader.load([
        //'js/sync-credentials/iac.js',
        'js/sync-credentials/sync-credentials.js',
        //'js/sync-credentials/sync-credentials-mock.js',

        'js/crypto/stringconversion.js',
        'js/crypto/keyderivation.js',
        'js/crypto/fxsyncwebcrypto.js',

        'js/ext/kinto.dev.js',
        'js/sync-engine/syncengine.js'
      ], resolve);
    });
  },

  init: function() {
    this._syncEngine = null;
    this._adapters = {};
    document.getElementById('sync-button')
      .addEventListener('click', App.sync.bind(App));
  },

  _ensureSyncEngine: function(collectionNames) {
    if (this._syncEngine) {
      return Promise.resolve();
    }
    return this.loadScripts().then(() => {
      return Promise.all(collectionNames.map(collectionName => {
        return LazyLoader.load([`js/adapters/${collectionName}.js`]);
      }));
    }).then(() => {
      return SyncCredentials.getCredentials();
    }).then(credentials => {
      credentials.adapters = DataAdapters;
      console.log('SyncEngine options', credentials);
      this._syncEngine = new SyncEngine(credentials);
      SYNC_DEBUG.syncEngine = this._syncEngine;
    });
  },

  sync: function() {
    var collectionNames = [
      'history'
      //'passwords',
      //'bookmarks',
      //'tabs'
    ];
    console.log('Syncing...');
      return this._ensureSyncEngine(collectionNames).then(() => {
      return this._syncEngine.syncNow(collectionNames);
    }).then(() => {
      console.log('Sync success.');
    }, err => {
      console.error('Sync failure.', err);
    });
  }
};

App.init();
