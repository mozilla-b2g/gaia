(function(window) {
  if (typeof(window.Calendar) === 'undefined') {
    Calendar = {};
  }

  var idb = window.indexedDB || window.mozIndexedDB;

  const VERSION = 1;

  var store = {
    events: 'events',
    accounts: 'accounts',
    calendars: 'calendars'
  };

  Object.freeze(store);

  function Db(name) {
    this.name = name;

    Calendar.Responder.call(this);
  }

  Db.prototype = {

    // Some may hate me for this
    // but the syntax is nice
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

      req.onblocked = function(error) {
        callback(error, null);
        self.emit('error', error);
      }

      req.onupgradeneeded = function() {
        self._handleVersionChange(req.result);
      };

      req.onerror = function(error) {
        // steal asuth's error handling...
        callback(error, null);
        self.emit('error', error);
      };
    },

    transaction: function(list, state) {
      var names;
      var self = this;

      if (typeof(list) === 'string') {
        names = [];
        names.push(this.store[list] || list);
      } else {
        names = list.map(function(name) {
          return self.store[name] || name;
        });
      }

      return this.connection.transaction(names, state || 'readonly');
    },

    _handleVersionChange: function(db) {
      // remove previous stores for now
      var existingNames = db.objectStoreNames;
      for (var i = 0; i < existingNames.length; i++) {
        db.deleteObjectStore(existingNames[i]);
      }

      // events -> belongs to calendar
      db.createObjectStore(store.events);

      // accounts -> has many calendars
      db.createObjectStore(store.accounts, { autoIncrement: true });

      // calendars -> has many events
      db.createObjectStore(store.calendars);
    },

    get version() {
      return VERSION;
    },

    get store() {
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

      req.onblocked = function() {
        // improve interface
        callback(new Error('blocked'));
      }

      req.onsuccess = function(event) {
        callback(null, event);
      }

      req.onerror = function(event) {
        callback(event, null);
      }
    }

  };


  Calendar.Db = Db;

}(this));
