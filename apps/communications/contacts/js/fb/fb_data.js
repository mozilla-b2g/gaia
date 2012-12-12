'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function(document) {

    var contacts = fb.contacts = {};
    var indexedDB = window.mozIndexedDB || window.webkitIndexedDB ||
      window.indexedDB;

    var database;
    var STORE_NAME = 'FBFriendsV2';
    var OLD_STORE_NAME = 'FBFriends';
    var INDEX_NAME = 'byTelephone';
    var isInitialized = false;
    var migrationNeeded = false;


    /**
     *  Creates the store
     *
     */
    function createStore(e) {
      return e.target.result.createObjectStore(STORE_NAME, { keyPath: 'uid' });
    }

    function createStoreAndIndex(e) {
      var store = createStore(e);
      store.createIndex(INDEX_NAME,'telephone', {
        unique: true,
        multiEntry: true
      });
    }

    function upgradeDB(e) {
      if(e.oldVersion === 1.0 && e.newVersion === 2.0) {
        window.console.warn('Upgrading Facebook Cache!!!!!');
        migrationNeeded = true;
        createStoreAndIndex(e);
      }
      else if(e.newVersion === 1.0) {
        createStore(e);
      }
      else if(e.newVersion === 2.0) {
        createStoreAndIndex(e);
      }
    }

    function migrateData() {
      migrationNeeded = false;
      var transaction = database.transaction([OLD_STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(OLD_STORE_NAME);

      var req = objectStore.mozGetAll();

      req.onsuccess = function(e) {
        var data = e.target.result;
        var out = {};
        data.forEach(function(contact) {
          var req = fb.contacts.save(contact);
          req.onsuccess = function saveSuccess() {
            console.log('Success migrating ', contact.uid);
          }
          req.onerror = function saveError() {
            console.error('Error migrating ', contact.uid);
          }
        });
      };

      req.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
    }

    function initError(outRequest, error) {
      outRequest.failed(e);
    }

    function doGet(uid, outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);
      var areq = objectStore.get(uid);

      areq.onsuccess = function(e) {
        outRequest.done(e.target.result);
      };

      areq.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
    }

    /**
     *  Allows to obtain the FB contact information by UID
     *
     *
     */
    contacts.get = function(uid) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function get() {
        contacts.init(function() {
          doGet(uid, retRequest);
        }, function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    }

    function doGetByPhone(tel, outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);

      var index = objectStore.index(INDEX_NAME);

      var areq = index.get(tel);

      areq.onsuccess = function(e) {
        outRequest.done(e.target.result);
      }

      areq.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
    }

    contacts.getByPhone = function(tel) {
      var outRequest = new fb.utils.Request();

      window.setTimeout(function get_by_phone() {
        contacts.init(function get_by_phone() {
          doGetByPhone(tel,outRequest);
        },
        function() {
          initError(outRequest);
        });
      }, 0);

      return outRequest;
    }

    function doSave(obj,outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readwrite');

      transaction.onerror = function(e) {
        outRequest.failed(e.target.error);
      }

      var objectStore = transaction.objectStore(STORE_NAME);

      if(Array.isArray(obj.tel) && obj.tel.length > 0) {
        obj.telephone = [];
        obj.tel.forEach(function(atel) {
          obj.telephone.push(atel.value);
        });
      }

      var req = objectStore.put(obj);
      req.onsuccess = function(e) {
        outRequest.done(e.target.result);
      }

      req.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
    }

    /**
     *  Allows to save FB Contact Information
     *
     *
     */
    contacts.save = function(obj) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function save() {
        contacts.init(function() {
          doSave(obj, retRequest);
        },
        function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    }

    function doGetAll(outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);

      var req = objectStore.mozGetAll();

      req.onsuccess = function(e) {
        var data = e.target.result;
        var out = {};
        data.forEach(function(contact) {
          out[contact.uid] = contact;
        });
        outRequest.done(out);
      };

      req.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
    }

    contacts.getAll = function() {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function() {
        contacts.init(function get_all() {
          doGetAll(retRequest);
        },
        function() {
          initError(retRequest);
        });
      },0);

      return retRequest;
    }

    function doRemove(uid,outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readwrite');
      transaction.oncomplete = function(e) {
        outRequest.done(e.target.result);
      }

      transaction.onerror = function(e) {
        outRequest.failed(e.target.error);
      }
      var objectStore = transaction.objectStore(STORE_NAME);

      objectStore.delete(uid);
    }

    /**
     *  Allows to remove FB contact from the DB
     *
     *
     */
    contacts.remove = function(uid) {
      var retRequest = new fb.utils.Request();

      window.setTimeout(function remove() {
        contacts.init(function() {
          doRemove(uid, retRequest);
        },
        function() {
           initError(retRequest);
        });
      },0);

      return retRequest;
    }

    contacts.init = function(cb, errorCb) {
      if(isInitialized === true) {
        cb();
        return;
      }

      var req = indexedDB.open('Gaia_Facebook_Friends', 2.0);

      req.onsuccess = function(e) {
        database = e.target.result;
        if (migrationNeeded) {
          migrateData();
        }
        isInitialized = true;
        if (typeof cb === 'function') {
          cb();
        }
      };

      req.onerror = function(e) {
        window.console.error('FB: Error while opening the DB: ',
                                                        e.target.error.name);
        if (typeof errorCb === 'function') {
          errorCb();
        }
      };

      req.onupgradeneeded = upgradeDB;
    }

  }) (document);
}
