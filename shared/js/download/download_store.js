'use strict';
/* jshint moz:true */
/* global Promise */
/* global indexedDB */

/*
 * DownloadStore.js: Allows to store download finished ordered by timestamp
 *
 * - Adding a new download:
 *
 *  var req = DownloadStore.add(download);
 *
 *  req.onsuccess = function() {
 *    console.log('Complete download stored successfully');
 *  };
 *
 *  req.onerror = function(e) {
 *    console.error(e);
 *  };
 *
 * - Getting all downloads:
 *
 *  var reqStore = DownloadStore.getAll();
 *
 *  reqStore.onsuccess = function(ev) {
 *    ev.target.result.forEach(function(download) {
 *      // Do something cool with the download
 *    });
 *  };
 *
 *  reqStore.onerror = function(e) {
 *    console.error(e);
 *  };
 *
 * - Removing a existing download:
 *
 *  var req = DownloadStore.remove(download);
 *
 *  req.onsuccess = function() {
 *    console.log('Deleted download successfully');
 *  };
 *
 *  req.onerror = function(e) {
 *    console.error(e);
 *  };
 *
 * WARNING:
 *
 * The system app should add this to its manifest file
 *
 *  "datastores-owned": {
 *    "download_store": {
 *     "description": "Stores download finished"
 *    }
 *  }
 *
 * The settings app should add this to its manifest file
 *
 *  "datastores-access": {
 *    "download_store": {
 *     "description": "Stores download finished"
 *    }
 *  }
 *
 */

