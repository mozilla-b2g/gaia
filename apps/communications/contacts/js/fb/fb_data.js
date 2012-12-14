'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function(document) {

    var contacts = fb.contacts = {};
    var indexedDB = window.mozIndexedDB || window.webkitIndexedDB ||
      window.indexedDB;

    var database;
    var DB_NAME = 'Gaia_Facebook_Friends';
    var OLD_DB_VERSION = 1.0;
    var DB_VERSION = 2.0;
    var OLD_STORE_NAME = 'FBFriends';
    var STORE_NAME = 'FBFriendsV2';
    var INDEX_NAME = 'byTelephone';
    var isInitialized = false;
    var migrationNeeded = false;

    function DatabaseMigrator(items) {
      var pointer = 0;
      var CHUNK_SIZE = 5;
      var numResponses = 0;
      var self = this;

      this.items = items;

      function continueCb() {
        numResponses++;
        pointer++;
        continuee();
      }

      function continuee() {
        if (pointer < self.items.length && numResponses === CHUNK_SIZE) {
          numResponses = 0;
          migrateSlice(pointer);
        }
        else if (pointer >= self.items.length) {
          if (typeof self.onfinish === 'function') {
            self.onfinish();
          }
        }
      }

      this.start = function() {
        if (Array.isArray(self.items) && self.items.length > 0) {
          migrateSlice(0);
        }
        else {
          if (typeof self.onfinish === 'function') {
            self.onfinish();
          }
        }
      }

      function migrateSlice(from) {
        for (var i = from; i < from + CHUNK_SIZE
             && i < self.items.length; i++) {
          var req = new fb.utils.Request();
          var item = self.items[i];
          doSave(item, req);
          req.onsuccess = function saveSuccess() {
            console.log('FB Cache: Success migrating ', item.uid);
            continueCb();
          }
          req.onerror = function saveError() {
            console.error('FB Cache: Error migrating ', item.uid);
            continueCb();
          }
        }
      }
    }

    /**
     *  Creates the store
     *
     */
    function createStore(e) {
      var db = e.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      return db.createObjectStore(STORE_NAME, { keyPath: 'uid' });
    }

    function createStoreAndIndex(e) {
      var store = createStore(e);
      store.createIndex(INDEX_NAME, 'telephone', {
        unique: true,
        multiEntry: true
      });
    }

    function upgradeDB(e) {
      if (e.oldVersion === OLD_DB_VERSION && e.newVersion === DB_VERSION) {
        window.console.warn('Upgrading Facebook Cache!!!!!');
        migrationNeeded = true;
        createStoreAndIndex(e);
      }
      else if (e.newVersion === 1.0) {
        createStore(e);
      }
      else if (e.newVersion === DB_VERSION) {
        createStoreAndIndex(e);
      }
    }

    function clearOldObjStore(cb) {
      var transaction = database.transaction([OLD_STORE_NAME], 'readwrite');
      var objectStore = transaction.objectStore(OLD_STORE_NAME);

      var req = objectStore.clear();
      req.onsuccess = cb;
      req.onerror = function error_del_objstore(e) {
        window.console.error('FB Cache. Error while clearing old Obj Store',
                             e.target.error.name);
        cb();
      }
    }

    function migrateData(onfinishCb) {
      if (!database.objectStoreNames.contains(OLD_STORE_NAME)) {
        onfinishCb();
        return;
      }

      var transaction = database.transaction([OLD_STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(OLD_STORE_NAME);

      var req = objectStore.mozGetAll();

      req.onsuccess = function(e) {
        var data = e.target.result;

        var migrator = new DatabaseMigrator(data);
         migrator.onfinish = function migration_finished() {
          window.console.log('FB Cache: Migration process finished!!');
          migrationNeeded = false;
          clearOldObjStore(onfinishCb);
        };
        migrator.start();
      };

      req.onerror = function(e) {
        window.console.error('FB Cache: Data migration failed !!!! ');
        onfinishCb();
      }
    }

    function initError(outRequest, error) {
      outRequest.failed(error);
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
          doGetByPhone(tel, outRequest);
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

      if (Array.isArray(obj.tel) && obj.tel.length > 0) {
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

    function notifyOpenSuccess(cb) {
      isInitialized = true;
      if (typeof cb === 'function') {
        cb();
      }
    }

    contacts.init = function(cb, errorCb) {
      if (isInitialized === true) {
        cb();
        return;
      }

      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onsuccess = function(e) {
        database = e.target.result;
        if (migrationNeeded === true) {
          migrateData(function migrated() {
            notifyOpenSuccess(cb);
          });
        }
        else {
          notifyOpenSuccess(cb);
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
