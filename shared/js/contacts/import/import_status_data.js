'use strict';

/* globals Promise */
/* exported ImportStatusData */

/*
 * Module for communication of import status data between FTU and Comms Apps via
 * Datastore.
 *
*/

if (!window.ImportStatusData) {
  var ImportStatusData = (function() {
    var store = null;
    var DS_NAME = 'Import_Status_Data';

    var datastoreLoading = false;
    var datastoreLoaded = false;
    var DS_LOADED_EVENT = 'datastore_loaded';

    var getDatastore = function getDatastore() {
      return new Promise(function(resolve, reject) {
        if (!navigator.getDataStores) {
          reject({
            name: 'DatastoreNotEnabled'
          });
          return;
        }

        if (datastoreLoaded) {
          resolve(store);
          return;
        }

        if (datastoreLoading) {
          document.addEventListener(DS_LOADED_EVENT, function loadedHandler() {
            document.removeEventListener(DS_LOADED_EVENT, loadedHandler);
            resolve(store);
          });
        }

        datastoreLoading = true;
        navigator.getDataStores(DS_NAME).then(function(stores) {
          store = stores[0];
        }, reject).then(function() {
            datastoreLoading = false;
            datastoreLoaded = true;
            document.dispatchEvent(new CustomEvent(DS_LOADED_EVENT));

            resolve(store);
        }, reject);
      });
    };

    var put = function put(key, obj) {
      return new Promise(function(resolve, reject) {
        getDatastore().then(function success(store) {
          store.put(obj, key).then(resolve, reject);
        }, reject);
      });
    };

    var remove = function remove(key) {
      return new Promise(function(resolve, reject) {
        getDatastore().then(function success(store) {
          store.remove(key).then(resolve, reject);
        }, reject);
      });
    };

    var get = function get(key) {
      return new Promise(function(resolve, reject) {
        getDatastore().then(function success(store) {
          store.get(key).then(resolve, reject);
        }, reject);
      });
    };

    var clear = function clear() {
      return new Promise(function(resolve, reject) {
        getDatastore().then(function success(store) {
          store.clear().then(resolve, reject);
        }, reject);
      });
    };

    return {
      put: put,
      remove: remove,
      get: get,
      clear: clear
    };

  })();
}