/* exported DownloadStore */
var DownloadStore = (function() {
  var datastore;

  // Datastore name declared on the manifest.webapp
  const DATASTORE_NAME = 'download_store';

  var downloadListDB;
  var downloadList = [];
  var lastRevisionId;

  const LIST_DB = 'download_list';
  const LIST_STORE = 'download_list';

  const LIST_KEY = 0;
  const REVISION_KEY = 1;

  /*
  * Request auxiliary object to support asynchronous calls
  */
  var Request = function() {
    this.done = function(result) {
      if (typeof this.onsuccess === 'function') {
        this.result = result;
        window.setTimeout(function() {
          this.onsuccess({
            target: this
          });
        }.bind(this), 0);
      }
    };

    this.failed = function(error) {
      if (typeof this.onerror === 'function') {
        this.error = error;
        window.setTimeout(function() {
          this.onerror({
            target: this
          });
        }.bind(this), 0);
      }
    };
  };

  function promisify(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = (event) => {resolve(event.target.result);};
      request.onerror = (event) => {reject(event.target.errorCode);};
    });
  }

  // Indicates the initialization state
  var readyState;

  function init(success, fail) {
    if (readyState === 'initialized') {
      success();
      return;
    }

    if (readyState === 'initializing') {
      document.addEventListener('ds-initialized', function oninitalized() {
        document.removeEventListener('ds-initialized', oninitalized);
        success();
      });
      return;
    }

    readyState = 'initializing';

    if (!navigator.getDataStores) {
      var messageError = 'Data store: DataStore API is not working';
      console.error(messageError);
      fail({
        message: messageError
      });
      return;
    }

    navigator.getDataStores(DATASTORE_NAME).then(function(ds) {
      var messageError = 'Download Store: Cannot get access to the DataStore';
      if (ds.length < 1) {
        console.error(messageError);
        throw ({
          message: messageError
        });
      }

      datastore = ds[0];
      // Checking the length as the index should be there
    }).then(function() {
      return openDownloadListIndexedDB();
    }).then(function(db) {
      downloadListDB = db;

      var listStore = downloadListDB.transaction(LIST_STORE, 'readonly')
                        .objectStore(LIST_STORE);

      return Promise.all([
        promisify(listStore.get(LIST_KEY))
          .then((value) => {downloadList = value;}),
        promisify(listStore.get(REVISION_KEY))
          .then((value) => {lastRevisionId = value;})
        ]);
    }).then(function() {
      notifyOpenSuccess(success);
    }).catch(function(e) {
      console.error('Error while opening the Download Store: ', e.message);
      fail(e);
    });
  }

  function openDownloadListIndexedDB() {
    return new Promise(function(resolve, reject) {
      var request = indexedDB.open(LIST_DB);

      request.onsuccess = function(event) {
        var db = event.target.result;
        resolve(db);
      };

      request.onerror = function(event) {
        reject(event.target.errorCode);
      };

      request.onupgradeneeded = function(event) {
        var db = event.target.result;

        promisify(db.createObjectStore(LIST_STORE)).then(() => {
          var listStore = db.transaction(LIST_STORE, 'readwrite')
                            .objectStore(LIST_STORE);

          return Promise.all([
            promisify(listStore.add([], LIST_KEY)),
            promisify(listStore.add(0, REVISION_KEY))
          ]);
        }).catch(reject);
      };

      request.onblocked = function(event) {
        reject(event.target.errorCode);
      };
    });
  }

  function notifyOpenSuccess(cb) {
    readyState = 'initialized';
    window.setTimeout(cb, 0);
    document.dispatchEvent(new CustomEvent('ds-initialized'));
  }

  // These fields will be stored in our datastore
  var fieldsToPropagate = ['url', 'path', 'totalBytes', 'contentType',
                           'startTime', 'state', 'storageName', 'storagePath'];

  function cookDownload(download) {
    var ret = Object.create(null);

    fieldsToPropagate.forEach(function(field) {
      ret[field] = download[field];
    });

    // This is the timestamp when the download finished
    ret.finalizeTime = new Date();

    return ret;
  }

  function defaultError(req) {
    return defaultErrorCb.bind(null, req);
  }

  function defaultErrorCb(request, error) {
    request.failed(error);
  }

  function defaultSuccess(req) {
    return defaultSuccessCb.bind(null, req);
  }

  function defaultSuccessCb(request, result) {
    request.done(result);
  }

  function updateDownloadList() {
    var cursor = datastore.sync(lastRevisionId);

    function cursorResolve(task) {
      switch (task.operation) {
        case 'done':
          lastRevisionId = task.revisionId;

          var listStore = downloadListDB.transaction(LIST_STORE, 'readwrite')
                            .objectStore(LIST_STORE);

          return Promise.all([
            promisify(listStore.put(downloadList, LIST_KEY)),
            promisify(listStore.put(lastRevisionId, REVISION_KEY))
            ]);

        case 'clear':
          downloadList = [];
          break;

        case 'add':
          downloadList.push(task.id);
          break;

        case 'update':
          // This doesn't matter for us.
          break;

        case 'remove':
          var i = downloadList.indexOf(task.id);
          if (i >= 0) {
            downloadList.splice(i, 1);
          }
          break;
      }

      return cursor.next().then(cursorResolve);
    }

    return cursor.next().then(cursorResolve);
  }

  function doAdd(download, req) {
    var downloadCooked = cookDownload(download);
    // Adding our cooked download
    datastore.add(downloadCooked).then(function(id) {
      // Enriched object with the id provided by the datastore
      downloadCooked.id = id;
      datastore.put(downloadCooked, id)
               .then(function() { req.done(downloadCooked); },
                     defaultError(req));
    }, defaultError(req));
  }

  function add(download) {
    var req = new Request();

    window.setTimeout(function() {
      init(doAdd.bind(null, download, req), req.failed.bind(req));
    });

    return req;
  }

  function doGet(id, req) {
    datastore.get(id).then(function(download) { req.done(download); },
                           defaultError(req));
  }

  function get(id) {
   var req = new Request();

   window.setTimeout(function() {
    init(doGet.bind(null, id, req), req.failed.bind(req));
   });

   return req;
  }

  function doGetAll(req) {
    updateDownloadList().then(function() {
      datastore.get.apply(datastore, downloadList).then(defaultSuccess(req),
                                                        defaultError(req));
    }, defaultError(req));
  }

  function getAll() {
    var req = new Request();

    window.setTimeout(function() {
      init(doGetAll.bind(null, req), req.failed.bind(req));
    });

    return req;
  }

  function doRemove(id, req) {
    // Removing the download object from datastore
    datastore.remove(id).then(function(success) {
      if (success) {
        defaultSuccess(req);
      } else {
        req.failed({
          message: 'The download with id: ' + id + 'does not exist'
        });
      }
    }, defaultError(req));
  }

  function remove(download) {
    var req = new Request();

    window.setTimeout(function() {
      init(doRemove.bind(null, download.id, req), req.failed.bind(req));
    });

    return req;
  }

  function doAddListener(listener) {
    datastore.addEventListener('change', listener);
  }

  function addListener(listener) {
    var req = new Request();

    window.setTimeout(function() {
      init(doAddListener.bind(null, listener), req.failed.bind(req));
    });

    return req;
  }

  function doRemoveListener(listener) {
    datastore.removeEventListener('change', listener);
  }

  function removeListener(listener) {
    var req = new Request();

    window.setTimeout(function() {
      init(doRemoveListener.bind(null, listener), req.failed.bind(req));
    });

    return req;
  }

  return {
   /*
    * This method returns the download with the specified id.
    */
   get: get,

   /*
    * This method returns an array of complete downloads
    */
    getAll: getAll,

    /*
     * It adds a new download object and returns the new datastore
     * download object
     *
     * @param{Object} Download object provided by the API
     *
     */
    add: add,

    /*
     * It removes a download object
     *
     * @param{Object} The download object to be removed from the datastore
     *
     */
    remove: remove,

    /*
     * Add a listener that will receive datastore change events.
     *
     * @param{Function} The listener to be added.
     */
    addListener: addListener,

    /*
     * Remove a listener previously added via addListener.
     *
     * @param{Function} The listener to be removed.
     */
    removeListener: removeListener
  };
}());
