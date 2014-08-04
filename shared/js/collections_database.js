'use strict';

/* global Promise, uuid */

(function(exports) {

  var datastore;

  // Datastore name declared on the manifest.webapp
  var DATASTORE_NAME = 'collections_store';

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
        document.addEventListener('collections-ds-initialized',
          function oninitalized() {
          document.removeEventListener('collections-ds-initialized',
            oninitalized);
          resolve();
        });
        return;
      }

      readyState = 'initializing';

      if (!navigator.getDataStores) {
        console.error('Collection store: DataStore API is not working');
        reject({ name: 'NO_DATASTORE' });
        readyState = 'failed';
        return;
      }

      navigator.getDataStores(DATASTORE_NAME).then(function(ds) {
        if (ds.length < 1) {
          console.error('Collection store: Cannot get access to the Store');
          reject({ name: 'NO_ACCESS_TO_DATASTORE' });
          readyState = 'failed';
          return;
        }

        datastore = ds[0];
        datastore.addEventListener('change', onchangeHandler);
        readyState = 'initialized';
        document.dispatchEvent(new CustomEvent('collections-ds-initialized'));
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
    // TODO it's not necessary to create a new Promise. instead:
    // return init().then(...)
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

  function getAllCategories() {
    return new Promise(function doGet(resolve, reject) {
      getAll().then(function(collections) {
        var categories = [];

        for (var id in collections) {
          var collection = collections[id];
          if (collection.categoryId) {
            categories.push(collection.categoryId);
          }
        }
        resolve(categories);
      }, reject);
    });
  }

  function onchangeHandler(event) {
    var operation = event.operation;
    var callbacks = listeners[operation];
    callbacks && callbacks.forEach(function iterCallback(callback) {
      datastore.get(event.id).then(function got(result) {
        callback.method.call(callback.context || this, {
          type: operation,
          target: result || event
        });
      });
    });
  }

  function addEventListener(type, callback) {
    var context;
    if (!(type in listeners)) {
      listeners[type] = [];
    }

    var cb = callback;
    if (typeof cb === 'object') {
      context = cb;
      cb = cb.handleEvent;
    }

    if (cb) {
      listeners[type].push({
        method: cb,
        context: context
      });
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

      var thisCallback = callback;
      if (typeof thisCallback === 'object') {
        thisCallback = callback.handleEvent;
      }

      if (callbacks[i] && callbacks[i].method === thisCallback) {
        callbacks.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  function add(data) {
    return new Promise(function doAdd(resolve, reject) {
      init().then(function onInitialized() {
        // Generate an ID for the collection if we do not pass one in.
        var id = data.id || uuid();
        Object.defineProperty(data, 'id', {
          enumerable: true,
          configurable: false,
          writable: false,
          value: id
        });

        datastore.add(data, id).then(function add_success() {
          resolve(true); // Collection was added
        }, function add_error() {
          datastore.put(data, id).then(function put_success() {
            resolve(); // Collection was updated
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

  function put(data) {
    return new Promise(function doAdd(resolve, reject) {
      init().then(function onInitialized() {
        datastore.put(data, data.id).then(function success() {
          resolve(); // Collection was updated
        }, reject);
      }, reject);
    });
  }

  function remove(id) {
    return new Promise(function doRemove(resolve, reject) {
      init().then(function onInitialized() {
        datastore.remove(id).then(resolve, reject);
      }, reject);
    });
  }

  exports.CollectionsDatabase = {
   /*
    * This method returns a collection object
    *
    * @param{String} String param that represents an identifier
    */
    get: get,

   /*
    * This method returns an object of collections indexed by id
    */
    getAll: getAll,


    /*
     * This method returns an array of collection.categoryId
     */
    getAllCategories: getAllCategories,

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
     * This method adds a collection in the datastore
     *
     * @param{Object} The collection's data
     */
    add: add,

    /*
     * This method updates a collection in the datastore
     *
     * @param{Object} The collection's data
     */
     put: put,

    /*
     * This method removes a collection from the datastore
     *
     * @param{String} The collection's id
     */
     remove: remove
  };

}(window));
