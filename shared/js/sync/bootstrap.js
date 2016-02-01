/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  DUMP,
  ERROR_SYNC_APP_SYNC_IN_PROGRESS,
  ERROR_SYNC_INVALID_REQUEST_OPTIONS,
  IACHandler,
  LazyLoader,
  SyncEngine
*/

/* exported
  Bootstrap,
  DataAdapters
*/

var DataAdapters = {
  // To be filled by js/adapters/*.js
};

if (!window.DUMP) {
  window.DUMP = () => {};
}

const DEBUG = (msg, args) => {
  DUMP(`[Sync] ${msg}`, args);
};

const Bootstrap = (() => {
  var running = false;

  const loadMainScripts = () => {
    return LazyLoader.load([
      'shared/js/sync/crypto/stringconversion.js',
      'shared/js/sync/crypto/keyderivation.js',
      'shared/js/sync/crypto/fxsyncwebcrypto.js',

      'shared/js/sync/ext/kinto.min.js',
      'shared/js/sync/engine.js'
    ]);
  };

  const loadDataAdapterScript = (collectionName) => {
    return LazyLoader.load(`js/adapters/${collectionName}.js`);
  };

  const loadErrorConstants = () => {
    return LazyLoader.load('shared/js/sync/errors.js');
  };

  /**
    * @param request {Object} Should contain the following fields:
    *                         * URL {String} Like 'http://localhost:8000/v1/'.
    *                         * assertion {String} A BrowserID assertion.
    *                         * keys {Object} Like `{ kA: 'foo', kB: 'bar' }`.
    *                         * collections {Object} Like `{ history: {} }`.
    */
  const handleSyncRequest = (request) => {
    if ((typeof request !== 'object') ||
        (typeof request.URL !== 'string') ||
        (typeof request.assertion !== 'string') ||
        (typeof request.keys !== 'object') ||
        (typeof request.keys.kB !== 'string') ||
        (typeof request.collections !== 'object')) {
      return loadErrorConstants().then(() => {
        throw new Error(ERROR_SYNC_INVALID_REQUEST_OPTIONS);
      });
    }

    if (running) {
      return loadErrorConstants().then(() => {
        throw new Error(ERROR_SYNC_APP_SYNC_IN_PROGRESS);
      });
    }

    running = true;
    return loadMainScripts().then(() => {
      const collectionNames = Object.keys(request.collections);
      return Promise.all(collectionNames.map(collectionName => {
        return loadDataAdapterScript(collectionName);
      }));
    }).then(() => {
      var syncEngine = new SyncEngine({
        kB: request.keys.kB,
        URL: request.URL,
        assertion: request.assertion,
        adapters: DataAdapters
      });

      return syncEngine.syncNow(request.collections);
    }).then(() => {
      running = false;
    }).catch(err => {
      running = false;
      throw err;
    });
  };

  const sendPortMessage = message => {
    var port = IACHandler.getPort('gaia::sync::request', this);
    if (port) {
      DEBUG('Port message', message);
      port.postMessage(message);
    } else {
      console.error('No gaia::sync::request port');
    }
  };

  window.addEventListener('iac-gaia::sync::request', event => {
    if (!event || !event.detail || !event.detail.id) {
      console.error('Wrong IAC request');
      window.close();
      return;
    }

    const request = event.detail;

    DEBUG('Sync request', request);

    switch (request.name) {
      case 'sync':
        handleSyncRequest(request).then(() => {
          sendPortMessage({
            id: request.id
          });
          window.close();
        }).catch(error => {
          DEBUG('Sync request error', error.message || error.name || error);
          sendPortMessage({
            id: request.id,
            error: { message: error.message }
          });
          window.close();
        });
        break;
      case 'cancel':
        console.warn('Closing app');
        window.close();
        break;
      default:
        console.error('Unknown IAC request');
        window.close();
    }
  });

  // Expose Bootstrap for unit testing:
  return { handleSyncRequest };
})();
