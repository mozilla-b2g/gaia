/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * MediaDB.js: a simple interface to DeviceStorage and IndexedDB that serves
 *             as a model of the filesystem and provides easy access to the
 *             user's media files and their metadata.
 *
 * Gaia's media apps (Gallery, Music, Videos) read media files from the phone
 * using the DeviceStorage API. They need to keep track of the complete list of
 * media files, as well as the metadata (image thumbnails, song titles, etc.)
 * they have extracted from those files. It would be much too slow to scan the
 * filesystem and read all the metadata from all files each time the apps starts
 * up, so the apps need to store the list of files and metadata in an IndexedDB
 * database. This library integrates both DeviceStorage and IndexedDB into a
 * single API. It keeps the database in sync with the filesystem and provides
 * notifications when files are added or deleted.
 *
 * CONSTRUCTOR
 *
 * Create a MediaDB object with the MediaDB() constructor. It takes three
 * arguments:
 *
 *   mediaType:
 *     one of the DeviceStorage media types: "pictures", "movies" or "music".
 *
 *   metadataParser:
 *     your metadata parser function. This function should expect three
 *     arguments. It will be called with a file to parse and two callback
 *     functions. It should read metadata from the file and then pass an object
 *     of metadata to the first callback. If parsing fails it should pass an
 *     Error object or error message to the second callback. If you omit this
 *     argument or pass null, a dummy parser that invokes the callback with an
 *     empty object will be used instead.
 *
 *   options:
 *     An optional object containing additional MediaDB options.
 *     Supported options are:
 *
 *       directory:
 *          a subdirectory of the DeviceStorage directory. If you are only
 *          interested in images in the screenshots/ subdirectory for example,
 *          you can set this property to "screenshots/".
 *
 *       mimeTypes:
 *          an array of MIME types that specifies the kind of files you are
 *          interested in and that your metadata parser function knows how to
 *          handle. DeviceStorage infers MIME type from filename extension and
 *          filters the files it returns based on their extension. Use this
 *          property if you want to restrict the set of mime types further.
 *
 *       indexes:
 *          an array of IndexedDB key path specifications that specify which
 *          properties of each media record should be indexed. If you want to
 *          search or sort on anything other than the file name and date you
 *          should set this property. "size", and "type" are valid keypaths as
 *          is "metadata.x" where x is any metadata property returned by your
 *          metadata parser.
 *
 *       version:
 *          The version of your IndexedDB database. The default value is 1
 *          Setting it to a larger value will delete all data in the database
 *          and rebuild it from scratch. If you ever change your metadata parser
 *          function or alter the array of indexes.
 *
 *       autoscan:
 *          Whether MediaDB should automatically scan every time it becomes
 *          ready. The default is true. If you set this to false you are
 *          responsible for calling scan() in response to the 'ready' event.
 *
 *       batchHoldTime:
 *          How long (in ms) to wait after finding a new file during a scan
 *          before reporting it. Longer hold times allow more batching of
 *          changes. The default is 100ms.
 *
 *       batchSize:
 *          When batching changes, don't allow the batches to exceed this
 *          amount. The default is 0 which means no maximum batch size.
 *
 * MediaDB STATE
 *
 * A MediaDB object must asynchronously open a connection to its database, and
 * asynchronously check on the availability of device storage, which means that
 * it is not ready for use when first created. After calling the MediaDB()
 * constructor, register an event listener for 'ready' events with
 * addEventListener() or by setting the onready property. You must not use
 * the MediaDB object until the ready event has been delivered or until
 * the state property is set to MediaDB.READY.
 *
 * The DeviceStorage API is not always available, and MediaDB is not usable if
 * DeviceStorage is not usable. If the user removes the SD card from their
 * phone, then DeviceStorage will not be able to read or write files,
 * obviously.  Also, when a USB Mass Storage session is in progress,
 * DeviceStorage is not available either. If DeviceStorage is not available
 * when a MediaDB object is created, an 'unavailable' event will be fired
 * instead of a 'ready' event. Subsequently, a 'ready' event will be fired
 * whenever DeviceStorage becomes available, and 'unavailable' will be fired
 * whenever DeviceStorage becomes unavailable. Media apps can handle the
 * unavailable case by displaying an informative message in an overlay that
 * prevents all user interaction with the app.
 *
 * The 'ready' and 'unavailable' events signal changes to the state of a
 * MediaDB object. The state is also available in the state property of the
 * object.  The possible values of this property are the following:
 *
 *   Value        Constant           Meaning
 *   ----------------------------------------------------------------------
 *   'opening'    MediaDB.OPENING    MediaDB is initializing itself
 *   'ready'      MediaDB.READY      MediaDB is available and ready for use
 *   'nocard'     MediaDB.NOCARD     Unavailable because there is no sd card
 *   'unmounted'  MediaDB.UNMOUNTED  Unavailable because the card is unmounted
 *   'closed'     MediaDB.CLOSED     Unavailable because close() was called
 *
 * When an 'unavailable' event is fired, the detail property of the event
 * object specifies the reason that the MediaDB is unavailable. It is one of
 * the state values 'nocard', 'unmounted' or 'closed'.
 *
 * The 'nocard' state occurs when device storage is not available because
 * there is no SD card in the device. This is typically a permanent failure
 * state, and media apps cannot run without an SD card. It can occur
 * transiently, however, if the user is swapping SD cards while a media app is
 * open.
 *
 * The 'unmounted' state occurs when the device's SD card is unmounted. This
 * is generally a temporary condition that occurs when the user starts a USB
 * Mass Storage transfer session by plugging their device into a computer.  In
 * this case, MediaDB will become available again as soon as the device is
 * unplugged (it may have different files on it, though: see the SCANNING
 * section below).
 *
 * DATABASE RECORDS
 *
 * MediaDB stores a record in its IndexedDB database for each DeviceStorage
 * file of the appropriate media type, directory and mime type. The records
 * are objects of this form:
 *
 *   {
 *     name:     // the filename (relative to the DeviceStorage root)
 *     type:     // the file MIME type (extension-based, from DeviceStorage)
 *     size:     // the file size in bytes
 *     date:     // file modification time (as ms since the epoch)
 *     metadata: // whatever object the metadata parser returned
 *   }
 *
 * Note that the database records do not include the file itself, but only its
 * name. Use the getFile() method to get a File object (a Blob) by name.
 *
 * ENUMERATING FILES
 *
 * Typically, the first thing an app will do with a MediaDB object after the
 * ready event is triggered is call the enumerate() method to obtain the list
 * of files that MediaDB already knows about from previous app invocations.
 * enumerate() gets records from the database and passes them to the specified
 * callback. Each record that is passed to the callback is an object in the
 * form shown above.
 *
 * If you pass only a callback to enumerate(), it calls the callback once for
 * each entry in the database and then calls the callback with an argument of
 * null to indicate that it is done.
 *
 * By default, entries are returned in alphabetical order by filename and all
 * entries in the database are returned. You can specify other arguments to
 * enumerate() to change the set of entries that are returned and the order that
 * they are enumerated in. The full set of arguments are:
 *
 *   key:
 *     A keypath specification that specifies what field to sort on.  If you
 *     specify this argument, it must be 'name', 'date', or one of the values
 *     in the options.indexes array passed to the MediaDB() constructor.  This
 *     argument is optional. If omitted, the default is to use the file name
 *     as the key.
 *
 *   range:
 *     An IDBKeyRange object that optionally specifies upper and lower bounds on
 *     the specified key. This argument is optional. If omitted, all entries in
 *     the database are enumerated. See IndexedDB documentation for more on
 *     key ranges.
 *
 *   direction:
 *     One of the IndexedDB direction string "next", "nextunique", "prev" or
 *     "prevunique". This argument is optional. If omitted, the default is
 *     "next", which enumerates entries in ascending order.
 *
 *   callback:
 *     The function that database entries should be passed to. This argument is
 *     not optional, and is always passed as the last argument to enumerate().
 *
 * The enumerate() method returns database entries. These include file names,
 * but not the files themselves. enumerate() interacts solely with the
 * IndexedDB; it does not use DeviceStorage. If you want to use a media file
 * (to play a song or display a photo, for example) call the getFile() method.
 *
 * enumerate() returns an object with a 'state' property that starts out as
 * 'enumerating' and switches to 'complete' when the enumeration is done. You
 * can cancel a pending enumeration by passing this object to the
 * cancelEnumeration() method. This switches the state to 'cancelling' and then
 * it switches to 'cancelled' when the cancellation is complete. If you call
 * cancelEnumeration(), the callback function you passed to enumerate() is
 * guaranteed not to be called again.
 *
 * In addition to enumerate(), there are two other methods you can use
 * to enumerate database entries:
 *
 * enumerateAll() takes the same arguments and returns the same values
 * as enumerate(), but it batches the results and passes them in an
 * array to the callback function.
 *
 * getAll() takes a callback argument and passes it an array of all
 * entries in the database, sorted by filename. It does not allow you
 * to specify a key, range, or direction, but if you need all entries
 * from the database, this method is is much faster than enumerating
 * entries individually.
 *
 * FILESYSTEM CHANGES
 *
 * When media files are added or removed, MediaDB reports this by triggering
 * 'created' and 'deleted' events.
 *
 * When a 'created' event is fired, the detail property of the event is an
 * array of database record objects. When a single file is created (for
 * example when the user takes a picture with the Camera app) this array has
 * only a single element. But when MediaDB scans for new files (see SCANNING
 * below) it may batch multiple records into a single created event. If a
 * 'created' event has many records, apps may choose to simply rebuild their
 * UI from scratch with a new call to enumerate() instead of handling the new
 * files one at a time.
 *
 * When a 'deleted' event is fired, the detail property of the event is an
 * array of the names of the files that have been deleted. As with 'created'
 * events, the array may have a single element or may have many batched
 * elements.
 *
 * If MediaDB detects that a file has been modified in place (because its
 * size or date changes) it treats this as a deletion of the old version and
 * the creation of a new version, and will fire a deleted event followed by
 * a created event.
 *
 * The created and deleted events are not triggered until the corresponding
 * files have actually been created and deleted and their database records
 * have been updated.
 *
 * SCANNING
 *
 * MediaDB automatically scans for new and deleted files every time it enters
 * the MediaDB.READY state. This happens when the MediaDB object is first
 * created, and also when an SD card is removed and reinserted or when the
 * user finishes a USB Mass Storage session. If the scan finds new files, it
 * reports them with one or more 'created' events. If the scan finds that
 * files have been deleted, it reports them with one or more 'deleted' events.
 *
 * MediaDB fires a 'scanstart' event when a scan begins and fires a 'scanend'
 * event when the scan is complete. Apps can use these events to let the user
 * know that a scan is in progress.
 *
 * The scan algorithm attempts to quickly look for new files and reports those
 * first. It then begins a slower full scan phase where it checks that each of
 * the files it already knows about is still present.
 *
 * EVENTS
 *
 * As described above, MediaDB sends events to communicate with the apps
 * that use it. The event types and their meanings are:
 *
 *   Event         Meaning
 *  --------------------------------------------------------------------------
 *   ready         MediaDB is ready for use
 *   unavailable   MediaDB is unavailable (often because of USB file transfer)
 *   created       One or more files were created
 *   deleted       One or more files were deleted
 *   scanstart     MediaDB is scanning
 *   scanend       MediaDB has finished scanning
 *
 * Because MediaDB is a JavaScript library, these are not real DOM events, but
 * simulations.
 *
 * MediaDB defines two-argument versions of addEventListener() and
 * removeEventListener() and also allows you to define event handlers by
 * setting 'on' properties like 'onready' and 'onscanstart'.
 *
 * The objects passed on MediaDB event handlers are not true Event objects but
 * simulate a CustomEvent by defining type, target, currentTarget, timestamp
 * and detail properties.  For MediaDB events, it is the detail property that
 * always holds the useful information. These simulated event objects do not
 * have preventDefault(), stopPropagation() or stopImmediatePropagation()
 * methods.
 *
 * MediaDB events do not bubble and cannot be captured.
 *
 * METHODS
 *
 * MediaDB defines the following methods:
 *
 * - addEventListener(): register a function to call when an event is fired
 *
 * - removeEventListener(): unregister an event listener function
 *
 * - enumerate(): for each file that MediaDB knows about, pass its database
 *     record object to the specified callback. By default, records are returned
 *     in alphabetical order by name, but optional arguments allow you to
 *     specify a database index, a key range, and a sort direction.
 *
 * - cancelEnumeration(): stops an enumeration in progress. Pass the object
 *     returned by enumerate().
 *
 * - getFile(): given a filename and a callback, this method looks up the
 *     named file in DeviceStorage and passes it (a Blob) to the callback.
 *     An error callback is available as an optional third argument.
 *
 * - count(): count the number of records in the database and pass the value
 *     to the specified callback. Like enumerate(), this method allows you
 *     to specify the name of an index and a key range if you only want to
 *     count some of the records.
 *
 * - updateMetadata(): updates the metadata associated with a named file
 *
 * - addFile(): given a filename and a blob this method saves the blob as a
 *     named file to device storage.
 *
 * - deleteFile(): deletes the named file from device storage and the database
 *
 * - close(): closes the IndexedDB connections and stops listening to
 *     DeviceStorage events. This permanently puts the MediaDB object into
 *     the MediaDB.CLOSED state in which it is unusable.
 *
 * - freeSpace(): call the DeviceStorage freeSpace() method and pass the
 *     result to the specified callback
 */
