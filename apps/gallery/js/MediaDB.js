'use strict';

/*
 * MediaDB.js: a simple interface to DeviceStorage and IndexedDB.
 *
 * Gaia's media apps (Gallery, Music, Videos) read media files from the phone
 * using the DeviceStorage API. They need to keep track of the complete list
 * of files on the device, as well as the metadata (image sizes, song titles,
 * etc.) that they have extracted from the device. It would be much too slow
 * to scan the filesystem and read all the metadata from all files each time
 * the apps starts up, so the apps need to store filenames and metadata in an
 * IndexedDB database.  This library integrates both DeviceStorage and
 * IndexedDB into a single API. It keeps the database in sync with the
 * filesystem and provides notifications when files are added or deleted.
 *
 * Create a MediaDB object with the MediaDB() constructor. It takes three
 * arguments: 
 * 
 *   mediaType:
 *     one of the DeviceStorage media types such as
 *     "pictures", "movies" or "music".
 * 
 *   metadataParser:
 *     your metadata parser function. This function should
 *     expect two arguments. It will be called with a file to parse and
 *     a callback function.  It should read metadata from the file and then 
 *     pass an object of metadata to the callback.
 * 
 *   options: 
 *     An optional object containing additional MediaDB options.  
 *     Supported options are:
 *       
 *       directory: 
 *          a subdirectory of the DeviceStorage directory. If you are
 *          only interested in images in the screenshots/ subdirectory
 *          for example, you can set this property to "screenshots/".
 *       
 *       mimeTypes: 
 *          an array of MIME types that specifies the kind of files
 *          you are interested in and that your metadata parser function
 *          knows how to handle.  
 *       
 *       indexes:
 *          an array of IndexedDB key path specifications that specify
 *          which properties of each media record should be indexed. If
 *          you want to search or sort on anything other than the file name
 *          specify this property. "size", "date", "type" are valid keypaths
 *          as is "metadata.x" where x is any metadata property returned by
 *          your metadata parser.
 *       
 *       version:
 *          The version of your IndexedDB database. The default value is 1
 *          Setting it to a larger value will delete all data in the database
 *          and rebuild it from scratch. If you ever change your metadata
 *          parser function or alter any of the options above, you should
 *          update the version number.
 * 
 * A MediaDB object must asynchronously open a connection to its database,
 * which means that it is not ready for use when first created.  After calling
 * the MediaDB() constructor, set the onready property of the returned object
 * to a callback function. When the database is ready for use, that function
 * will be invoked with the MediaDB object as its this value. (Note that
 * MediaDB does not define addEventListener: you can only set a single 
 * onready property.)
 * 
 * Typically, the first thing an app will do with a MediaDB object after the
 * onready callback is called is call its enumerate() method. This gets entries
 * from the database and passes them to the specified callback. Each entry
 * that is passed to the callback is an object like this:
 * 
 *   {
 *     name:     // the filename (relative to the DeviceStorage root)
 *     type:     // the file MIME type
 *     size:     // the file size in bytes
 *     date:     // file mod time (as ms since the epoch)
 *     metadata: // whatever object the metadata parser returned
 *   }
 * 
 * Note that db entries do not include the file itself, but only its name.
 * Use the getFile() method to get a File object by name.
 * If you pass only a callback to enumerate(), it calls the callback once
 * for each entry in the database and then calls the callback with an argument
 * of null to indicate that it is done.  
 * 
 * By default, entries are returned in alphabetical order by filename and all
 * entries in the database are returned. You can specify other arguments to
 * enumerate() to change the set of entries that are returned and the order
 * that they are enumerated in.  The full set of arguments are:
 * 
 *   key:
 *     A keypath specification that specifies what field to sort on.
 *     If you specify this argument, it must be one of the values in the
 *     options.indexes array passed to the MediaDB() constructor.
 *     This argument is optional. If omitted, the default is to use the
 *     file name as the key. [XXX: update enumerate to accept "name" as a 
 *     key and map it to the object store]
 * 
 *   range:
 *     An IDBKeyRange object that optionally specifies upper and lower bounds
 *     on the specified key. This argument is optional. If omitted, all
 *     entries in the database are enumerated.
 * 
 *   direction:
 *     One of the IndexedDB direction string "next", "nextunique", "prev"
 *     or "prevunique". This argument is optional. If omitted, the default 
 *     is "next", which enumerates entries in ascending order.
 * 
 *   callback:
 *     The function that database entries should be passed to. This
 *     argument is not optional, and is always passed as the last argument
 *     to enumerate().
 * 
 *
 */

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
  //     start over. The default version is 1.
  //


