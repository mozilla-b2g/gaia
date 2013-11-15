/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported MessageDB */

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

    var indexedDB;

    try {
      indexedDB = window.indexedDB || window.webkitIndexedDB ||
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
      error(event.target.error.name);
    };
    req.onupgradeneeded = function mdb_upgradeNeeded(event) {
      var db = event.target.result;

      if (event.oldVersion === 0) {
        var store = db.createObjectStore(MESSAGE_STORE_NAME,
                                         { keyPath: KEY_PATH });
        store.createIndex(ID_INDEX, ID_INDEX_KEYPATH, { unique: false });
      }
    };
  }

  /**
   * Adds a messages to the message database according to the out-of-order
   * delivery rules specified in WAP-167 6.2. Once the transaction is completed
   * invokes the success callback with a boolean parameter set to true if the
   * message is new and the user needs to be notified or false if a message
   * with the same ID has been seen already and thus no notification needs to be
   * sent. If an error occurs the error callback will be invoked with the
   * corresponding error as its sole parameter.
   *
   * @param {Object} message A parsed WAP Push message to be processed.
   * @param {Function} success A callback invoked when the transaction completes
   *        successfully. A parameter is passed to this callback to indicate
   *        the resulting status of the message. 'new' if the message is new and
   *        'updated' if the message was an update to an existing message and
   *        'discarded' if the message was expired.
   * @param {Function} error A callback invoked if an operation fails.
   */
  function mdb_put(message, success, error) {
    mdb_open(function mdb_putCallback(db) {
      var status = 'new';
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');

      transaction.oncomplete = function mdb_putComplete(event) {
        success(status);
      };
      transaction.onerror = function mdb_putError(event) {
        error(event.target.error.name);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);

      if (message.id) {
        /* Check if the message is new, updates an existing one or is just
         * outdated and needs to be discarded. */
        var index = store.index(ID_INDEX);
        var req = index.get(message.id);

        req.onsuccess = function mdb_gotExistingMessage(event) {
          if (event.target.result) {
            var storedMessage = event.target.result;

            /* If this is a new version of an existing message, expire the
             * previous message and flag this message as updated. Older versions
             * are discarded right away with no further action required. */
            if (storedMessage.created && message.created) {
              if (storedMessage.created < message.created) {
                status = 'updated';
                store.delete(storedMessage.timestamp);
                store.put(message);
              } else {
                status = 'discarded';
              }
            }

            /* After the normal message replacement if this message has a
             * delete action remove all messages with the same ID including
             * the received message itself. The user will not be notified. */
            if (message.action === 'delete') {
              status = 'discarded';
              mdb_deleteById(transaction, message.id, error);
            }
          } else {
            /* No existing message has a matching ID, notify the user */
            store.put(message);
          }
        };
      } else {
        /* The message doesn't have an ID, unconditionally store it and notify
         * the user. */
        store.put(message);
      }
    }, error);
  }

  /**
   * Deletes all messages with the specified si-id. This method is private and
   * should only be called from within an existing transaction.
   *
   * @param {Object} transaction A transaction within which this operation will
   *        take place.
   * @param {String} id The si-id of the messages to be deleted.
   * @param {Function} error A callback invoked if an operation fails.
   */
  function mdb_deleteById(transaction, id, error) {
    var store = transaction.objectStore(MESSAGE_STORE_NAME);
    var index = store.index(ID_INDEX);
    var req = index.openCursor(id);

    req.onsuccess = function mdb_openCursorSuccess(event) {
      var cursor = event.target.result;

      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    req.onerror = function mdb_openCursorError(event) {
      error(event.target.error.name);
    };
  }

  /**
   * Retrieves a message and passes it to the success callback as its sole
   * parameter. Once retrieved the message is atomically removed from the
   * database. If the message was not present in the database then the success
   * callback is invoked with a null message.
   *
   * @param {Number} timestamp The timestamp identifiying the message to be
   *        retrieved.
   * @param {Function} success A callback invoked after the message has been
   *        retrieved with the message as its sole parameter or null if the
   *        message could not be found.
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
        error(event.target.error.name);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var req = store.get(timestamp.toString());

      req.onsuccess = function mdb_gotMessage(event) {
        if (event.target.result) {
          var message = event.target.result;

          state.message = message;

          if (message) {
            store.delete(message.timestamp);
          }
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
        error(event.target.error.name);
      };

      var store = transaction.objectStore(MESSAGE_STORE_NAME);

      store.clear();
    }, error);
  }

  return {
    put: mdb_put,
    retrieve: mdb_retrieve,
    clear: mdb_clear
  };
})();
