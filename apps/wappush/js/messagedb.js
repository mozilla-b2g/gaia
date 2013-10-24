/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var MessageDB = (function() {
  var DB_NAME = 'wappush';
  var DB_VERSION = 1;
  var MESSAGE_STORE_NAME = 'message';
  var KEY_PATH = 'timestamp';
  var ID_INDEX = 'id';
  var ID_INDEX_KEYPATH = 'id';

  var db = null;

  /**
   * Opens the database, creates it if it has not been created already. Invokes
   * the specified success callback upon successful completion or the error one
   * if any error is encountered.
   *
   * @param {Function} success A callback invoked once the database has been
   *        successfully opened. The database is passed as a parameter.
   * @param {Function} error A callback invoked if any error is encountered
   *        while opening the database.
   */
  function mdb_open(success, error) {
    if (db) {
      success(db);
      return;
    }

    try {
      var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                      window.mozIndexedDB || window.msIndexedDB;
    } catch (e) {
      error(e);
      return;
    }

    if (!indexedDB) {
      error('IndexedDB is not available');
      return;
    }

    var req;

    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      error(e.message);
      return;
    }

    req.onsuccess = function mdb_opened(event) {
      db = event.target.result;
      success(db);
    };
    req.onerror = function mdb_openError(event) {
      error(event.target.errorCode);
    };
    req.onupgradeneeded = function mdb_upgradeNeeded(event) {
      var db = event.target.result;

      if (event.oldVersion == 0) {
        var store = db.createObjectStore(MESSAGE_STORE_NAME,
                                         { keyPath: KEY_PATH });
        store.createIndex(ID_INDEX, ID_INDEX_KEYPATH, { unique: false });
      }
    };
  }

  /**
   * Adds a messages to the message database. Once the transaction is completed
   * invokes the success callback. If an error occurs the error callback will
   * be invoked with the corresponding error as its sole parameter.
   *
   * @param {Object} message A parsed WAP Push message to be processed.
   * @param {Function} success A callback invoked when the transaction completes
   *        successfully.
   * @param {Function} error A callback invoked if an operation fails.
   */
  function mdb_put(message, success, error) {
    mdb_open(function mdb_putCallback(db) {
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');

      transaction.oncomplete = function mdb_putComplete(event) {
        success();
      };
      transaction.onerror = function mdb_putError(event) {
        error(event.target.errorCode);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      store.put(message);
    }, error);
  }

  /**
   * Retrieves a message and passes it to the success callback as its sole
   * parameter. Once retrieved the message is atomically removed from the
   * database.
   *
   * @param {Number} timestamp The timestamp identifiying the message to be
   *        retrieved.
   * @param {Function} success A callback invoked after the message has been
   *        retrieved with the message as its sole parameter.
   * @param {Function} error A callback invoked if retrieving the message fails,
   *        an error code describing the cause of the failure is passed to it.
   */
  function mdb_retrieve(timestamp, success, error) {
    mdb_open(function mdb_retrieveCallback(db) {
      var state = { message: null };
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');

      transaction.oncomplete = function mdb_retrieveComplete() {
        success(state.message);
      };
      transaction.onerror = function mdb_retrieveError(event) {
        error(event.target.errorCode);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var req = store.get(timestamp.toString());

      req.onsuccess = function mdb_gotMessage(event) {
        if (event.target.result) {
          var message = event.target.result;

          state.message = message;
          store.delete(message.timestamp);
        }
      };
    }, error);
  }

  /**
   * Removes all messages from the database; invokes the success callback upon
   * sucessful completion and the error one if any error is encountered.
   *
   * @param {Function} success A callback invoked after all messages have been
   *        removed from the database.
   * @param {Function} error A callback invoked if any error is encountered
   *        while removing the messages.
   */
  function mdb_clear(success, error) {
    mdb_open(function mdb_clearCallback(db) {
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');

      transaction.oncomplete = function mdb_clearComplete() {
        success();
      };
      transaction.onerror = function mdb_clearError(event) {
        error(event.target.errorCode);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var req = store.clear();
    }, error);
  }

  return {
    put: mdb_put,
    retrieve: mdb_retrieve,
    clear: mdb_clear
  };
})();
