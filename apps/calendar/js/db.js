(function(window) {
  var idb = window.indexedDB;
  const VERSION = 14;
  var debug = Calendar.debug('database');

  var store = {
    events: 'events',
    accounts: 'accounts',
    calendars: 'calendars',
    busytimes: 'busytimes',
    settings: 'settings',
    alarms: 'alarms',
    icalComponents: 'icalComponents'
  };

  Object.freeze(store);

  function Db(name) {
    this.name = name;
    this._stores = Object.create(null);

    Calendar.Responder.call(this);

    this._upgradeOperations = [];
  }

  Db.prototype = {

    __proto__: Calendar.Responder.prototype,

    /**
     * Database connection
     */
    connection: null,

    getStore: function(name) {
      if (!(name in this._stores)) {
        try {
          this._stores[name] = new Calendar.Store[name](this);
        } catch (e) {
          console.log('Failed to load store', name, e.stack);
        }
      }

      return this._stores[name];
    },

    load: function(callback) {

      var self = this;
      function setupDefaults() {
        if (self.oldVersion < 8) {
          self._setupDefaults(callback);
        } else {
          Calendar.nextTick(callback);
        }
      }

      if (this.isOpen) {
        return setupDefaults();
      }

      if (!this.isOpen) {
        this.open(VERSION, function() {
          setupDefaults();
        }.bind(this));
      }
    },


    /**
     * Opens connection to database.
     *
     * @param {Numeric} [version] version of database to open.
     *                            default to current version.
     *                            Should _only_ be used in testing.
     *
     * @param {Function} [callback] first argument is error, second
     *                            is result of operation or null
     *                            in the error case.
     */
    open: function(version, callback) {
      if (typeof(version) === 'function') {
        callback = version;
        version = VERSION;
      }

      var req = idb.open(this.name, version);
      this.version = version;

      var self = this;

      req.onsuccess = function(event) {
        self.isOpen = true;
        self.connection = req.result;

        // if we have pending upgrade operations
        if (self._upgradeOperations.length) {
          var pending = self._upgradeOperations.length;

          function next() {
            if (!(--pending)) {
              callback(null, self);
              self.emit('open', self);
            }
          }

          var operation;
          while ((operation = self._upgradeOperations.shift())) {
            operation.call(self, next);
          }
        } else {
          callback(null, self);
          self.emit('open', self);
        }
      };

      req.onblocked = function(error) {
        callback(error, null);
        self.emit('error', error);
      };

      req.onupgradeneeded = function(event) {
        self._handleVersionChange(req.result, event);
      };

      req.onerror = function(error) {
        //TODO: steal asuth's error handling...
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

    _handleVersionChange: function(db, event) {
      var newVersion = event.newVersion;
      var curVersion = event.oldVersion;
      var transaction = event.currentTarget.transaction;

      this.hasUpgraded = true;
      this.oldVersion = curVersion;
      this.upgradedVersion = newVersion;

      for (; curVersion < newVersion; curVersion++) {
        // if version is < 7 then it was from pre-production
        // db and we can safely discard its information.
        if (curVersion < 6) {
          // ensure clean state if this was an old db.
          var existingNames = db.objectStoreNames;
          for (var i = 0; i < existingNames.length; i++) {
            db.deleteObjectStore(existingNames[i]);
          }

          // version 0-r are not maintained increment to 6
          curVersion = 6;

          // busytimes has one event, has one calendar
          var busytimes = db.createObjectStore(
            store.busytimes,
            { keyPath: '_id' }
          );

          busytimes.createIndex(
            'end',
            'end.utc',
            { unique: false, multiEntry: false }
          );

          busytimes.createIndex(
            'eventId',
            'eventId',
            { unique: false, multiEntry: false }
          );

          // events -> belongs to calendar
          var events = db.createObjectStore(
            store.events,
            { keyPath: '_id' }
          );

          events.createIndex(
            'calendarId',
            'calendarId',
            { unique: false, multiEntry: false }
          );

          events.createIndex(
            'parentId',
            'parentId',
            { unique: false, multiEntry: false }
          );

          // accounts -> has many calendars
          db.createObjectStore(
            store.accounts, { keyPath: '_id', autoIncrement: true }
          );

          // calendars -> has many events
          db.createObjectStore(
            store.calendars, { keyPath: '_id', autoIncrement: true }
          );

        } else if (curVersion === 7) {
          db.createObjectStore(store.settings, { keyPath: '_id' });
        } else if (curVersion === 8) {
          var alarms = db.createObjectStore(
            store.alarms, { keyPath: '_id', autoIncrement: true }
          );

          alarms.createIndex(
            'trigger',
            'trigger.utc',
            { unique: false, multiEntry: false }
          );

          alarms.createIndex(
            'busytimeId',
            'busytimeId',
            { unique: false, multiEntry: false }
          );
       } else if (curVersion === 12) {
          var icalComponents = db.createObjectStore(
            store.icalComponents, { keyPath: 'eventId', autoIncrement: false }
          );

          icalComponents.createIndex(
            'lastRecurrenceId',
            'lastRecurrenceId.utc',
            { unique: false, multiEntry: false }
          );
        } else if (curVersion === 13) {
          var calendarStore = transaction.objectStore(store.calendars);
          calendarStore.createIndex(
            'accountId', 'accountId', { unique: false, multiEntry: false }
          );
        }
      }
    },

    get store() {
      return store;
    },

    /**
     * Shortcut method for connection.close
     */
    close: function() {
      if (this.connection) {
        this.isOpen = false;
        this.connection.close();
        this.connection = null;
      }
    },

    clearNonCredentials: function(callback) {
      var stores = ['events', 'busytimes'];
      var trans = this.transaction(
        stores,
        'readwrite'
      );

      trans.addEventListener('complete', callback);

      stores.forEach(function(store) {
        store = trans.objectStore(store);
        store.clear();
      });
    },

    /**
     * Setup default values for initial calendar load.
     */
    _setupDefaults: function(callback) {
      var calendarStore = this.getStore('Calendar');
      var accountStore = this.getStore('Account');

      var trans = calendarStore.db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      if (callback) {
        trans.addEventListener('error', function(err) {
          callback(err);
        });

        trans.addEventListener('complete', function() {
          callback();
        });
      }

      var account = new Calendar.Models.Account(
        Calendar.Presets.local.options
      );

      account.preset = 'local';

      account._id = uuid();

      var calendar = {
        _id: Calendar.Provider.Local.calendarId,
        accountId: account._id,
        remote: Calendar.Provider.Local.defaultCalendar()
      };

      accountStore.persist(account, trans);
      calendarStore.persist(calendar, trans);
    },

    deleteDatabase: function(callback) {
      var req = idb.deleteDatabase(this.name);

      req.onblocked = function(e) {
        // improve interface
        callback(new Error('blocked'));
      };

      req.onsuccess = function(event) {
        callback(null, event);
      };

      req.onerror = function(event) {
        callback(event, null);
      };
    }

    /** private db upgrade methods **/

  };

  Calendar.Db = Db;

}(this));
