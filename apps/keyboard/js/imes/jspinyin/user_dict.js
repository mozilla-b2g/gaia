/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function() {
  if (typeof Module == 'undefined')
    Module = {};

  if (!Module['preRun'])
     Module['preRun'] = [];

  var DEBUG = false;
  function log(msg) {
    if (!DEBUG) {
      return;
    }
    console.log('user_dict: ' + msg);
  }

  Module['preRun'].push(function() {
    var indexedDB = window.indexedDB;

    if (!indexedDB) {
      return;
    }

    Module['addRunDependency']('fp data/user_dict.data');

    function removeRunDependency() {
      Module['removeRunDependency']('fp data/user_dict.data');
    }

    // Load user_dict.data from IndexedDB
    var dbVersion = 1;
    var STORE_NAME = 'files';
    var USER_DICT = 'user_dict';
    var db = null;

    var request = indexedDB.open('EmpinyinDatabase', dbVersion);

    request.onerror = function opendb_onerror(event) {
      log('Error occurs when openning database: ' + event.target.errorCode);
    };

    request.onsuccess = function opendb_onsuccess(event) {
      db = event.target.result;
      readUserDictFileFromDB();
    };

    request.onupgradeneeded = function opendb_onupgradeneeded(event) {
      db = event.target.result;

      // Delete the old ObjectStore if present
      if (db.objectStoreNames.length !== 0) {
        db.deleteObjectStore(STORE_NAME);
      }

      db.createObjectStore(STORE_NAME, { keyPath: 'name' });
    };

    function readUserDictFileFromDB() {
      var request = db.transaction([STORE_NAME], 'readonly')
                      .objectStore(STORE_NAME).get(USER_DICT);

      request.onsuccess = function readdb_oncomplete(event) {
        if (!event.target.result) {
          // Create an empty file if it doesn't exist.
          var request = saveFileToDB(USER_DICT, []);
          request.onsuccess = readUserDictFileFromDB;
          request.onerror = removeRunDependency;
          return;
        }

        // Got the blob object of the user dictionary file.
        var byteArray = event.target.result.content;

        // Write the user dictionary into FS
        Module['FS_createPreloadedFile']('/data', 'user_dict.data',
                                         byteArray, true, true, function() {
          removeRunDependency();
        });
      };

      request.onerror = function readdb_oncomplete(event) {
        log('Failed to read file from DB: ' + event.target.result.name);
        removeRunDependency();
      };
    }

    function saveFileToDB(name, byteArray) {
      var obj = {
        name: name,
        content: byteArray
      };

      if (!db) {
        return null;
      }

      return db.transaction([STORE_NAME], 'readwrite')
               .objectStore(STORE_NAME).put(obj);
    }

    if (!Module['saveUserDictFileToDB']) {
      Module['saveUserDictFileToDB'] = function(name) {
        if (!Module['FS']) {
          log('FS is undefined.');
          return null;
        }

        return saveFileToDB(USER_DICT, Module['FS'].findObject(name).contents);
      };
    }
  });
})();
