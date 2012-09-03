'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function(document) {

    var contacts = fb.contacts = {};
    var indexedDB = window.mozIndexedDB || window.webkitIndexedDB ||
      window.indexedDB;

    var database;
    var STORE_NAME = 'FBFriends';


    /**
     *  Creates the store
     *
     */
    function createStore(e) {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'uid' });
    }


    /**
     *  Allows to obtain the FB contact information by UID
     *
     *
     */
    contacts.get = function(uid) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        var transaction = database.transaction([STORE_NAME], 'readonly');
        var objectStore = transaction.objectStore(STORE_NAME);
        var areq = objectStore.get(uid);

        areq.onsuccess = function(e) {
          retRequest.done(e.target.result);
        };

        areq.onerror = function(e) {
          reqRequest.failed(e.target.error);
        }

      },0);

      return retRequest;
    }

    /**
     *  Allows to save FB Contact Information
     *
     *
     */
    contacts.save = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        var transaction = database.transaction([STORE_NAME], 'readwrite');

        transaction.onerror = function(e) {
          retRequest.failed(e.target.error);
        }

        var objectStore = transaction.objectStore(STORE_NAME);

        var req = objectStore.put(obj);
        req.onsuccess = function(e) {
          retRequest.done(e.target.result);
        }

        req.onerror = function(e) {
          retRequest.failed(e.target.error);
        }
      },0);

        return retRequest;
      }

      contacts.getAll = function() {
        var retRequest = new fb.utils.Request();
        window.setTimeout(function() {
          var transaction = database.transaction([STORE_NAME], 'readonly');
          var objectStore = transaction.objectStore(STORE_NAME);

          var req = objectStore.mozGetAll();

          req.onsuccess = function(e) {
            var data = e.target.result;
            var out = {};
            data.forEach(function(contact) {
              out[contact.uid] = contact;
            });
            retRequest.done(out);
          };

          req.onerror = function(e) {
            retRequest.failed(e.target.error);
          }
        }, 0);

        return retRequest;
      }

    /**
     *  Allows to remove FB contact from the DB
     *
     *
     */
    contacts.remove = function(uid) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        var transaction = database.transaction([STORE_NAME], 'readwrite');
        transaction.oncomplete = function(e) {
          retRequest.done(e.target.result);
        }

        transaction.onerror = function(e) {
          retRequest.failed(e.target.error);
        }
        var objectStore = transaction.objectStore(STORE_NAME);
        objectStore.delete(uid);
      },0);

      return retRequest;
    }

    contacts.init = function(cb) {
      var req = indexedDB.open('Gaia_Facebook_Friends', 1.0);

      req.onsuccess = function(e) {
        database = e.target.result;
        if (typeof cb === 'function') {
          cb();
        }
      };

      req.onerror = function(e) {
        window.console.error('FB: Error while opening the DB: ',
                                                        e.target.error.name);
        if (typeof cb === 'function') {
          cb();
        }
      };

      req.onupgradeneeded = createStore;
    }

  }) (document);
}
