/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module acts as a bridge between the browser UI and the Sync manager
 * that lives in the System application.
 *
 * It allows consumers to subscribe to updates done in the Sync state machine
 * so they can update the UI accordingly.
 *
 * The simple high level picture of Sync in the browser is:
 *
 * settings.js                         toolbar.js
 *     |                                  |
 *     |                                  |
 *      \______ manager_bridge.js _______/
 *                     |
 *                     | IAC
 *                     |
 *         smart_system/sync_manager.js
 *
 */

/* global LazyLoader */
/* global SyncBookmark */
/* global SyncHistory */

'use strict';

(function(exports) {

  const DEBUG = false;
  function debug() {
    if (DEBUG) {
      console.log('[SyncManagerBridge] ' + Array.slice(arguments).concat());
    }
  }

  var SyncManagerBridge = {
    _port: null,
    _requests: new Map(),
    _listeners: new Map(),

    addListener(listener) {
      debug('addListener', listener);
      if (!this._listeners.has(listener)) {
        this._listeners.set(listener);
      }
    },

    removeListener(listener) {
      debug('removeListener', listener);
      if (!this._listeners.has(listener)) {
        return;
      }
      this._listeners.delete(listener);
    },

    connect() {
      if (this._port) {
        return Promise.resolve(this._port);
      }

      return new Promise((resolve, reject) => {
        navigator.mozApps.getSelf().onsuccess = event => {
          var app = event.target.result;
          app.connect('gaia-sync-management').then(ports => {
            if (!ports || !ports.length) {
              return reject();
            }
            this._port = ports[0];
            this._port.onmessage = this.onmessage.bind(this);
            resolve(this._port);
          }).catch(reject);
        };
      });
    },

    iacRequest(request) {
      debug('iacRequest', JSON.stringify(request));
      return new Promise(resolve => {
        this.connect().then(port => {
          if (request.id) {
            this._requests.set(request.id, resolve);
          }
          port.postMessage(request);
        });
      });
    },

    onmessage(event) {
      var self = this;
      function notify() {
        if (self._listeners.size) {
          Array.from(self._listeners.keys()).forEach(listener => {
            listener(message);
          });
        }
      }

      var message = event.data;
      if (!message) {
        return;
      }

      debug('message', JSON.stringify(message));

      if (message.id && this._requests.has(message.id)) {
        this._requests.get(message.id)(message);
        this._requests.delete(message.id);
        return;
      }

      if (message.name !== 'onsyncchange') {
        return;
      }

      if (message.state == 'disabled' ||
          message.state == 'enabled') {
        LazyLoader.load([
          'js/sync/ds_helper.js',
          'js/sync/bookmarks.js',
          'js/sync/history.js'
        ]).then(() => {
          var method = message.state == 'enabled' ? 'start'
                                                  : 'stop';
          Promise.all([
            SyncBookmark[method](),
            SyncHistory[method]()
          ]).catch(error => {
            console.warn(error);
          });

          notify();
        });
        return;
      }

      notify();
    },

    getInfo() {
      return this.iacRequest({
        name: 'getInfo',
        id: Date.now()
      });
    }
  };

  ['enable',
   'disable',
   'sync'].forEach(requestName => {
     SyncManagerBridge[requestName] = () => {
       return SyncManagerBridge.iacRequest({
         name: requestName
       });
     };
  });

  exports.SyncManagerBridge = SyncManagerBridge;

}(window));
