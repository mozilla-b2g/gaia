/*
 * DeviceStorageDB.js
 * 
 * This library uses the DeviceStorage API and the IndexedDB API to present
 * a simple view of media files stored on a device.  If given a function
 * for parsing metadata, it will automatically extract media metadata from
 * each file and store it in the database along with the filename.
 * 
 * The idea is that a media app should just be able to create a 
 * DeviceStorageDB object and then list the files on it, passing in
 * filtering and sorting criteria.  When files are added or removed, 
 * DSDB will be notified by the DeviceStorage API and will pass those
 * notifications on to media apps.  DSDB should generally handle any
 * rescanning that needs to be done, so that media apps don't have to do it
 */
var createDeviceStorageDB = (function() {

  // The media type is a device storage type: "pictures", "movies", "music".
  // The callback will be passed a DeviceStorageDB object when it is ready.
  // The options argument is optional.  If specified, it is an object that
  // specifies other options:
  // 
  //   directory: a path beneath the device storage root
  //   mimeTypes: an array of mime types (or filename extensions) 
  //      If this is specified, files that don't match will be ignored
  //   metadataParser: a function that takes a File object from DeviceStorage
  //      and returns an object of its metadata to be stored in the db
  //   indexes: an array of keypaths for additional indexes in the db.
  //      The index name will be the same as the keypath.
  //   version: If you ever change any of the items above, increment the
  //     version numbers. This will delete all existing data in the DB and
  //     start over.
  //   XXX: do the callbacks go here, too? fileAddedCallback,
  //     fileRemovedCallback, volumeMountedCallback, volumeUnmountedCallback?
  //
  function createDeviceStorageDB(mediaType, options, callback) {
    var storage;
    try {
      storage = navigator.getDeviceStorage(mediaType)[0];
    }
    catch(e) {
      console.error("createDeviceStorageDB: can't get DeviceStorage object");
      return;
    }

    var indexedDB = window.indexedDB || window.mozIndexedDB;

    // The second argument is optional
    if (arguments.length == 2) {
      callback = options;
      options = undefined;
    }
    if (!options) 
      options = {};
    
    var indexes = options.indexes || [];
    var version = options.version || 0;
    var directory = options.directory || "";

    var dbname = "DeviceStorage/" + mediaType + "/" + directory;
    var openRequest = indexedDB.open(dbname, version);

    // This should never happen for Gaia apps
    openRequest.onerror = function(e) {
      console.error("createDeviceStorageDB:", openRequest.error.name);
    };

    // This should never happen for Gaia apps
    openRequest.onblocked = function(e) {
      console.error("indexedDB.open() is blocked in createDeviceStorageDB()");
    };

    // This is where we create (or delete and recreate) the database
    openRequest.onupgradeneeded = function(e) {
      var db = openRequest.result;

      // If there are already existing object stores, delete them all
      // If the version number changes we just want to start over.
      var existingStoreNames = db.objectStoreNames;
      for(var i = 0; i < existingStoreNames.length; i++) {
        db.deleteObjectStore(existingStoreNames);
      }

      // Now build the database
      var filestore = db.createObjectStore("files", { keyPath: 'filename' });
      indexes.forEach(function(indexName)  {
        // the index name is also the keypath
        filestore.createIndex(indexName, indexName);
      });
    }

    // This is called when we've got the database open and ready.
    // So we create a DeviceStorageDB object and pass it to the callback
    openRequest.onsuccess = function(e) {
      var db = openRequest.result;

      // Log any errors that propagate up to here
      db.onerror = function(event) {
        console.error("DeviceStorageDB: ",
                      event.target.error && event.target.error.name);
      }

      // Create a DeviceStorageDB object and pass it to the callback.
      callback(new DeviceStorageDB(storage, db, options));
    };
  }

  function DeviceStorageDB(storage, db, options) {
    this.storage = storage;
    this.db = db;
    this.directory = options.directory;
    this.mimeTypes = options.mimeTypes || [];
    this.metadataParser = options.metadataParser;
    this.lastScanTime = null;
  }

  DeviceStorageDB.prototype = {
    
    // Look up the specified filename in DeviceStorage and pass the
    // resulting File object to the specified callback.
    // XXX If the file does not exist, what happens? I think the
    // callback is called with null or undefined. Depends on DeviceStorage impl.
    getFile: function(filename, callback, errback) {
      var getRequest = storage.get(filename);
      getRequest.onsuccess = function() {
        callback(getRequest.result);
      };
      getRequest.onerror = function() {
        var errmsg = getRequest.error && getRequest.error.name
        if (errback)
          errback(errmsg);
        else
          console.error("DeviceStorageDB.getFile:", errmsg);
      }
    },

    // Enumerate all files in the filesystem, sorting by the specified
    // property (which must be one of the indexes, or null for the filename).
    // Direction is ascending or descending. Use whatever string
    // constant IndexedDB uses.  f is the function to pass each record to.
    // 
    // Each record is an object like this:
    // 
    // {
    //    // The basic fields are all from the File object
    //    name: // the filename
    //    type: // the file type
    //    size: // the file size
    //    lastModified: // file mod time
    //    metadata: // whatever object the metadata parser returns
    // }
    // 
    // 
    enumerate: function(key, range, direction, callback) {
      // The first three arguments are optional, but the callback
      // is required, and we don't want to have to pass three nulls
      if (arguments.length > 0 && arguments.length < 4) 
        callback = arguments[arguments.length-1];

      var store = this.db.transaction("files").objectStore("files");
      var index;
      
      // If a key is specified, look up the index for that key.
      // Otherwise, just use the basic object store with filename keys.
      if (key)
        index = store.index(key);
      else
        index = store;

      // Now create a cursor for the store or index.
      var cursorRequest = index.openCursor(range, direction);

      cursorRequest.onsuccess = function() {
        var cursor = cursorRequest.result;
        if (cursor) {
          callback(cursor.value);
          cursor.continue();
        }
      };

    },

    // Tell the db to start a manual scan. If a function is passed,
    // it will be called when the scan is complete. I think we don't do
    // this automatically from the constructor, but most apps will start
    // a scan right after calling the constructor and then will proceed to
    // enumerate what is already in the db.  
    // 
    // Filesystem changes discovered by a scan are batched. They do not
    // generate change notifications, and are inserted into the db just
    // before the done callback is called.  Calling enumerate() from
    // done() will get the new values. But done will also be passed an
    // unsorted array of new file records and an array of removed files, so apps
    // don't have to re-enumerate.  They could just handle the array elements
    // as if they had arrived through change events.
    //
    // Hmm.  Let's get rid of the done callback. Scan reports what it discovers
    // in the same way that async changes are reported. But scan batches them
    // (in some unspecified way). (changes always come in arrays).  If an app
    // doesn't want to deal with a large batch of changes, it can just start
    // fresh and call enumerate again.  scan might pass one big batch of new
    // files followed by a big batch of deleted files, for example.
    scan: function(done) {
      var dsdb = this;

      // First, scan for new files since the last scan, if there was one
      if (dsdb.lastScanDate) 
        quickScan(dsdb.lastScanDate);
      else 
        fullScan();
      

      // Do a quick scan and then follow with a full scan
      function quickScan(date) {
        var cursor = dsdb.storage.enumerate(dsdb.directory, {
          since: dsdb.lastScanDate
        });
        dsdb.lastScanDate = new Date();
        cursor.onsuccess = function() {
          var result = cursor.result;
          if (result)
            processNewFile(result, function() { cursor.continue() } );
          else {// When no more files
            saveAndReportQuickScanResults();  // report new files we found
            fullScan();                       // do full scan
          }
        }
      }

      function fullScan() {
      }
      
      // We found a new file in device storage.
      // Extract its metadata and remember it.
      // (Don't store it in the db yet)
      // Then call the callback function (to continue enumerating)
      function processNewFile(file, callback) {
      }

      // Take all the file info objects we found and save them
      // to the database, then report them with the fileAdded callback
      function saveAndReportQuickScanResults() {
      }
    },
  };

  // Export the factory function
  return createDeviceStorageDB;
}());