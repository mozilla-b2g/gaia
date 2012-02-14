
/*
  Pass a schema like this one to the SimpleDB constructor

  var dbschema = {
  version: 1,                     // IndexedDB database version #
  name: 'videos',                 // IndexedDB name
  storename: 'videos',            // Object store name. Only 1 allowed
  keyprop: 'key',                 // Which property is the key
  blobprops: ['video', 'poster'], // Which properties are blobs to fetch
  objects: [                      // An array of objects for the db
  {
  key: 1,                          // This is the key property
  title: 'Mozilla Manifesto',      // Some other property
  video: 'samples/manifesto.ogv',  // These two blob properties
  poster: 'samples/manifesto.png', // are URLs to fetch.
  },
  {
  key: 2,
  title: 'Meet The Cubs',
  video: 'samples/meetthecubs.webm',
  poster: 'samples/meetthecubs.png',
  }
  ]
  };
*/

function SimpleDB(schema) {
  var DB = this; // for use in nested functions
  this.schema = schema;
  this.callbacks = [];
  var db;  // holds the database before it is completly initialized

  var request = window.mozIndexedDB.open(schema.name, schema.version);
  var initialized = true; // Assume db is already initialized

  // This is called if the db doesn't exist or has a lower version number
  request.onupgradeneeded = function(e) {
    initialized = false; // DB is not initialized yet, ignore onsuccess
    db = request.result;
    createObjectStore();
  };

  request.onsuccess = function(e) {
    db = request.result;
    if (initialized)   // If the db is initialized
      done();
  };

  request.onerror = function(e) {
    console.log("Can't open database", e);
  };

  function createObjectStore() {
    if (db.objectStoreNames.contains(schema.storename))
      db.deleteObjectStore(schema.storename);

    db.createObjectStore(schema.storename, { keyPath: schema.keyprop });

    // If the objects to store include blobs, fetch them first.
    // Otherwise just store the objects.  fetchBlobs() will call
    // storeObjects when it is done.
    if (schema.blobs && schema.blobs.length > 0)
      fetchBlobs();
    else
      storeObjects();
  }

  // For each object, for each property in the list of blob properties,
  // use XHR to fetch the specified URL as a blob, and replace the
  // value of the property with the blob object.
  // When all blobs have been fetched, call storeObjects
  function fetchBlobs() {
    var numBlobs = 0, blobsFetched = 0;

    // Find all the blobs we need to fetch
    schema.objects.forEach(function(o) {
      schema.blobprops.forEach(function(p) {
        if (typeof o[p] === 'string') {
          numBlobs++;
          var xhr = new XMLHttpRequest();
          xhr.open('GET', o[p]);
          xhr.responseType = 'blob';
          xhr.send();
          xhr.onload = function() {
            if (xhr.status === 200) {
              o[p] = xhr.response;
              if (++blobsFetched === numBlobs) {
                // We've fetched all the blobs and
                // have stored them in the objects, so
                // now we can store the objects in the db
                storeObjects();
              }
            }
            else {
              console.log(xhr.status + ' ' + xhr.statusText +
                          ' for ' + url);
            }
          }
          xhr.onerror = xhr.onabort = xhr.ontimeout = function(e) {
            console.log(e.type + ' while fetching ' + url);
          }
        }
      });
    });
  }

  // Store all initial objects in the database.
  // Assume that blobs have been resolved.
  // When all have been stored, call the callback
  function storeObjects() {
    var transaction = db.transaction(schema.storename,
                                     IDBTransaction.READ_WRITE);
    var store = transaction.objectStore(schema.storename);
    var numStored = 0;
    schema.objects.forEach(function(o) {
      var request = store.put(o);
      request.onsuccess = function() {
        if (++numStored == schema.objects.length) {
          // If all objects have been stored
          done();
        }
      };
      request.onerror = function(e) {
        console.log('Error storing record while initializing database',
                    e);
      };
    });

  }

  function done() {
    // The database is ready. Wrap it in a SimpleDB wrapper
    // and pass it to any callbacks that have been registered.
    DB.db = db;
    DB.callbacks.forEach(function(f) {
      f.call(DB, DB);
    });
    DB.callbacks.length = 0;
  }
}

SimpleDB.prototype = {
  constructor: SimpleDB,

  // Register a callback to be invoked when the db is ready for use.
  // Note that the other methods use this one, so clients generally
  // don't have to use this.
  whenReady: function(callback) {
    if (this.db)
      callback.call(this, this);
    else
      this.callbacks.push(callback);
  },

  // Get the object with the specified key and pass it to the callback
  getObject: function(key, callback) {
    // If the db is not ready yet, defer this call:
    if (!this.db) {
      this.whenReady(function(sdb) { sdb.getObject(key, callback); });
      return;
    }

    // Otherwise, use the db now
    var transaction = this.db.transaction(this.schema.keyprop,
                                          IDBTransaction.READ_ONLY);
    var request = transaction.objectStore(this.schema.keyprop).get(key);
    request.onsuccess = function onsuccess(e) {
      callback(request.result);
    };

    request.onerror = function onerror(e) {
      console.log('Database error retrieving object for key ' + key +
                  ': ' + e);
    };
  },

  // Get all objects from the database and pass, one at a time, to callback()
  eachObject: function(callback) {
    // If the db is not ready yet, defer this call:
    if (!this.db) {
      this.whenReady(function() { this.eachObject(callback); });
      return;
    }

    var transaction = this.db.transaction(this.schema.storename,
                                          IDBTransaction.READ_ONLY);
    var store = transaction.objectStore(this.schema.storename);
    var cursor = store.openCursor(IDBKeyRange.lowerBound(0));
    cursor.onsuccess = function() {
      if (!cursor.result) {
        // no more values, so return without calling continue
        return;
      }
      try {
        callback(cursor.result.value);
      }
      finally {
        cursor.result.continue();
      }
    };

    cursor.onerror = function(e) {
      console.log('Database error enumerating objects: ', e);
    };
  }
};
