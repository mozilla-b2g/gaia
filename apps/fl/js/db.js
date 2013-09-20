var objectStore = (function() {
  const DBNAME = 'LOCKEDCONTENT';
  const DBVERSION = 1;
  const STORENAMES = ['ringtones', 'wallpapers'];
  var db;

  function getStore(access, storeName, callback) {
    if (STORENAMES.indexOf(storeName) === -1)
      throw Error('unknown object store name:', storeName);

    if (db) {
      callback(db.transaction(storeName, access).objectStore(storeName));
    }
    else {
      initDB(function() { getStore(access, storeName, callback); });
    }
  }

  function initDB(callback) {
    var open = indexedDB.open(DBNAME, DBVERSION);

    open.onsuccess = function() {
      db = open.result;
      callback();
    };

    open.onupgradeneeded = function() {
      STORENAMES.forEach(function(storeName) {
        open.result.createObjectStore(storeName, {
          autoIncrement: true,
          keyPath: 'id'
        });
      });
    };

    open.onerror = function() {
      console.error('can not open database:', open.error.name);
    };
  }

  return {
    readonly: function readonly(storeName, callback) {
      getStore('readonly', storeName, callback);
    },
    readwrite: function readwrite(storeName, callback) {
      getStore('readwrite', storeName, callback);
    }
  };
}());
