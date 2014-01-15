
'use strict';

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
var DownloadStore = (function() {

  var datastore;

  // Datastore name declared on the manifest.webapp
  var DATASTORE_NAME = 'download_store';

  // Record Id for the index
  var INDEX_ID = 1;

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

  // Creates the internal Object in the datastore that will act as an index
  function createIndex() {
    return {
      byTimestamp: []
    };
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
        fail({
          message: messageError
        });
        return;
      }

      datastore = ds[0];
      // Checking the length as the index should be there
      datastore.getLength().then(function(length) {
        if (length === 0) {
          console.info('Adding index as datastore is empty');
          datastore.add(createIndex(), INDEX_ID).then(function(id) {
            console.log('The array of indexes has been stored as', id);
            notifyOpenSuccess(success);
          }, function(e) {
            console.error('Error while adding index: ', JSON.stringify(e));
            fail(e);
          });
        } else {
          notifyOpenSuccess(success);
        }
      });
    }, function(e) {
      console.error('Error while opening the DataStore: ', e.target.error.name);
      fail(e);
   });
  }

  function notifyOpenSuccess(cb) {
    readyState = 'initialized';
    window.setTimeout(cb, 0);
    document.dispatchEvent(new CustomEvent('ds-initialized'));
  }

  // These fields will be stored in our datastore
  var fieldsToPropagate =
    ['url', 'path', 'totalBytes', 'contentType', 'startTime', 'state'];

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

  function doAdd(download, req) {
    var downloadCooked = cookDownload(download);
    // Adding our cooked download
    datastore.add(downloadCooked).then(function(id) {
      // Enriched object with the id provided by the datastore
      downloadCooked.id = id;
      datastore.put(downloadCooked, id).then(function() {
        // Get our array of indexes
        datastore.get(INDEX_ID).then(function(myIndex) {
          // Update our index with the id of the new object stored
          myIndex.byTimestamp.push(id);
          datastore.put(myIndex, INDEX_ID).then(defaultSuccess(req),
                                                defaultError(req));
        }, defaultError(req));
      }, defaultError(req));

    }, defaultError(req));
  }

  function add(download) {
    var req = new Request();

    window.setTimeout(function() {
      init(doAdd.bind(null, download, req), req.failed.bind(req));
    });

    return req;
  }

  function doGetAll(req) {
    // Getting our index of downloads
    datastore.get(INDEX_ID).then(function(myIndex) {
      // Get our index and return the downloads
      return myIndex.byTimestamp;
    }, defaultError(req)).then(function(ids) {
      datastore.get.apply(datastore, ids).then(defaultSuccess(req),
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
        datastore.get(INDEX_ID).then(function(myIndex) {
          // Getting our index of downloads
          myIndex.byTimestamp.splice(myIndex.byTimestamp.indexOf(id), 1);
          datastore.put(myIndex, INDEX_ID).then(defaultSuccess(req),
                                                defaultError(req));
        }, defaultError(req));
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

  return {
   /*
    * This method returns an array of complete downloads
    */
    getAll: getAll,

    /*
     * It adds a new download object
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
    remove: remove
  };
}());