function MediaDB(mediaType, metadataParser, options) {
  this.mediaType = mediaType
  this.metadataParser = metadataParser;
  if (!options)
    options = {};
  this.indexes = options.indexes || [];
  this.version = options.version || 1;
  this.directory = options.directory || '';
  this.mimeTypes = options.mimeTypes;
  this.lastScanTime = null;
  this.ready = false;

  // Define a dummy metadata parser if we're not given one
  if (!this.metadataParser) {
    this.metadataParser = function(file, callback) {
      setTimeout(function() { callback({}); }, 0);
    }
  }

  var mediadb = this;  // for the nested functions below

  // Set up DeviceStorage
  try {
    this.storage = navigator.getDeviceStorage(mediaType)[0];
  }
  catch (e) {
    console.error("MediaDB(): can't get DeviceStorage object", e);
    return;
  }

  // XXX
  // Register change notification event handlers on the DeviceStorage object.
  // When we get a change, modify the DB, and then call the onchange callback

  // Set up IndexedDB
  var indexedDB = window.indexedDB || window.mozIndexedDB;
  var dbname = 'MediaDB/' + mediaType + '/' + this.directory;
  var openRequest = indexedDB.open(dbname, this.version);

  // This should never happen for Gaia apps
  openRequest.onerror = function(e) {
    console.error('MediaDB():', openRequest.error.name);
  };

  // This should never happen for Gaia apps
  openRequest.onblocked = function(e) {
    console.error('indexedDB.open() is blocked in MediaDB()');
  };

  // This is where we create (or delete and recreate) the database
  openRequest.onupgradeneeded = function(e) {
    console.log("Creating or upgrading media database");

    var db = openRequest.result;

    // If there are already existing object stores, delete them all
    // If the version number changes we just want to start over.
    var existingStoreNames = db.objectStoreNames;
    for (var i = 0; i < existingStoreNames.length; i++) {
      db.deleteObjectStore(existingStoreNames);
    }

    // Now build the database
    var filestore = db.createObjectStore('files', { keyPath: 'name' });
    mediadb.indexes.forEach(function(indexName)  {
      // the index name is also the keypath
      filestore.createIndex(indexName, indexName);
    });
  }

  // This is called when we've got the database open and ready.
  // Call the onready callback
  openRequest.onsuccess = function(e) {
    mediadb.db = openRequest.result;

    // Log any errors that propagate up to here
    mediadb.db.onerror = function(event) {
      console.error('MediaDB: ', event.target.error && event.target.error.name);
    }

    // We're ready now. Call the onready callback function
    mediadb.ready = true;
    if (mediadb.onready)
      mediadb.onready();
  };
}

