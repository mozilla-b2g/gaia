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

  // The callback will be passed a DeviceStorageDB object when it is ready.
  // The options argument is an object that specifies various options:
  //
  //   mediaType: the device storage type: 'pictures', 'movies', 'music'.
  //   onchange: the callback function that gets change notifications
  //     1st callback argument is a string: 'created', 'deleted',
  //           'mounted' or 'umounted'
  //     2nd argument is an array of file info objects for add and remove.
  //
  //   These first two options are required. The rest are optional:
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
  //
  function createDeviceStorageDB(options, callback) {
    var mediaType = options.mediaType;
    var storage;
    try {
      storage = navigator.getDeviceStorage(mediaType)[0];
    }
    catch (e) {
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
    var directory = options.directory || '';

    var dbname = 'DeviceStorage/' + mediaType + '/' + directory;
    var openRequest = indexedDB.open(dbname, version);

    // This should never happen for Gaia apps
    openRequest.onerror = function(e) {
      console.error('createDeviceStorageDB:', openRequest.error.name);
    };

    // This should never happen for Gaia apps
    openRequest.onblocked = function(e) {
      console.error('indexedDB.open() is blocked in createDeviceStorageDB()');
    };

    // This is where we create (or delete and recreate) the database
    openRequest.onupgradeneeded = function(e) {
      var db = openRequest.result;

      // If there are already existing object stores, delete them all
      // If the version number changes we just want to start over.
      var existingStoreNames = db.objectStoreNames;
      for (var i = 0; i < existingStoreNames.length; i++) {
        db.deleteObjectStore(existingStoreNames);
      }

      // Now build the database
      var filestore = db.createObjectStore('files', { keyPath: 'name' });
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
        console.error('DeviceStorageDB: ',
                      event.target.error && event.target.error.name);
      }

      // Create a DeviceStorageDB object and pass it to the callback.
      callback(new DeviceStorageDB(storage, db, options));
    };
  }

  function DeviceStorageDB(storage, db, options) {
    this.storage = storage;
    this.db = db;
    this.mediaType = options.mediaType;
    this.onchange = options.onchange;
    this.directory = options.directory;
    this.mimeTypes = options.mimeTypes || [];
    this.metadataParser = options.metadataParser;
    this.lastScanTime = null;

    // XXX
    // Register change notification event handlers on the DeviceStorage object.
    // When we get a change, modify the DB, and then call the onchange callback
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
        var errmsg = getRequest.error && getRequest.error.name;
        if (errback)
          errback(errmsg);
        else
          console.error('DeviceStorageDB.getFile:', errmsg);
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
    //    date: // file mod time
    //    metadata: // whatever object the metadata parser returns
    // }
    //
    //
    enumerate: function(key, range, direction, callback) {
      // The first three arguments are optional, but the callback
      // is required, and we don't want to have to pass three nulls
      if (arguments.length > 0 && arguments.length < 4)
        callback = arguments[arguments.length - 1];

      var store = this.db.transaction('files').objectStore('files');
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

    // Tell the db to start a manual scan. I think we don't do
    // this automatically from the constructor, but most apps will start
    // a scan right after calling the constructor and then will proceed to
    // enumerate what is already in the db. If scan performance is bad
    // for large media collections, apps can just have the user specify
    // when to rescan rather than doing it automatically. Until we have
    // change event notifications, gaia apps might want to do a scan
    // every time they are made visible.
    //
    // Filesystem changes discovered by a scan are generally
    // batched. If a scan discovers 10 new files, the information
    // about those files will generally be passed as an array to a the
    // onchange handler rather than calling that handler once for each
    // newly discovered file.  Apps can decide whether to handle
    // batches by processing each element individually or by just starting
    // fresh with a new call to enumerate().
    //
    // Scan details are not tightly specified, but the goal is to be
    // as efficient as possible.  We'll try to do a quick date-based
    // scan to look for new files and report those first. Following
    // that, a full scan will be compared with a full dump of the DB
    // to see if any files have been deleted.
    //
    scan: function(done) {
      var dsdb = this;

      // First, scan for new files since the last scan, if there was one
      // When the quickScan is done it will begin a full scan.  If we don't
      // have a last scan date, then we just begin a full scan immediately
      if (dsdb.lastScanDate)
        quickScan(dsdb.lastScanDate);
      else {
        dsdb.lastScanDate = new Date();
        fullScan();
      }

      // Do a quick scan and then follow with a full scan
      function quickScan(date) {
        var newfiles = [];

        var cursor = dsdb.storage.enumerate(dsdb.directory, {
          since: dsdb.lastScanDate
        });
        dsdb.lastScanDate = new Date();
        cursor.onsuccess = function() {
          var result = cursor.result;
          if (result)
            processNewFile(result);
          else {// When no more files
            if (newfiles.length > 0)
              saveAndReportQuickScanResults();  // report new files we found
            fullScan();                         // do full scan
          }
        }

        // We found a new file in device storage.
        // Extract its metadata and remember it.
        // (Don't store it in the db yet)
        // Then call cursor.continue to move on to the next file
        function processNewFile(file) {
          try {
            var fileinfo = {
              name: file.name,
              type: file.type,
              size: file.size,
              date: file.lastModifiedDate
            };
            newfiles.push(fileinfo);

            if (dsdb.metadataParser) {
              dsdb.metadataParser(file, function(metadata) {
                fileinfo.metadata = metadata;
                cursor.continue();
              }, function(error) {
                console.error(error);
                cursor.continue();
              });
            }
            else {
              fileinfo.metadata = null;
              callback();
            }
          }
          catch (e) {
            console.error(e);
            cursor.continue();
          }
        }

        // Take all the file info objects we found and save them
        // to the database, then report them with the fileAdded callback
        function saveAndReportQuickScanResults() {
          var transaction = this.db.transaction('files', 'readwrite');
          var store = transaction.objectStore('files');

          // Save the new files
          for (var i = 0; i < newfiles.length; i++) {
            var fileinfo = newfiles[i];

            // When an existing file is overwritten, we should report
            // it as a deletion followed by a creation. So for this quick
            // scan pass, we're only interested in new files, which means
            // that we need to use add() rather than put() to add to the db.
            var addRequest = store.add(fileinfo);

            addRequest.onerror = function() {
              // It probably failed because a file by that name is
              // already in the db. Don't save or report it now. We'll
              // handle it when we do a full scan.
              newfiles.splice(i, 1);  // remove the file
              i--;
            }
          }

          // Finally, call the onchange handler about the new files
          dsdb.onchange('created', newfiles);
        }
      }

      // Get a complete list of files from DeviceStorage
      // Get a complete list of files from IndexedDB.
      // Sort them both (the indexedDB list may already be sorted)
      // Step through the lists noting deleted files and created files.
      // Pay attention to files whose size or date has changed and
      // treat those as deletions followed by insertions.
      // Sync up the database while stepping through the lists and
      // then call the onchange handler to report deleted files and
      // created files.  (Report deleted files first because we model
      // file changes as deletions followed by creations)
      function fullScan() {
        var store = this.db.transaction('files').objectStore('files');
        var getAllRequest = store.getAll();

        getAllRequest.onsuccess = function() {
          var dbfiles = getAllRequest.result;  // Should already be sorted

          // Now get all the files in device storage
          var cursor = dsdb.storage.enumerate(dsdb.directory);
          var dsfiles = [];
          cursor.onsuccess = function() {
            var file = cursor.result;
            if (file) {
              // XXX: should I just save the file here?
              dsfiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                date: file.lastModifiedDate
              });
            }
            else { // When no more files
              compareLists(dbfiles, dsfiles);
            }
          }
        }

        function compareLists(dbfiles, dsfiles) {
          // The dbfiles are sorted when we get them from the db.
          // But the ds files are not sorted
          dsfiles.sort(function(a, b) {
            if (a.name < b.name)
              return -1;
            else
              return 1;
          });

          var deletedFiles = [];
          var createdFiles = [];

          // Loop through both the dsfiles and dbfiles lists
          var dsindex = 0, dbindex = 0;
          while (true) {
            // Get the next DeviceStorage file or null
            var dsfile;
            if (dsindex < dsfiles.length)
              dsfile = dsfiles.dsfiles[dsindex];
            else
              dsfile = null;

            // Get the next DB file or null
            var dbfile;
            if (dbindex < dbfiles.length)
              dbfile = dbfiles.dbfiles[dbindex];
            else
              dbfile = null;

            // Case 1: both files are null.  If so, we're done.
            if (dsfile === null && dbfile === null)
              break;

            // Case 2: no more files in the db.  This means that
            // the file from ds is a new one
            if (dbfile === null) {
              createdFiles.push(dsfile);
              dsindex++;
              continue;
            }

            // Case 3: no more files in ds. This means that the db file
            // has been deleted
            if (dsfile === null) {
              deletedFiles.push(dbfile);
              dbindex++;
              continue;
            }

            // Case 4: two files with the same name.
            // 4a: date and size are the same for both: do nothing
            // 4b: file has changed: it is both a deletion and a creation
            if (dsfile.name === dbfile.name) {
              if (dsfile.date !== dbfile.date || dsfile.size !== dsfile.size) {
                deletedFiles.push(dbfile);
                createdFiles.push(dsfile);
              }
              dsindex++;
              dbindex++;
              continue;
            }

            // Case 5: the dsfile name is less than the dbfile name.
            // This means that the dsfile is new.  Like case 2
            if (dsfile.name < dbfile.name) {
              createdFiles.push(dsfile);
              dsindex++;
              continue;
            }

            // Case 6: the dsfile name is greater than the dbfile name.
            // this means that the dbfile no longer exists on disk
            if (dsfile.name > dbfile.name) {
              deletedFiles.push(dbfile);
              dbindex++;
              continue;
            }

            // That should be an exhaustive set of possiblities
            // and we should never reach this point.
            console.error('Assertion failed');
          }

          // Deal with the deleted files first
          if (deletedFiles.length > 0) {
            var transaction = this.db.transaction('files', 'readwrite');
            var store = transaction.objectStore('files');
            deletedFiles.forEach(function(fileinfo) {
              store.delete(fileinfo.name);
            });
            // When all the deletions are done, report the deleted files
            // And then deal with the new files
            transaction.oncomplete = function() {
              dsdb.onchange('deleted', deletedFiles);

              if (createdFiles.length > 1)
                handleCreatedFiles();
            };
          }

          function handleCreatedFiles() {
            if (dsdb.metadataParser) {
              // If we've got a metadata parser, get file metadata and
              // then store the files
              getMetadataForFile(0, storeCreatedFiles);
            }
            else {
              // Otherwise, just store the files
              storeCreatedFiles();
            }
          }

          // This function gets metadata for created files n and up
          // and then calls the callback. We
          function getMetadataForFile(n, callback) {
            var fileinfo = createdFiles[n];
            var fileRequest = storage.get(fileinfo.name);
            fileRequest.onsuccess = function() {
              var file = fileRequest.result;
              dsdb.metadataParser(file, function(metadata) {
                fileinfo.metadata = metadata;
                n++;
                if (n === createdFiles.length) // if we're done
                  callback();
                else  // Otherwise get the next one
                  getMetadataForFile(n, callback);
              });
            }
          }

          function storeCreatedFiles() {
            var transaction = this.db.transaction('files', 'readwrite');
            var store = transaction.objectStore('files');
            for (var i = 0; i < createdFiles.length; i++) {
              store.add(createdFiles[i]);
            }

            // Now once we're done storing the files deliver a notification
            dsdb.onchange('created', createdFiles);
          }
        }
      }
    }
  };

  // Export the factory function
  return createDeviceStorageDB;
}());
