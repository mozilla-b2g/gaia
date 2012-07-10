(function(window) {
  if (typeof(window.Calendar) === 'undefined') {
    Calendar = {};
  }

  var idb = window.indexedDB || window.mozIndexedDB;

  const VERSION = 1;

  var store = {
    events: 'events',
    accounts: 'accounts'
  };

  function Db(name) {
    this.name = name;

    Calendar.Responder.call(this);
  }

  Db.prototype = {

    // Someone may hate me for this
    // but its nice =/
    __proto__: Object.create(Calendar.Responder.prototype),

    /**
     * Database connection
     */
    connection: null,

    /**
     * Opens connection to database.
     *
     * @param {Function} callback first argument is error, second
     *                            is result of operation or null
     *                            in the error case.
     */
    open: function(callback) {
      var req = idb.open(this.name, this.version);
      var self = this;

      req.onsuccess = function(event) {
        self.connection = req.result;

        callback(null, self);
        self.emit('open', self);
      };

      req.onupgradeneeded = function() {
        self._handleVersionChange(req.result);
      };

      req.onerror = function(error) {
        // steal asuth's error handling...
        callback(error, null);
        self.emit('error', error);
      };
    },

    _handleVersionChange: function(db) {
      // remove previous stores for now
      var existingNames = db.objectStoreNames;
      for (var i = 0; i < existingNames.length; i++) {
        db.deleteObjectStore(existingNames[i]);
      }

      // events
      db.createObjectStore(store.events);

      // accounts
      db.createObjectStore(store.accounts);
    },

    get version() {
      return VERSION;
    },

    get stores() {
      return store;
    },

    /**
     * Shortcut method for connection.close
     */
    close: function() {
      if (this.connection)
        this.connection.close();
    },

    deleteDatabase: function(callback) {
      var req = idb.deleteDatabase(this.name);

      req.onsuccess = function(event) {
        callback(null, event);
      }

      req.onerror = function(err) {
        callback(err, null);
      }
    }

  };


  Calendar.Db = Db;

}(this));