var MediaDB = (function() {

  function MediaDB(mediaType, metadataParser, options) {
    this.mediaType = mediaType;
    this.metadataParser = metadataParser;
    if (!options)
      options = {};
    this.indexes = options.indexes || [];
    this.version = options.version || 1;
    this.directory = options.directory || '';
    this.mimeTypes = options.mimeTypes;
    this.autoscan = (options.autoscan !== undefined) ? options.autoscan : true;
    this.state = MediaDB.OPENING;
    this.scanning = false;  // becomes true while scanning

    // While scanning, we attempt to send change events in batches.
    // After finding a new or deleted file, we'll wait this long before
    // sending events in case we find another new or deleted file right away.
    this.batchHoldTime = options.batchHoldTime || 100;

    // But we'll send a batch of changes right away if it gets this big
    // A batch size of 0 means no maximum batch size
    this.batchSize = options.batchSize || 0;

    if (this.directory &&
        this.directory[this.directory.length - 1] !== '/')
      this.directory += '/';

    this.dbname = 'MediaDB/' + this.mediaType + '/' + this.directory;

    var media = this;  // for the nested functions below

    // Private implementation details in this object
    this.details = {
      // This maps event type -> array of listeners
      // See addEventListener and removeEventListener
      eventListeners: {},

      // Properties for queuing up db insertions and deletions and also
      // for queueing up notifications to be sent
      pendingInsertions: [],   // Array of filenames to insert
      pendingDeletions: [],    // Array of filenames to remove
      whenDoneProcessing: [],  // Functions to run when queue is empty

      pendingCreateNotifications: [],  // Array of fileinfo objects
      pendingDeleteNotifications: [],  // Ditto
      pendingNotificationTimer: null,

      // This property holds the modification date of the newest file we have.
      // We need to know the newest file in order to look for newer ones during
      // scanning. We initialize newestFileModTime during initialization by
      // actually checking the database (using the date index). We also update
      // this property every time a new record is added to the database.
      newestFileModTime: 0
    };

    // Define a dummy metadata parser if we're not given one
    if (!this.metadataParser) {
      this.metadataParser = function(file, callback) {
        setTimeout(function() { callback({}); }, 0);
      };
    }

    // Open the database
    // Note that the user can upgrade the version and we can upgrade the version
    var openRequest = indexedDB.open(this.dbname,
                                     this.version * MediaDB.VERSION);

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
      var db = openRequest.result;

      // If there are already existing object stores, delete them all
      // If the version number changes we just want to start over.
      var existingStoreNames = db.objectStoreNames;
      for (var i = 0; i < existingStoreNames.length; i++) {
        db.deleteObjectStore(existingStoreNames[i]);
      }

      // Now build the database
      var filestore = db.createObjectStore('files', { keyPath: 'name' });
      // Always index the files by modification date
      filestore.createIndex('date', 'date');
      // And index them by any other file properties or metadata properties
      // passed to the constructor
      media.indexes.forEach(function(indexName)  {
        // Don't recreate indexes we've already got
        if (indexName === 'name' || indexName === 'date')
          return;
        // the index name is also the keypath
        filestore.createIndex(indexName, indexName);
      });
    };

    // This is called when we've got the database open and ready.
    openRequest.onsuccess = function(e) {
      media.db = openRequest.result;

      // Log any errors that propagate up to here
      media.db.onerror = function(event) {
        console.error('MediaDB: ',
                      event.target.error && event.target.error.name);
      };

      // Query the db to find the modification time of the newest file
      var cursorRequest =
        media.db.transaction('files', 'readonly')
        .objectStore('files')
        .index('date')
        .openCursor(null, 'prev');

      cursorRequest.onerror = function() {
        // If anything goes wrong just display an error.
        // If this fails, don't even attempt error recovery
        console.error('MediaDB initialization error', cursorRequest.error);
      };
      cursorRequest.onsuccess = function() {
        var cursor = cursorRequest.result;
        if (cursor) {
          media.details.newestFileModTime = cursor.value.date;
        }
        else {
          // No files in the db yet, so use a really old time
          media.details.newestFileModTime = 0;
        }

        // The DB is initialized, and we've got our mod time
        // so move on and initialize device storage
        initDeviceStorage();
      };
    };

    function initDeviceStorage() {
      // Set up DeviceStorage
      // If storage is null, then there is no sdcard installed and
      // we have to abort.
      media.storage = navigator.getDeviceStorage(mediaType);

      // Handle change notifications from device storage
      // We set this onchange property to null in the close() method
      // so don't use addEventListener here
      media.storage.addEventListener('change', deviceStorageChangeHandler);
      media.details.dsEventListener = deviceStorageChangeHandler;

      // Use available() to figure out if there is actually an sdcard there
      // and emit a ready or unavailable event
      var availreq = media.storage.available();
      availreq.onsuccess = function(e) {
        switch (e.target.result) {
        case 'available':
          changeState(media, MediaDB.READY);
          if (media.autoscan)
            scan(media); // Start scanning as soon as we're ready
          break;
        case 'unavailable':
          changeState(media, MediaDB.NOCARD);
          break;
        case 'shared':
          changeState(media, MediaDB.UNMOUNTED);
          break;
        }
      };
      availreq.onerror = function(e) {
        console.error('available() failed',
                      availreq.error && availreq.error.name);
        changeState(media, MediaDB.UNMOUNTED);
      };
    }

    function deviceStorageChangeHandler(e) {
      var filename;
      switch (e.reason) {
      case 'available':
        changeState(media, MediaDB.READY);
        if (media.autoscan)
          scan(media); // automatically scan every time the card comes back
        break;
      case 'unavailable':
        changeState(media, MediaDB.NOCARD);
        endscan(media);
        break;
      case 'shared':
        changeState(media, MediaDB.UNMOUNTED);
        endscan(media);
        break;
      case 'modified':
      case 'deleted':
        filename = e.path;
        if (ignoreName(filename))
          break;
        if (media.directory) {
          // Ignore changes outside of our directory
          if (filename.substring(0, media.directory.length) !==
              media.directory)
            break;
          // And strip the directory from changes inside of it
          filename = filename.substring(media.directory.length);
        }
        if (e.reason === 'modified')
          insertRecord(media, filename);
        else
          deleteRecord(media, filename);
        break;
      }
    }
  }

  MediaDB.prototype = {
    close: function close() {
      // Close the database
      this.db.close();

      // There is no way to close device storage, but we at least want
      // to stop receiving events from it.
      this.storage.removeEventListener('change', this.details.dsEventListener);

      // Change state and send out an event
      changeState(this, MediaDB.CLOSED);
    },

    addEventListener: function addEventListener(type, listener) {
      if (!this.details.eventListeners.hasOwnProperty(type))
        this.details.eventListeners[type] = [];
      var listeners = this.details.eventListeners[type];
      if (listeners.indexOf(listener) !== -1)
        return;
      listeners.push(listener);
    },

    removeEventListener: function removeEventListener(type, listener) {
      if (!this.details.eventListeners.hasOwnProperty(type))
        return;
      var listeners = this.details.eventListeners[type];
      var position = listeners.indexOf(listener);
      if (position === -1)
        return;
      listeners.splice(position, 1);
    },

    // Look up the specified filename in DeviceStorage and pass the
    // resulting File object to the specified callback.
    getFile: function getFile(filename, callback, errback) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var getRequest = this.storage.get(this.directory + filename);
      getRequest.onsuccess = function() {
        callback(getRequest.result);
      };
      getRequest.onerror = function() {
        var errmsg = getRequest.error && getRequest.error.name;
        if (errback)
          errback(errmsg);
        else
          console.error('MediaDB.getFile:', errmsg);
      };
    },

    // Delete the named file from device storage.
    // This will cause a device storage change event, which will cause
    // mediadb to remove the file from the database and send out a
    // mediadb change event, which will notify the application UI.
    deleteFile: function deleteFile(filename) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      this.storage.delete(this.directory + filename).onerror = function(e) {
        console.error('MediaDB.deleteFile(): Failed to delete', filename,
                      'from DeviceStorage:', e.target.error);
      };
    },

    //
    // Save the specified blob to device storage, using the specified filename.
    // This will cause device storage to send us an event, and that event
    // will cause mediadb to add the file to its database, and that will
    // send out a mediadb event to the application UI.
    //
    addFile: function addFile(filename, file) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var media = this;

      // Delete any existing file by this name, then save the file.
      var deletereq = media.storage.delete(media.directory + filename);
      deletereq.onsuccess = deletereq.onerror = save;

      function save() {
        var request = media.storage.addNamed(file, media.directory + filename);
        request.onerror = function() {
          console.error('MediaDB: Failed to store', filename,
                        'in DeviceStorage:', storeRequest.error);
        };
      }
    },

    // Look up the database record for the named file, and copy the properties
    // of the metadata object into the file's metadata, and then write the
    // updated record back to the database. The third argument is optional. If
    // you pass a function, it will be called when the metadata is written.
    updateMetadata: function(filename, metadata, callback) {
      if (this.state === MediaDB.OPENING)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var media = this;

      // First, look up the fileinfo record in the db
      var read = media.db.transaction('files', 'readonly')
        .objectStore('files')
        .get(filename);

      read.onerror = function() {
        console.error('MediaDB.updateMetadata called with unknown filename');
      };

      read.onsuccess = function() {
        var fileinfo = read.result;

        // Update the fileinfo metadata
        Object.keys(metadata).forEach(function(key) {
          fileinfo.metadata[key] = metadata[key];
        });

        // And write it back into the database.
        var write = media.db.transaction('files', 'readwrite')
          .objectStore('files')
          .put(fileinfo);

        write.onerror = function() {
          console.error('MediaDB.updateMetadata: database write failed',
                        write.error && write.error.name);
        };

        if (callback) {
          write.onsuccess = function() {
            callback();
          };
        }
      };
    },

    // Count the number of records in the database and pass that number to the
    // specified callback. key is 'name', 'date' or one of the index names
    // passed to the constructor. range is be an IDBKeyRange that defines a
    // the range of key values to count.  key and range are optional
    // arguments.  If one argument is passed, it is the callback. If two
    // arguments are passed, they are assumed to be the range and callback.
    count: function(key, range, callback) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      // range is an optional argument
      if (arguments.length === 1) {
        callback = key;
        range = undefined;
        key = undefined;
      }
      else if (arguments.length === 2) {
        callback = range;
        range = key;
        key = undefined;
      }

      var store = this.db.transaction('files').objectStore('files');
      if (key && key !== 'name')
        store = store.index(key);

      var countRequest = store.count(range || null);

      countRequest.onerror = function() {
        console.error('MediaDB.count() failed with', countRequest.error);
      };

      countRequest.onsuccess = function(e) {
        callback(e.target.result);
      };
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
    // This method returns an object that you can pass to cancelEnumeration()
    // to cancel an enumeration in progress. You can use the state property
    // of the returned object to find out the state of the enumeration. It
    // should be one of the strings 'enumerating', 'complete', 'cancelling'
    // 'cancelled', or 'error'
    //
    enumerate: function enumerate(key, range, direction, callback) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var handle = { state: 'enumerating' };

      // The first three arguments are optional, but the callback
      // is required, and we don't want to have to pass three nulls
      if (arguments.length === 1) {
        callback = key;
        key = undefined;
      }
      else if (arguments.length === 2) {
        callback = range;
        range = undefined;
      }
      else if (arguments.length === 3) {
        callback = direction;
        direction = undefined;
      }

      var store = this.db.transaction('files').objectStore('files');

      // If a key other than "name" is specified, then use the index for that
      // key instead of the store.
      if (key && key !== 'name')
        store = store.index(key);

      // Now create a cursor for the store or index.
      var cursorRequest = store.openCursor(range || null, direction || 'next');

      cursorRequest.onerror = function() {
        console.error('MediaDB.enumerate() failed with', cursorRequest.error);
        handle.state = 'error';
      };

      cursorRequest.onsuccess = function() {
        // If the enumeration has been cancelled, return without
        // calling the callback and without calling cursor.continue();
        if (handle.state === 'cancelling') {
          handle.state = 'cancelled';
          return;
        }

        var cursor = cursorRequest.result;
        if (cursor) {
          try {
            if (!cursor.value.fail)   // if metadata parsing succeeded
              callback(cursor.value);
          }
          catch (e) {
            console.warn('MediaDB.enumerate(): callback threw', e);
          }
          cursor.continue();
        }
        else {
          // Final time, tell the callback that there are no more.
          handle.state = 'complete';
          callback(null);
        }
      };

      return handle;
    },

    // This method takes the same arguments as enumerate(), but batches
    // the results into an array and passes them to the callback all at
    // once when the enumeration is complete. It uses enumerate() so it
    // is no faster than that method, but may be more convenient.
    enumerateAll: function enumerateAll(key, range, direction, callback) {
      var batch = [];

      // The first three arguments are optional, but the callback
      // is required, and we don't want to have to pass three nulls
      if (arguments.length === 1) {
        callback = key;
        key = undefined;
      }
      else if (arguments.length === 2) {
        callback = range;
        range = undefined;
      }
      else if (arguments.length === 3) {
        callback = direction;
        direction = undefined;
      }

      return this.enumerate(key, range, direction, function(fileinfo) {
        if (fileinfo !== null)
          batch.push(fileinfo);
        else
          callback(batch);
      });
    },

    // Cancel a pending enumeration. After calling this the callback for
    // the specified enumeration will not be invoked again.
    cancelEnumeration: function cancelEnumeration(handle) {
      if (handle.state === 'enumerating')
        handle.state = 'cancelling';
    },

    // Use the non-standard mozGetAll() function to return all of the
    // records in the database in one big batch. The records will be
    // sorted by filename
    getAll: function getAll(callback) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var store = this.db.transaction('files').objectStore('files');
      var request = store.mozGetAll();
      request.onerror = function() {
        console.error('MediaDB.getAll() failed with', request.error);
      };
      request.onsuccess = function() {
        var all = request.result;  // All records in the object store

        // Filter out files that failed metadata parsing
        var good = all.filter(function(fileinfo) { return !fileinfo.fail; });

        callback(good);
      };
    },

    // Scan for new or deleted files.
    // This is only necessary if you have explicitly disabled automatic
    // scanning by setting autoscan:false in the options object.
    scan: function() {
      scan(this);
    },

    // Use the device storage freeSpace() method and pass the returned
    // value to the callback.
    freeSpace: function freeSpace(callback) {
      if (this.state !== MediaDB.READY)
        throw Error('MediaDB is not ready. State: ' + this.state);

      var freereq = this.storage.freeSpace();
      freereq.onsuccess = function() {
        callback(freereq.result);
      };
    }
  };

  // This is the version number of the MediaDB schema. If we change this
  // number it will cause existing data stores to be deleted and rebuilt,
  // which is useful when the schema changes. Note that the user can also
  // upgrade the version number with an option to the MediaDB constructor.
  // The final indexedDB version number we use is the product of our version
  // and the user's version.
  // This is version 2 because we modified the default schema to include
  // an index for file modification date.
  MediaDB.VERSION = 2;

  // These are the values of the state property of a MediaDB object
  // The NOCARD, UNMOUNTED, and CLOSED values are also used as the detail
  // property of 'unavailable' events
  MediaDB.OPENING = 'opening';     // MediaDB is initializing itself
  MediaDB.READY = 'ready';         // MediaDB is available and ready for use
  MediaDB.NOCARD = 'nocard';       // Unavailable because there is no sd card
  MediaDB.UNMOUNTED = 'unmounted'; // Unavailable because card unmounted
  MediaDB.CLOSED = 'closed';       // Unavailalbe because MediaDB has closed

  /* Details of helper functions follow */

  //
  // Return true if media db should ignore this file.
  //
  // If any components of the path begin with a . we'll ignore the file.
  // The '.' prefix indicates hidden files and directories on Unix and
  // when files are "moved to trash" during a USB Mass Storage session they
  // are sometimes not actually deleted, but moved to a hidden directory.
  //
  // If an array of media types was specified when the MediaDB was created
  // and the type of this file is not a member of that list, then ignore it.
  //
  function ignore(media, file) {
    if (ignoreName(file.name))
      return true;
    if (media.mimeTypes && media.mimeTypes.indexOf(file.type) === -1)
      return true;
    return false;
  }

  // Test whether this filename is one we ignore.
  // This is a separate function because device storage change events
  // give us a name only, not the file object.
  function ignoreName(filename) {
    return (filename[0] === '.' || filename.indexOf('/.') !== -1);
  }

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
  function scan(media) {
    media.scanning = true;
    dispatchEvent(media, 'scanstart');

    // First, scan for new files since the last scan, if there was one
    // When the quickScan is done it will begin a full scan.  If we don't
    // have a last scan date, then the database is empty and we don't
    // have to do a full scan, since there will be no changes or deletions.
    quickScan(media.details.newestFileModTime);

    // Do a quick scan and then follow with a full scan
    function quickScan(timestamp) {
      var cursor;
      if (timestamp > 0) {
        media.details.firstscan = false;
        cursor = media.storage.enumerate(media.directory, {
          // add 1 so we don't find the same newest file again
          since: new Date(timestamp + 1)
        });
      }
      else {
        // If there is no timestamp then this is the first time we've
        // scanned and we don't have any files in the database, which
        // allows important optimizations during the scanning process
        media.details.firstscan = true;
        media.details.records = [];
        cursor = media.storage.enumerate(media.directory);
      }

      cursor.onsuccess = function() {
        var file = cursor.result;
        if (file) {
          if (!ignore(media, file))
            insertRecord(media, file);
          cursor.continue();
        }
        else {
          // Quick scan is done. When the queue is empty, force out
          // any batched created events and move on to the slower
          // more thorough full scan.
          whenDoneProcessing(media, function() {
            sendNotifications(media);
            if (media.details.firstscan) {
              // If this was the first scan, then we're done
              endscan(media);
            }
            else {
              // If this was not the first scan, then we need to go
              // ensure that all of the old files we know about are still there
              fullScan();
            }
          });
        }
      };

      cursor.onerror = function() {
        // We can't scan if we can't read device storage.
        // Perhaps the card was unmounted or pulled out
        console.warning('Error while scanning', cursor.error);
        endscan(media);
      };
    }

    // Get a complete list of files from DeviceStorage
    // Get a complete list of files from IndexedDB.
    // Sort them both (the indexedDB list will already be sorted)
    // Step through the lists noting deleted files and created files.
    // Pay attention to files whose size or date has changed and
    // treat those as deletions followed by insertions.
    // Sync up the database while stepping through the lists.
    function fullScan() {
      if (media.state !== MediaDB.READY) {
        endscan(media);
        return;
      }

      // The db may be busy right about now, processing files that
      // were found during the quick scan.  So we'll start off by
      // enumerating all files in device storage
      var dsfiles = [];
      var cursor = media.storage.enumerate(media.directory);
      cursor.onsuccess = function() {
        var file = cursor.result;
        if (file) {
          if (!ignore(media, file)) {
            dsfiles.push(file);
          }
          cursor.continue();
        }
        else {
          // We're done enumerating device storage, so get all files from db
          getDBFiles();
        }
      };

      cursor.onerror = function() {
        // We can't scan if we can't read device storage.
        // Perhaps the card was unmounted or pulled out
        console.warning('Error while scanning', cursor.error);
        endscan(media);
      };

      function getDBFiles() {
        var store = media.db.transaction('files').objectStore('files');
        var getAllRequest = store.mozGetAll();

        getAllRequest.onsuccess = function() {
          var dbfiles = getAllRequest.result;  // Should already be sorted
          compareLists(dbfiles, dsfiles);
        };
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
            insertRecord(media, dsfile);
            dsindex++;
            continue;
          }

          // Case 3: no more files in ds. This means that the db file
          // has been deleted
          if (dsfile === null) {
            deleteRecord(media, dbfile.name);
            dbindex++;
            continue;
          }

          // Case 4: two files with the same name.
          // 4a: date and size are the same for both: do nothing
          // 4b: file has changed: it is both a deletion and a creation
          if (dsfile.name === dbfile.name) {
            var lastModified = dsfile.lastModifiedDate;
            if ((lastModified && lastModified.getTime() !== dbfile.date) ||
                dsfile.size !== dbfile.size) {
              deleteRecord(media, dbfile.name);
              insertRecord(media, dsfile);
            }
            dsindex++;
            dbindex++;
            continue;
          }

          // Case 5: the dsfile name is less than the dbfile name.
          // This means that the dsfile is new.  Like case 2
          if (dsfile.name < dbfile.name) {
            insertRecord(media, dsfile);
            dsindex++;
            continue;
          }

          // Case 6: the dsfile name is greater than the dbfile name.
          // this means that the dbfile no longer exists on disk
          if (dsfile.name > dbfile.name) {
            deleteRecord(media, dbfile.name);
            dbindex++;
            continue;
          }

          // That should be an exhaustive set of possiblities
          // and we should never reach this point.
          console.error('Assertion failed');
        }

        // Push a special value onto the queue so that when it is
        // processed we can trigger a 'scanend' event
        insertRecord(media, null);
      }
    }
  }

  // Called to send out a scanend event when scanning is done.
  // This event is sent on normal scan termination and also
  // when something goes wrong, such as the device storage being
  // unmounted during a scan.
  function endscan(media) {
    if (media.scanning) {
      media.scanning = false;
      dispatchEvent(media, 'scanend');
    }
  }

  // Pass in a file, or a filename.  The function queues it up for
  // metadata parsing and insertion into the database, and will send a
  // mediadb change event (possibly batched with other changes).
  // Ensures that only one file is being parsed at a time, but tries
  // to make as many db changes in one transaction as possible.  The
  // special value null indicates that scanning is complete.  If the
  // 2nd argument is a File, it should come from enumerate() so that
  // the name property does not include the directory prefix.  If it
  // is a name, then the directory prefix must already have been
  // stripped.
  function insertRecord(media, fileOrName) {
    var details = media.details;

    // Add this file to the queue of files to process
    details.pendingInsertions.push(fileOrName);

    // If the queue is already being processed, just return
    if (details.processingQueue)
      return;

    // Otherwise, start processing the queue.
    processQueue(media);
  }

  // Delete the database record associated with filename.
  // filename must not include the directory prefix.
  function deleteRecord(media, filename) {
    var details = media.details;

    // Add this file to the queue of files to process
    details.pendingDeletions.push(filename);

    // If there is already a transaction in progress return now.
    if (details.processingQueue)
      return;

    // Otherwise, start processing the queue
    processQueue(media);
  }

  function whenDoneProcessing(media, f) {
    var details = media.details;
    if (details.processingQueue)
      details.whenDoneProcessing.push(f);
    else
      f();
  }

  function processQueue(media) {
    var details = media.details;

    details.processingQueue = true;

    // Now get one filename off a queue and store it
    next();

    // Take an item from a queue and process it.
    // Deletions are always processed before insertions because we want
    // to clear away non-functional parts of the UI ASAP.
    function next() {
      if (details.pendingDeletions.length > 0) {
        deleteFiles();
      }
      else if (details.pendingInsertions.length > 0) {
        insertFile(details.pendingInsertions.shift());
      }
      else {
        details.processingQueue = false;
        if (details.whenDoneProcessing.length > 0) {
          var functions = details.whenDoneProcessing;
          details.whenDoneProcessing = [];
          functions.forEach(function(f) { f(); });
        }
      }
    }

    // Delete all of the pending files in a single transaction
    function deleteFiles() {
      var transaction = media.db.transaction('files', 'readwrite');
      var store = transaction.objectStore('files');

      deleteNextFile();

      function deleteNextFile() {
        if (details.pendingDeletions.length === 0) {
          next();
          return;
        }
        var filename = details.pendingDeletions.shift();
        var request = store.delete(filename);
        request.onerror = function() {
          // This probably means that the file wasn't in the db yet
          console.warn('MediaDB: Unknown file in deleteRecord:',
                       filename, getreq.error);
          deleteNextFile();
        };
        request.onsuccess = function() {
          // We succeeded, so remember to send out an event about it.
          queueDeleteNotification(media, filename);
          deleteNextFile();
        };
      }
    }

    // Insert a file into the db. One transaction per insertion.
    // The argument might be a filename or a File object
    // If it is a File, then it came from enumerate and its name
    // property already has the directory stripped off.  If it is a
    // filename, it came from a device storage change event and we
    // stripped of the directory before calling insertRecord.
    function insertFile(f) {
      // null is a special value pushed on to the queue when a scan()
      // is complete.  We use it to trigger a scanend event
      // after all the change events from the scan are delivered
      if (f === null) {
        sendNotifications(media);
        endscan(media);
        next();
        return;
      }

      // If we got a filename, look up the file in device storage
      if (typeof f === 'string') {
        var getreq = media.storage.get(media.directory + f);
        getreq.onerror = function() {
          console.warn('MediaDB: Unknown file in insertRecord:',
                       media.directory + f, getreq.error);
          next();
        };
        getreq.onsuccess = function() {
          // We got the filename from a device storage change event and
          // verified that the filename was not one that we wanted to ignore.
          // But until now, we haven't had the file and its type to check
          // against the mimeTypes array. So if necessary we check again.
          // If the file is not one of the types we're interested in we skip
          // it. Otherwise, parse its metadata.
          if (media.mimeTypes && ignore(media, getreq.result))
            next();
          else
            parseMetadata(getreq.result, f);
        };
      }
      else {
        // otherwise f is the file we want
        parseMetadata(f, f.name);
      }
    }

    function parseMetadata(file, filename) {
      if (!file.lastModifiedDate) {
        console.warn('MediaDB: parseMetadata: no lastModifiedDate for',
                     filename,
                     'using Date.now() until #793955 is fixed');
      }

      // Basic information about the file
      var fileinfo = {
        name: filename, // we can't trust file.name
        type: file.type,
        size: file.size,
        date: file.lastModifiedDate ?
          file.lastModifiedDate.getTime() :
          Date.now()
      };

      if (fileinfo.date > details.newestFileModTime)
        details.newestFileModTime = fileinfo.date;

      // Get metadata about the file
      media.metadataParser(file, gotMetadata, metadataError);
      function metadataError(e) {
        console.warn('MediaDB: error parsing metadata for',
                     filename, ':', e);
        // If we get an error parsing the metadata, assume it is invalid
        // and make a note in the fileinfo record that we store in the database
        // If we don't store it in the database, we'll keep finding it
        // on every scan. But we make sure never to return the invalid file
        // on an enumerate call.
        fileinfo.fail = true;
        storeRecord(fileinfo);
      }
      function gotMetadata(metadata) {
        fileinfo.metadata = metadata;
        storeRecord(fileinfo);
      }
    }

    function storeRecord(fileinfo) {
      if (media.details.firstscan) {
        // If this is the first scan then we know this is a new file and
        // we can assume that adding it to the db will succeed.
        // So we can just queue a notification about the new file without
        // waiting for a db operation.
        media.details.records.push(fileinfo);
        if (!fileinfo.fail) {
          queueCreateNotification(media, fileinfo);
        }
        // And go on to the next
        next();
      }
      else {
        // If this is not the first scan, then we may already have a db
        // record for this new file. In that case, the call to add() above
        // is going to fail. We need to handle that case, so we can't send
        // out the new file notification until we get a response to the add().
        var transaction = media.db.transaction('files', 'readwrite');
        var store = transaction.objectStore('files');
        var request = store.add(fileinfo);

        request.onsuccess = function() {
          // Remember to send an event about this new file
          if (!fileinfo.fail)
            queueCreateNotification(media, fileinfo);
          // And go on to the next
          next();
        };
        request.onerror = function(event) {
          // If the error name is 'ConstraintError' it means that the
          // file already exists in the database. So try again, using put()
          // instead of add(). If that succeeds, then queue a delete
          // notification along with the insert notification.  If the
          // second try fails, or if the error was something different
          // then issue a warning and continue with the next.
          if (request.error.name === 'ConstraintError') {
            // Don't let the higher-level DB error handler report the error
            event.stopPropagation();
            // And don't spew a default error message to the console either
            event.preventDefault();
            var putrequest = store.put(fileinfo);
            putrequest.onsuccess = function() {
              queueDeleteNotification(media, fileinfo.name);
              if (!fileinfo.fail)
                queueCreateNotification(media, fileinfo);
              next();
            };
            putrequest.onerror = function() {
              // Report and move on
              console.error('MediaDB: unexpected ConstraintError',
                            'in insertRecord for file:', fileinfo.name);
              next();
            };
          }
          else {
            // Something unexpected happened!
            // All we can do is report it and move on
            console.error('MediaDB: unexpected error in insertRecord:',
                          request.error, 'for file:', fileinfo.name);
            next();
          }
        };
      }
    }
  }

  // Don't send out notification events right away. Wait a short time to
  // see if others arrive that we can batch up.  This is common for scanning
  function queueCreateNotification(media, fileinfo) {
    var creates = media.details.pendingCreateNotifications;
    creates.push(fileinfo);
    if (media.batchSize && creates.length >= media.batchSize)
      sendNotifications(media);
    else
      resetNotificationTimer(media);
  }

  function queueDeleteNotification(media, filename) {
    var deletes = media.details.pendingDeleteNotifications;
    deletes.push(filename);
    if (media.batchSize && deletes.length >= media.batchSize)
      sendNotifications(media);
    else
      resetNotificationTimer(media);
  }

  function resetNotificationTimer(media) {
    var details = media.details;
    if (details.pendingNotificationTimer)
      clearTimeout(details.pendingNotificationTimer);
    details.pendingNotificationTimer =
      setTimeout(function() { sendNotifications(media); },
                 media.batchHoldTime);
  }

  // Send out notifications for creations and deletions
  function sendNotifications(media) {
    var details = media.details;
    if (details.pendingNotificationTimer) {
      clearTimeout(details.pendingNotificationTimer);
      details.pendingNotificationTimer = null;
    }
    if (details.pendingDeleteNotifications.length > 0) {
      var deletions = details.pendingDeleteNotifications;
      details.pendingDeleteNotifications = [];
      dispatchEvent(media, 'deleted', deletions);
    }

    if (details.pendingCreateNotifications.length > 0) {

      // If this is a first scan, and we have records that are not
      // in the db yet, write them to the db now
      if (details.firstscan && details.records.length > 0) {
        var transaction = media.db.transaction('files', 'readwrite');
        var store = transaction.objectStore('files');
        for (var i = 0; i < details.records.length; i++)
          store.add(details.records[i]);
        details.records.length = 0;
      }

      var creations = details.pendingCreateNotifications;
      details.pendingCreateNotifications = [];
      dispatchEvent(media, 'created', creations);
    }
  }

  function dispatchEvent(media, type, detail) {
    var handler = media['on' + type];
    var listeners = media.details.eventListeners[type];

    // Return if there is nothing to handle the event
    if (!handler && (!listeners || listeners.length == 0))
      return;

    // We use a fake event object
    var event = {
      type: type,
      target: media,
      currentTarget: media,
      timestamp: Date.now(),
      detail: detail
    };

    // Call the 'on' handler property if there is one
    if (typeof handler === 'function') {
      try {
        handler.call(media, event);
      }
      catch (e) {
        console.warn('MediaDB: ', 'on' + type, 'event handler threw', e);
      }
    }

    // Now call the listeners if there are any
    if (!listeners)
      return;
    for (var i = 0; i < listeners.length; i++) {
      try {
        var listener = listeners[i];
        if (typeof listener === 'function') {
          listener.call(media, event);
        }
        else {
          listener.handleEvent(event);
        }
      }
      catch (e) {
        console.warn('MediaDB: ', type, 'event listener threw', e);
      }
    }
  }

  function changeState(media, state) {
    if (media.state !== state) {
      media.state = state;
      if (state === MediaDB.READY)
        dispatchEvent(media, 'ready');
      else
        dispatchEvent(media, 'unavailable', state);
    }
  }

  return MediaDB;

}());