MediaDB.prototype = {
  get onready() {
    return this._onready;
  },
  // If the user sets onready when the db is already ready, call it
  set onready(cb) { 
    this._onready = cb;
    if (this.ready)
      setTimeout(cb.bind(this), 0);
  },

  // Look up the specified filename in DeviceStorage and pass the
  // resulting File object to the specified callback.
  // XXX If the file does not exist, what happens? I think the
  // callback is called with null or undefined. Depends on DeviceStorage impl.
  getFile: function(filename, callback, errback) {
    var getRequest = this.storage.get(filename);
    getRequest.onsuccess = function() {
      callback(getRequest.result);
    };
    getRequest.onerror = function() {
      var errmsg = getRequest.error && getRequest.error.name;
      if (errback)
        errback(errmsg);
      else
        console.error('MediaDB.getFile:', errmsg);
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
    if (!this.db)
      throw Error('MediaDB is not ready yet. Use the onready callback');

    // The first three arguments are optional, but the callback
    // is required, and we don't want to have to pass three nulls
    if (arguments.length === 1) {
      callback = key;
      key = undefined;
    }
    else if (argument.length === 2) {
      callback = range;
      range = undefined;
    }
    else if (argument.length === 3) {
      callback = direction;
      direction = undefined;
    }
    
    var store = this.db.transaction('files').objectStore('files');
    var index;
    
    // If a key is specified, look up the index for that key.
    // Otherwise, just use the basic object store with filename keys.
    if (key)
      index = store.index(key);
    else
      index = store;

    // Now create a cursor for the store or index.
    var cursorRequest;
    if (range) {
      if (direction)
        cursorRequest = index.openCursor(range, direction);
      else
        cursorRequest = index.openCursor(range);
    }
    else {
      cursorRequest = index.openCursor();
    }

    cursorRequest.onsuccess = function() {
      var cursor = cursorRequest.result;
      if (cursor) {
        callback(cursor.value);
        cursor.continue();
      }
      else {
        // Final time, tell the callback that there are no more.
        callback(null);
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
    if (!this.db)
      throw Error('MediaDB is not ready yet. Use the onready callback');

    var media = this;

    // First, scan for new files since the last scan, if there was one
    // When the quickScan is done it will begin a full scan.  If we don't
    // have a last scan date, then we just begin a full scan immediately
    if (media.lastScanDate)
      quickScan(media.lastScanDate);
    else {
      media.lastScanDate = new Date();
      fullScan();
    }

    // Do a quick scan and then follow with a full scan
    function quickScan(date) {
      var newfiles = [];

      var cursor = media.storage.enumerate(media.directory, {
        since: media.lastScanDate
      });
      media.lastScanDate = new Date();
      cursor.onsuccess = function() {
        var result = cursor.result;
        if (result) {
          processNewFile(result);
        }
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
          // Skip the file if it isn't the right type
          if (media.mimeTypes && media.mimeTypes.indexOf(file.type) === -1) {
            cursor.continue();
            return;
          }

          var fileinfo = {
            name: file.name,
            type: file.type,
            size: file.size,
            date: file.lastModifiedDate.getTime()
          };
          newfiles.push(fileinfo);

          media.metadataParser(file, function(metadata) {
            fileinfo.metadata = metadata;
            cursor.continue();
          }, function(error) {
            console.error(error);
            cursor.continue();
          });
        }
        catch (e) {
          console.error(e);
          cursor.continue();
        }
      }

      // Take all the file info objects we found and save them
      // to the database, then report them with the fileAdded callback
      function saveAndReportQuickScanResults() {
        var transaction = media.db.transaction('files', 'readwrite');
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
        if (media.onchange)
          media.onchange('created', newfiles);
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
      var store = media.db.transaction('files').objectStore('files');
      var getAllRequest = store.getAll();

      getAllRequest.onsuccess = function() {
        var dbfiles = getAllRequest.result;  // Should already be sorted

        // Now get all the files in device storage
        var dsfiles = [];
        var cursor = media.storage.enumerate(media.directory);
        
        cursor.onsuccess = function() {
          var file = cursor.result;
          if (file) {
            if (!media.mimeTypes || media.mimeTypes.indexOf(file.type) !== -1) {
              // XXX: should I just save the file here?
              dsfiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                date: file.lastModifiedDate.getTime()
              });
            }
            cursor.continue();
          }
          else { // When no more files
            compareLists(dbfiles, dsfiles);
          }
        }
      }

      function compareLists(dbfiles, dsfiles) {
        console.log("compareLists", dbfiles.length, dsfiles.length);

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
            dsfile = dsfiles[dsindex];
          else
            dsfile = null;

          // Get the next DB file or null
          var dbfile;
          if (dbindex < dbfiles.length)
            dbfile = dbfiles[dbindex];
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
            if (dsfile.date !== dbfile.date || dsfile.size !== dbfile.size) {
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
          console.log("deleted files:", deletedFiles.length);
          var transaction = media.db.transaction('files', 'readwrite');
          var store = transaction.objectStore('files');
          deletedFiles.forEach(function(fileinfo) {
            store.delete(fileinfo.name);
          });
          // When all the deletions are done, report the deleted files
          // And then deal with the new files
          transaction.oncomplete = function() {
            if (media.onchange)
              media.onchange('deleted', deletedFiles);

            if (createdFiles.length > 0)
              handleCreatedFiles();
          };
        }
        else if (createdFiles.length > 0) {
          // If there were no deleted files, we still need to 
          // handle the created ones.  Especially for first-run
          handleCreatedFiles();
        }

        function handleCreatedFiles() {
          console.log("Created files:", createdFiles.length);
          // Get file metadata and then store the files
          getMetadataForFile(0, storeCreatedFiles);
        }

        // This function gets metadata for created files n and up
        // and then calls the callback. We
        function getMetadataForFile(n, callback) {
          var fileinfo = createdFiles[n];
          var fileRequest = media.storage.get(fileinfo.name);
          fileRequest.onerror = function() {
            console.log("filerequest error", fileRequest.error.name);
          };
          fileRequest.onsuccess = function() {
            var file = fileRequest.result;
            media.metadataParser(file, function(metadata) {
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
          var transaction = media.db.transaction('files', 'readwrite');
          var store = transaction.objectStore('files');
          for (var i = 0; i < createdFiles.length; i++) {
            store.add(createdFiles[i]);
          }

          // Now once we're done storing the files deliver a notification
          if (media.onchange)
            media.onchange('created', createdFiles);
        }
      }
    }
  }
};
