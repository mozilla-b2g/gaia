
'use strict';

/* global Promise */

(function(exports) {
  
  var datastore;

  // Datastore name declared on the manifest.webapp
  var DATASTORE_NAME = 'bookmarks_store';

  // Indicates the initialization state
  var readyState;

  // Event listeners
  var listeners = Object.create(null);

  function init() {
    return new Promise(function doInit(resolve, reject) {
      if (readyState === 'initialized') {
        resolve();
        return;
      }

      if (readyState === 'initializing') {
        document.addEventListener('ds-initialized', function oninitalized() {
          document.removeEventListener('ds-initialized', oninitalized);
          resolve();
        });
        return;
      }

      readyState = 'initializing';

      if (!navigator.getDataStores) {
        console.error('Bookmark store: DataStore API is not working');
        reject({ name: 'NO_DATASTORE' });
        return;
      }

      navigator.getDataStores(DATASTORE_NAME).then(function(ds) {
        if (ds.length < 1) {
          console.error('Bookmark store: Cannot get access to the Store');
          reject({ message: 'NO_ACCESS_TO_DATASTORE' });
          return;
        }

        datastore = ds[0];
        datastore.addEventListener('change', onchangeHandler);
        readyState = 'initialized';
        document.dispatchEvent(new CustomEvent('ds-initialized'));
        resolve();
      }, reject);
    });
  }

  function doGetAll(resolve, reject) {
    var result = Object.create(null);
    var cursor = datastore.sync();

    function cursorResolve(task) {
      switch (task.operation) {
        case 'update':
        case 'add':
          result[task.data.id] = task.data;
          break;

        case 'remove':
          delete result[task.data.id];
          break;

        case 'clear':
          result = Object.create(null);
          break;

        case 'done':
          resolve(result);
          return;
      }

      cursor.next().then(cursorResolve, reject);
    }

    cursor.next().then(cursorResolve, reject);
  }

  function get(id) {
    return new Promise(function doGet(resolve, reject) {
      init().then(function onInitialized() {
        datastore.get(id).then(resolve, reject);
      }, reject);
    });
  }

  function getAll() {
    return new Promise(function doGet(resolve, reject) {
      init().then(doGetAll.bind(null, resolve, reject), reject);
    });
  }

  function onchangeHandler(event) {
    var operation = event.operation;
    var callbacks = listeners[operation];
    callbacks && callbacks.forEach(function iterCallback(callback) {
      datastore.get(event.id).then(function got(result) {
        callback({
          type: operation,
          target: result
        });
      }, function notExists() {
        callback({
          type: operation,
          target: {
            id: event.id
          }
        });
      });
    });
  }

  function addEventListener(type, callback) {
    if (!(type in listeners)) {
      listeners[type] = [];
    }

    var cb = callback;
    if (typeof cb === 'object') {
      cb = cb.handleEvent;
    }

    if (cb) {
      listeners[type].push(cb);
      init();
    }
  }

  function removeEventListener(type, callback) {
    if (!(type in listeners)) {
      return false;
    }

    var callbacks = listeners[type];
    var length = callbacks.length;
    for (var i = 0; i < length; i++) {
      if (callbacks[i] && callbacks[i] === callback) {
        callbacks.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function add(data) {
    return new Promise(function doAdd(resolve, reject) {
      init().then(function onInitialized() {
        var id = data.bookmarkURL;

        Object.defineProperty(data, 'id', {
          enumerable: true,
          configurable: false,
          writable: false,
          value: id
        });

        datastore.add(data, id).then(function add_success() {
          resolve(true); // Bookmark was added
        }, function add_error() {
          datastore.put(data, id).then(function put_success() {
            resolve(); // Bookmark was updated
          }, reject);
        });
      }, reject);
    });
  }

  function getRevisionId() {
    return new Promise(function doGet(resolve, reject) {
      init().then(function onInitialized() {
        resolve(datastore.revisionId);
      }, reject);
    });
  }

  exports.BookmarksDatabase = {
   /*
    * This method returns a bookmark object
    *
    * @param{String} String param that represents an identifier
    */
    get: get,

   /*
    * This method returns an object of bookmarks indexed by id
    */
    getAll: getAll,

   /*
    * Returns the latest revision UUID
    */
    getRevisionId: getRevisionId,

    /*
     * Method registers the specified listener on the API
     *
     * @param{String} A string representing the event type to listen for
     *
     * @param{Function} The method that receives a notification when an event of
     *                  the specified type occurs
     *
     */
    addEventListener: addEventListener,

    /*
     * Method removes the specified listener on the API
     *
     * @param{String} A string representing the event type to listen for
     *
     * @param{Function} The method that received a notification when an event of
     *                  the specified type occurs
     *
     */
    removeEventListener: removeEventListener,

    /*
     * This method adds a bookmark in the datastore
     *
     * @param{Object} The bookmark's data
     */
    add: add
  };

}(window));
