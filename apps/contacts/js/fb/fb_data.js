
var fb = window.fb || {};

if (!window.fb.contacts) {
  (function(document) {
    'use strict';

    var contacts = fb.contacts = {};
    var indexedDB = window.mozIndexedDB || window.webkitIndexedDB ||
      window.indexedDB;

    var database;
    var STORE_NAME = 'FBFriends';

    /**
     *   Request auxiliary object to support asynchronous calls
     *
     */
    var Request = function() {
      this.done = function(result) {
        this.result = result;
        if (typeof this.onsuccess === 'function') {
          this.onsuccess();
        }
      }

      this.failed = function(error) {
        this.error = error;
        if (typeof this.onerror === 'function') {
          this.onerror();
        }
      }
    } // Request

    /**
     *  Creates the store
     *
     */
    function createStore(e) {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'uid' });
    }

    /**
     *  Initializes the DB
     *
     */
    function init(cb) {
      var req = indexedDB.open('GaiaFbFriendsxy', 1.0);

      req.onsuccess = function(e) {
        database = e.target.result;
        if (typeof cb === 'function') {
          cb();
        }
      };

      req.onerror = function(e) {
        window.console.error('OWDError: ', e.target.error.name);
        if (typeof cb === 'function') {
          cb();
        }
      };

      req.onupgradeneeded = createStore;
    }

    /**
     *  Allows to obtain the FB contact information by UID
     *
     *
     */
    contacts.get = function(uid) {
      var retRequest = new Request();

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
      var retRequest = new Request();

      window.setTimeout(function() {
        var transaction = database.transaction([STORE_NAME], 'readwrite');

        transaction.onerror = function(e) {
          retRequest.failed(e.target.error);
        }

        var objectStore = transaction.objectStore(STORE_NAME);

        var req = objectStore.put(obj);
        req.onsuccess = function(e) { retRequest.done(e.target.result); };
        req.onerror = function(e) { retRequest.failed(e.target.error); }
      },0);

        return retRequest;
      }

      contacts.getAll = function() {
        var retRequest = new Request();
        window.setTimeout(function() {
          var transaction = database.transaction([STORE_NAME], 'readonly');
          var objectStore = transaction.objectStore(STORE_NAME);

          var req = objectStore.mozGetAll();

          req.onsuccess = function(e) {
            var data = e.target.result;
            var out = {};
            data.forEach(function(c) {
              out[c.uid] = c;
            });
            retRequest.done(out);
          };

          req.onerror = function(e) {
            retRequest.failed(e.target.error);
          }
         });

        return retRequest;
      }

    /**
     *  Allows to remove FB contact from the DB
     *
     *
     */
    contacts.remove = function(uid) {
      var retRequest = new Request();

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
      init(cb);
    }

  }) (document);
}

/*
fbContacts.get(uid);
fbContacts.remove(uid);
fbContacts.save(uid);
*/
