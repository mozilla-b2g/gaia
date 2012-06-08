/*
 *  Module: State
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var owd = window.owd || {};

if (!owd.HomeState) {

  (function() {
    'use strict';

    const DB_NAME = 'OWD';
    const VERSION = 1;
    const STORE_NAME = 'Homescreen';

    var database = null;

    function openDB(success, error) {

      if (window.mozIndexedDB) {
        console.log('IndexedDB is here');

        try {
          var request = window.mozIndexedDB.open(DB_NAME, VERSION);

          request.onsuccess = function(event) {
            database = event.target.result;
            console.log('Database opened for the Homescreen');
            success();
          };

          request.onerror = function(event) {
            console.log('Database error: ' + event.target.errorCode);
            error();
          };

          request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var objectStore =
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            objectStore.createIndex('byPage', 'id', { unique: true });
          };
        } catch (ex) {
          console.log(ex.message);
          error();
        }
      } else {
        console.log('Indexed DB is not available!!!');
        error();
      }

    }

    function newTxn(txn_type, callback, successCb, failureCb) {
      var txn = database.transaction([STORE_NAME], txn_type);
      var store = txn.objectStore(STORE_NAME);

      callback(txn, store);

      txn.oncomplete = function(event) {
        successCb(event);
      };

      txn.onerror = function(event) {
        console.error('Caught error on transaction: ', event.target.errorCode);
        failureCb(event.target.errorCode);
      };
    }

    owd.HomeState = {

      init: function(success, error) {
        openDB(success, error);
      },

      save: function(pages, success, error) {
        if (database) {
          newTxn('readwrite', function(txn, store) {
            if (Object.prototype.toString.call(pages) === '[object Array]') {
              //TODO We clear store because we can have legacy pages
              store.clear();
              var len = pages.length;
              for (var i = 0; i < len; i++) {
                var page = pages[i];
                store.put({
                  id: i,
                  apps: page.getAppsList()
                });
              }
            } else {
              // Only one page
              store.put(pages);
            }
          }, success, error);
        } else {
          error('Database is not available');
        }
      },

      getAppsByPage: function(iteratee, success, error) {
        if (database) {
          var results = 0;
          newTxn('readonly', function(txn, store) {
            var index = store.index('byPage');
            var request = index.openCursor();
            request.onsuccess = function(event) {
              var cursor = event.target.result;
              if (cursor) {
                iteratee(cursor.value.apps);
                results++;
                cursor.continue();
              }
            };
          }, function() { success(results) }, error);
        } else {
          error('Database is not available');
        }
      }
    };
  })();
}
