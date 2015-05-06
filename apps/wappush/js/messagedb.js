/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global EventDispatcher, IDBKeyRange, Promise */

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
   * Turns an IndexedDB transaction in a promise that is resolved when the
   * transaction completes or is rejected if it fails. An optional state object
   * can be passed; if it's present and contains a field called 'result' this
   * field will be passed to the promise when it's resolved.
   *
   * @param {Object} transaction An IDBTransaction object.
   * @param {Object} [state] An object holding the promise result value.
   * @return {Promise} A promise that is resolved when the transaction
   *                   completes or is rejected if an error occurs.
   */
  function mdb_transactionPromise(transaction, state) {
    return new Promise(function(resolve, reject) {
      transaction.oncomplete = function mdb_onTransactionComplete(event) {
        resolve(state && state.result);
      };
      transaction.onerror = function mdb_onTransactionError(event) {
        reject(event.target.error);
      };
    });
  }

  /**
   * Opens the database, creates it if it has not been created already. Returns
   * a promise that is resolved with the value of the database object or
   * rejected with an error object.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_open() {
    if (db) {
      return Promise.resolve(db);
    }

    var indexedDB;

    try {
      indexedDB = window.indexedDB || window.webkitIndexedDB ||
                  window.mozIndexedDB || window.msIndexedDB;
    } catch (e) {
      return Promise.reject(e);
    }

    if (!indexedDB) {
      return Promise.reject(new Error('IndexedDB is not available'));
    }

    return new Promise(function(resolve, reject) {
      var req;

      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        reject(e);
        return;
      }

      req.onsuccess = function mdb_opened(event) {
        db = event.target.result;
        resolve(db);
      };
      req.onerror = function mdb_openError(event) {
        reject(event.target.error);
      };
      req.onupgradeneeded = function mdb_upgradeNeeded(event) {
        var db = event.target.result;

        if (event.oldVersion === 0) {
          var store = db.createObjectStore(MESSAGE_STORE_NAME,
                                           { keyPath: KEY_PATH });
          store.createIndex(ID_INDEX, ID_INDEX_KEYPATH, { unique: false });
        }
      };
    });
  }

  /**
   * Process a message executing the associated action. This deals with
   * messages with a 'delete' action by deleting all coresponding message and
   * with new messages by storing them. Once processing is done the message is
   * returned or null if it was discarded.
   *
   * @param {Object} store The messages' object store.
   * @param {Object} message The message to be processed.
   * @param {String} status The status of this message
   *
   * @return {String} The status of the message after processing it.
   */
  function mdb_processMessage(store, message, status) {
    /* If the message has a 'delete' action delete all messages with the
     * corresponding 'si-id' field and drop the current message. All other
     * messages should be stored. */
    if (message.action === 'delete') {
      mdb_deleteById(store, message.id);
      status = 'discarded';
    } else {
      store.put(message);
    }

    return status;
  }

  /**
   * Adds a messages to the message database according to the out-of-order
   * delivery rules specified in WAP-167 6.2. Returns a promise that resolves
   * to a string describing the status of the message: 'new' if the message was
   * new, 'updated' if the message updated an existing message or 'discarded'
   * if the message was discarded.
   *
   * @param {Object} message A parsed WAP Push message to be processed.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_put(message) {
    return mdb_open().then(function mdb_openResolved(db) {
      var state = { result: 'new' };
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');
      var promise = mdb_transactionPromise(transaction, state);
      var store = transaction.objectStore(MESSAGE_STORE_NAME);

      if (!message.id) {
        // The message has no 'si-id' field, store it
        store.put(message);
        return promise;
      }

      if (!message.created) {
        /* The message has a 'si-id' field but no creation time, process it and
         * store it if needed */
        state.result = mdb_processMessage(store, message, state.result);
        return promise;
      }

      /* The message has both a 'si-id' and a 'created' field, make it go
       * through the out-of-order delivery logic. This will check if the
       * message is new, updates an existing one or is just outdated and
       * needs to be discarded. */
      var index = store.index(ID_INDEX);
      var req = index.openCursor(IDBKeyRange.only(message.id));

      req.onsuccess = function mdb_cursorSuccess(event) {
        var cursor = event.target.result;

        if (cursor) {
          var storedMessage = cursor.value;

          /* If this is a new version of an existing message, expire the
           * previous message and flag this message as updated. Older versions
           * are discarded right away with no further action required. */
          if (storedMessage.created) {
            if (storedMessage.created < message.created) {
              cursor.delete(storedMessage);
              message.timestamp = storedMessage.timestamp;
              state.result = mdb_processMessage(store, message, 'updated');
            } else {
              state.result = 'discarded';
            }

            return;
          }

          cursor.continue();
        } else {
          /* We found no matching message with a 'created' property set,
           * process the message and store it if needed */
          state.result = mdb_processMessage(store, message, state.result);
        }
      };

      return promise;
    });
  }

  /**
   * Deletes all messages with the specified si-id. Generates a
   * `messagedeleted' event for every message that was deleted.
   *
   * @param {Object} store The messages' object store.
   * @param {String} id The si-id of the messages to be deleted.
   */
  function mdb_deleteById(store, id) {
    var index = store.index(ID_INDEX);
    var req = index.openCursor(id);

    req.onsuccess = function mdb_openCursorSuccess(event) {
      var cursor = event.target.result;

      if (cursor) {
        var message = cursor.value;

        cursor.delete().onsuccess = function mdb_onDeleted() {
          mdb_dispatchEvent('messagedeleted', message);
        };
        cursor.continue();
      }
    };
  }

  /**
   * Retrieves a message and passes it to the success callback as its sole
   * parameter. Once retrieved the message is atomically removed from the
   * database if type is other than CP type. A promise is returned that will
   * resolve to the message. If the message is not found then the promise will
   * resolve to the null value.
   *
   * @param {Number} timestamp The timestamp identifiying the message to be
   *        retrieved.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_retrieve(timestamp) {
    return mdb_open().then(function mdb_openResolved(db) {
      var state = { result: null };
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');
      var promise = mdb_transactionPromise(transaction, state);

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var req = store.get(timestamp.toString());

      req.onsuccess = function mdb_gotMessage(event) {
        if (event.target.result) {
          var message = event.target.result;

          state.result = message;

          if (message.type != 'text/vnd.wap.connectivity-xml') {
            store.delete(message.timestamp);
          }
        }
      };

      return promise;
    });
  }

  /**
   * Deletes all the messages with the specified timestamp. Generates a
   * `messagedeleted' event for every message that was deleted.
   *
   * @param {String} timestamp The timestamp used to identify the messages to
   *        be deleted.
   *
   * @return {Promise} A promise for this operation.
   */
  function mdb_deleteByTimestamp(timestamp) {
    return mdb_open().then(function mdb_deleteCallback(db) {
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');
      var promise = mdb_transactionPromise(transaction);
      var store = transaction.objectStore(MESSAGE_STORE_NAME);

      timestamp = timestamp.toString();
      store.get(timestamp).onsuccess = function(event) {
        var message = event.target.result;

        store.delete(timestamp).onsuccess = function mdb_onDeleted() {
          mdb_dispatchEvent('messagedeleted', message);
        };
      };

      return promise;
    });
  }

  /**
   * Removes all messages from the database. Returns a promise that is
   * resolved when the operation has completed. This does not fire events.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_clear() {
    return mdb_open().then(function mdb_openResolved(db) {
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');
      var promise = mdb_transactionPromise(transaction);
      var store = transaction.objectStore(MESSAGE_STORE_NAME);

      store.clear();

      return promise;
    });
  }

  /**
   * Dispatches a new event to the registered event handlers.
   *
   * @param {String} type The event type.
   * @param {Object} target The event target, usually a message.
   */
  function mdb_dispatchEvent(type, target) {
    /* We explicitly use the MessageDB singleton as the EventDispatcher code
     * requires the `this' reference to operate. */
    MessageDB.emit(type, target);
  }

  /**
   * List of events which can be listened to on this object. Currently only
   * contains the `messagedeleted' event, emitted whenever a message is
   * deleted from the database.
   */
  var mdb_allowedEvents = [
    'messagedeleted'
  ];

  return EventDispatcher.mixin({
    put: mdb_put,
    retrieve: mdb_retrieve,
    deleteByTimestamp: mdb_deleteByTimestamp,
    clear: mdb_clear
  }, mdb_allowedEvents);
})();
