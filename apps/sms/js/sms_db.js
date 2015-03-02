/* global
  IDBKeyRange,
  Utils
 */

'use strict';

(function(exports) {
  const DB_NAME = 'SMS_DB';
  const DB_VERSION = 1;
  const THREADS_OS = 'threads';

  var readyPromise = null;

  function startMigration() {
    var defer = Utils.Promise.defer();
  }

  function upgradeDb(e) {
    var { oldVersion, newVersion, target: { result: db }} = e;

    /*
    var db = e.target.result;
    var oldVersion = e.oldVersion;
    var newVersion = e.newVersion;
    */

    var objectStore = db.createObjectStore(THREADS_OS, { keyPath: 'id' });
    objectStore.createIndex('timestamp', 'timestamp');

    if (oldVersion === 0) {
      // creating from scratch: we need to migrate
      startMigration();
    }
  }

  var SmsDB = {
    open: function() {
      var defer = Utils.Promise.defer();

      var request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = upgradeDb;
      request.onsuccess = (e) => {
        this._db = e.target.result;
        if (migrationDefer) {
          defer.resolve(migrationDefer.then(() => this._db));
        } else {
          defer.resolve(this._db);
        }
      };
      request.onerror = defer.reject;

      return readyPromise = defer.promise;
    },

    ensureDB: function() {
      if (readyPromise) {
        return readyPromise;
      }

      return this.open();
    },

    close: function() {
      this._db.close();
      this._db = null;
    }
  };

  /* never use this object directly, only use through methods in threads.js */
  SmsDB.Threads = {
    get: function(id) {
      return this.getSeveral([id]).then(result => result[0]);
    },

    getSeveral: function(id) {
      function getItemOnStore(store, id) {
        var defer = Utils.Promise.defer();

        var req = store.get(+id);
        req.onsuccess = (e) => defer.resolve(e.target.result);

        return defer.promise;
      }

      if (!id) {
        throw new Error('No key parameter has been passed.');
      }

      if (!Array.isArray(id)) {
        throw new Error('Key parameter is not an array.');
      }

      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS);
        var store = transaction.objectStore(THREADS_OS);

        var results = Promise.all(
          id.map(getItemOnStore.bind(null, store))
        );

        transaction.oncomplete = () => defer.resolve(results);
        transaction.onerror = () => defer.reject(transaction.error);
        return defer.promise;
      });
    },

    getForUpdate: function(id, updateFunc) {
      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS, 'readwrite');
        var store = transaction.objectStore(THREADS_OS);

        var newValue;
        var req = store.openCursor(IDBKeyRange.only(id));
        req.onsuccess = (e) => {
          var cursor = req.result;
          if (cursor) {
            newValue = updateFunc(cursor.value);
            cursor.update(newValue);
          } else {
            newValue = updateFunc(null);
            this.put(newValue);
          }
        };

        transaction.oncomplete = () => defer.resolve(newValue);
        transaction.onerror = () => defer.reject(transaction.error);
        return defer.promise;
      });
    },

    has: function(id) {
      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS);
        var store = transaction.objectStore(THREADS_OS);
        var req = store.openCursor(IDBKeyRange.only(id));
        req.onsuccess = (e) => {
          var cursor = req.result;
          defer.resolve(!!cursor);
        };

        return defer.promise;
      });
    },

    _internalPut: function(db, threads) {
      var defer = Utils.Promise.defer();

      var transaction = db.transaction(THREADS_OS, 'readwrite');
      var store = transaction.objectStore(THREADS_OS);

      if (!Array.isArray(threads)) {
        threads = [ threads ];
      }

      threads.forEach(thread => store.put(thread));

      transaction.oncomplete = defer.resolve;
      transaction.onerror = () => defer.reject(transaction.error);
      return defer.promise;
    },

    // updates or inserts
    put: function(threads) {
      return SmsDB.ensureDB().then(db => this._internalPut(db, threads));
    },

    forEach: function(callback) {
      function next(e) {
        var cursor = e.target.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      }

      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS);
        var store = transaction.objectStore(THREADS_OS);
        var index = store.index('timestamp');

        var req = index.openCursor(undefined, 'prev');
        req.onsuccess = next;

        transaction.oncomplete = defer.resolve;
        transaction.onerror = () => defer.reject(transaction.error);

        return defer.promise;
      });
    },

    clear: function() {
      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS, 'readwrite');
        var store = transaction.objectStore(THREADS_OS);
        store.clear();

        transaction.oncomplete = defer.resolve;
        transaction.onerror = () => defer.reject(transaction.error);

        return defer.promise;
      });
    },

    delete: function(id) {
      return SmsDB.ensureDB().then(db => {
        var defer = Utils.Promise.defer();

        var transaction = db.transaction(THREADS_OS, 'readwrite');
        var store = transaction.objectStore(THREADS_OS);
        store.delete(id);

        transaction.oncomplete = defer.resolve;
        transaction.onerror = () => defer.reject(transaction.error);

        return defer.promise;
      });
    }
  };

  exports.SmsDB = SmsDB;
})(window);
