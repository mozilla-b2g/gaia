/* global EventDispatcher, IDBKeyRange, Promise */

/* exported MessageDB */

'use strict';

var MessageDB = (function() {
  var DB_NAME = 'wappush';
  var DB_VERSION = 2;
  var MESSAGE_STORE_NAME = 'message';
  var VIEWED_STORE_NAME = 'viewed';
  var KEY_PATH = 'timestamp';
  var ID_INDEX = 'id';
  var ID_INDEX_KEYPATH = 'id';

  var db = null;

  /**
   * Turns an IndexedDB transaction in a promise that is resolved when the
   * transaction completes or is rejected if it fails.
   *
   * @param {Object} transaction An IDBTransaction object.
   * @return {Promise} A promise that is resolved when the transaction
   *                   completes or is rejected if an error occurs.
   */
  function mdb_transactionPromise(transaction) {
    return new Promise(function(resolve, reject) {
      transaction.oncomplete = function mdb_onTransactionComplete(event) {
        resolve();
      };
      transaction.onerror = function mdb_onTransactionError(event) {
        reject(event.target.error);
      };
    });
  }

  /**
   * Delete all the messages that have been marked as viewed, this is done at
   * startup to get rid of all the messages that have already been shown to the
   * user.
   *
   * @return {Object} A promise for this operation
   */
  function mdb_deleteViewedMessages() {
    var transaction =
      db.transaction([ MESSAGE_STORE_NAME, VIEWED_STORE_NAME ], 'readwrite');
    var promise = mdb_transactionPromise(transaction);
    var store = transaction.objectStore(MESSAGE_STORE_NAME);
    var viewedStore = transaction.objectStore(VIEWED_STORE_NAME);
    var req = viewedStore.openCursor();

    req.onsuccess = event => {
      var cursor = event.target.result;

      if (cursor) {
        store.delete(cursor.value.timestamp);
        cursor.delete();
        cursor.continue();
      }
    };

    return promise;
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
        mdb_deleteViewedMessages().then(() => resolve(db));
      };
      req.onerror = function mdb_openError(event) {
        reject(event.target.error);
      };
      req.onupgradeneeded = function mdb_upgradeNeeded(event) {
        var db = event.target.result;
        var store = null;

        switch (event.oldVersion) {
          case 0:
            store = db.createObjectStore(
              MESSAGE_STORE_NAME, { keyPath: KEY_PATH }
            );
            store.createIndex(ID_INDEX, ID_INDEX_KEYPATH, { unique: false });
            /* falls through */
          case 1:
            store = db.createObjectStore(
              VIEWED_STORE_NAME, { keyPath: KEY_PATH }
            );
            break; // We're done with the upgrade
          default:
            event.target.transaction.abort();
        }
      };
    });
  }

  /**
   * Process a message executing the associated action. This deals with
   * messages with a 'delete' action by deleting all coresponding message and
   * with new messages by storing them.
   *
   * @param {Object} store The messages' object store.
   * @param {Object} message The message to be processed.
   * @returns {Boolean} Returns true if the message has been stored, false
   *                    if it's been deleted.
   */
  function mdb_processMessage(store, message) {
    /* If the message has a 'delete' action delete all messages with the
     * corresponding 'si-id' field and drop the current message. All other
     * messages should be stored. */
    if (message.action === 'delete') {
      mdb_deleteById(store, message.id);
      return false;
    } else {
      store.put(message);
      return true;
    }
  }

  /**
   * Adds a message to the message database according to the out-of-order
   * delivery rules specified in WAP-167 6.2. Returns a promise that is
   * resolved when the message has been stored. This will dispatch all the
   * appropriate events.
   *
   * @fires new
   * @fires update
   * @fires discard
   * @fires delete
   *
   * @param {Object} message A parsed WAP Push message to be processed.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_put(message) {
    return mdb_open().then(function mdb_openResolved(db) {
      var transaction = db.transaction(MESSAGE_STORE_NAME, 'readwrite');
      var promise = mdb_transactionPromise(transaction);
      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var stored;

      if (!message.id) {
        // The message has no 'si-id' field, store it
        store.put(message);
        mdb_dispatchEvent('new', message);
        return promise;
      }

      if (!message.created) {
        /* The message has a 'si-id' field but no creation time, process it and
         * store it if needed */
        stored = mdb_processMessage(store, message);
        mdb_dispatchEvent(stored ? 'new' : 'discard', message);
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
              stored = mdb_processMessage(store, message);
              mdb_dispatchEvent(stored ? 'update' : 'discard', message);
            } else {
              mdb_dispatchEvent('discard', message);
            }

            return;
          }

          cursor.continue();
        } else {
          /* We found no matching message with a 'created' property set,
           * process the message and store it if needed */
          stored = mdb_processMessage(store, message);
          mdb_dispatchEvent(stored ? 'new' : 'discard', message);
        }
      };

      return promise;
    });
  }

  /**
   * Deletes all messages with the specified si-id. Generates a 'delete'
   * event for every message that was deleted.
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
          mdb_dispatchEvent('delete', message);
        };
        cursor.continue();
      }
    };
  }

  /**
   * Retrieves a message and passes it to the success callback as its sole
   * parameter. Once retrieved the message is marked for removal and deleted
   * the next time the application is started except if it's a CP message in
   * which case it can only be deleted explicitly. A promise is returned that
   * will resolve to the message. If the message is not found then the promise
   * will resolve to the null value.
   *
   * @param {Number} timestamp The timestamp identifiying the message to be
   *        retrieved.
   *
   * @return {Object} A promise for this operation.
   */
  function mdb_retrieve(timestamp) {
    return mdb_open().then(function mdb_openResolved(db) {
      var transaction =
        db.transaction([ MESSAGE_STORE_NAME, VIEWED_STORE_NAME ], 'readwrite');
      var promise = mdb_transactionPromise(transaction);

      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var req = store.get(timestamp.toString());
      var message = null;

      req.onsuccess = function mdb_gotMessage(event) {
        if (event.target.result) {
          message = event.target.result;

          if (message.type != 'text/vnd.wap.connectivity-xml') {
            var viewedStore = transaction.objectStore(VIEWED_STORE_NAME);

            /* Mark message as viewed, we'll delete it the next time we
             * open the application. */
            viewedStore.put(message);
          }
        }
      };

      return promise.then(() => {
        if (message) {
          return message;
        } else {
          return Promise.reject(
            new Error('Message with id ' + timestamp + ' not found')
          );
        }
      });
    });
  }

  /**
   * Deletes all the messages with the specified timestamp.
   *
   * @fires delete
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
          mdb_dispatchEvent('delete', message);
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
      var transaction =
        db.transaction([ MESSAGE_STORE_NAME, VIEWED_STORE_NAME ], 'readwrite');
      var promise = mdb_transactionPromise(transaction);
      var store = transaction.objectStore(MESSAGE_STORE_NAME);
      var viewedStore = transaction.objectStore(VIEWED_STORE_NAME);

      store.clear();
      viewedStore.clear();

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
   * New event, emitted when a new message has been stored in the database
   *
   * @event MessageDB#new
   * @type {Object}
   */

  /**
   * Update event, emitted when an existing message was updated.
   *
   * @event MessageDB#update
   * @type {Object}
   */

  /**
   * Discard event, emitted when a message was discarded instea of being
   * stored in the database.
   *
   * @event MessageDB#discard
   */

  /**
   * Delete event : emitted when a message has been deleted
   *
   * @event MessageDB@delete
   * @type {Object}
   */

  /**
   * List of events which can be listened to on this object.
   */
  var mdb_allowedEvents = [
    'new',
    'update',
    'discard',
    'delete'
  ];

  return EventDispatcher.mixin({
    put: mdb_put,
    retrieve: mdb_retrieve,
    deleteByTimestamp: mdb_deleteByTimestamp,
    clear: mdb_clear
  }, mdb_allowedEvents);
})();
