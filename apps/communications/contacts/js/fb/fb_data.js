'use strict';

var fb = window.fb || {};

if (!window.fb.contacts) {
  (function(document) {

    var contacts = fb.contacts = {};
    var indexedDB = window.mozIndexedDB || window.webkitIndexedDB ||
      window.indexedDB;

    var database;
    var DB_NAME = 'Gaia_Facebook_Friends';
    var OLD_DB_VERSIONS = [1.0, 2.0];
    var DB_VERSION = 3.0;
    var OLD_STORE_NAMES = ['FBFriends', 'FBFriendsV2'];
    var STORE_NAME = 'FBFriendsV3';
    var INDEX_LONG_PHONE = 'byTelephone';
    var INDEX_SHORT_PHONE = 'byShortTelephone';
    var isInitialized = false;
    var migrationNeeded = false;
    var oldStoreName;

    function DatabaseMigrator(items) {
      var pointer = 0;
      var CHUNK_SIZE = 5;
      var numResponses = 0;
      var self = this;

      this.items = items;

      function continueCb() {
        numResponses++;
        pointer++;
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
      };

      function migrateSlice(from) {
        for (var i = from; i < from + CHUNK_SIZE
             && i < self.items.length; i++) {
          var req = new fb.utils.Request();
          var item = self.items[i];
          doSave(item, req);
          req.onsuccess = function saveSuccess() {
            console.log('FB Cache: Success migrating ', item.uid);
            continueCb();
          };
          req.onerror = function saveError() {
            console.error('FB Cache: Error migrating ', item.uid);
            continueCb();
          };
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
      store.createIndex(INDEX_LONG_PHONE, 'telephone', {
        unique: true,
        multiEntry: true
      });
      store.createIndex(INDEX_SHORT_PHONE, 'shortTelephone', {
        unique: true,
        multiEntry: true
      });
    }

    function upgradeDB(e) {
      var oldDbSearch = OLD_DB_VERSIONS.indexOf(e.oldVersion);
      if (oldDbSearch !== -1 && e.newVersion === DB_VERSION) {
        window.console.warn('Upgrading Facebook Cache!!!!!');
        migrationNeeded = true;
        oldStoreName = OLD_STORE_NAMES[oldDbSearch];
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
      var transaction = database.transaction([oldStoreName], 'readwrite');
      var objectStore = transaction.objectStore(oldStoreName);

      var req = objectStore.clear();
      req.onsuccess = cb;
      req.onerror = function error_del_objstore(e) {
        window.console.error('FB Cache. Error while clearing old Obj Store',
                             e.target.error.name);
        cb();
      };
    }

    function migrateData(onfinishCb) {
      if (!database.objectStoreNames.contains(oldStoreName)) {
        onfinishCb();
        return;
      }

      var transaction = database.transaction([oldStoreName], 'readonly');
      var objectStore = transaction.objectStore(oldStoreName);

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
      };
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
      };
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
    };

    function doGetByPhone(tel, outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readonly');
      var objectStore = transaction.objectStore(STORE_NAME);

      var index = objectStore.index(INDEX_LONG_PHONE);
      var areq = index.get(tel);
      areq.onsuccess = function(e) {
        if (e.target.result) {
          outRequest.done(e.target.result);
        }
        else {
          var otherIndex = objectStore.index(INDEX_SHORT_PHONE);
          var otherReq = otherIndex.get(tel);
          otherReq.onsuccess = function(e) {
            outRequest.done(e.target.result);
          };
          otherReq.onerror = function(e) {
            outRequest.failed(e.target.error);
          };
        }
      };

      areq.onerror = function(e) {
        outRequest.failed(e.target.error);
      };
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
    };

    function doSave(obj,outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readwrite');

      transaction.onerror = function(e) {
        outRequest.failed(e.target.error);
      };

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
      };

      req.onerror = function(e) {
        outRequest.failed(e.target.error);
      };
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
    };

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
      };
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
    };

    function doRemove(uid,outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readwrite');
      transaction.oncomplete = function(e) {
        outRequest.done(e.target.result);
      };

      transaction.onerror = function(e) {
        outRequest.failed(e.target.error);
      };
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
    };

    contacts.clear = function() {
      var outRequest = new fb.utils.Request();

       window.setTimeout(function clear() {
        contacts.init(function() {
          doClear(outRequest);
        },
        function() {
           initError(outRequest);
        });
      },0);

      return outRequest;
    };

    function doClear(outRequest) {
      var transaction = database.transaction([STORE_NAME], 'readwrite');
      transaction.oncomplete = function(e) {
        outRequest.done(e.target.result);
      };

      transaction.onerror = function(e) {
        outRequest.failed(e.target.error);
      };
      var objectStore = transaction.objectStore(STORE_NAME);

      objectStore.clear();
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
    };

  }) (document);
}
