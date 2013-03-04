(function(window) {
  var idb = window.indexedDB;
  const VERSION = 13;
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
        this._stores[name] = new Calendar.Store[name](this);
      }

      return this._stores[name];
    },

    /**
     * Loads all records in Calendar & Account stores.
     * Will open database if not already opened.
     *
     * @param {Function} callback node style.
     */
    load: function(callback) {
      var pending = 3;
      var self = this;

      var accountStore = this.getStore('Account');
      var settingStore = this.getStore('Setting');
      var calendarStore = this.getStore('Calendar');

      function next() {
        pending--;
        if (!pending)
          complete();
      }

      function complete() {
        if (self.hasUpgraded && self.oldVersion < 8) {
          self._setupDefaults(function(err) {
            callback(err);
            self.emit('loaded');
          });
        } else {
          if (callback) {
            callback();
            self.emit('loaded');
          }
        }
      }

      // if there is an error case we must
      // throw an error any error here is completely
      // fatal.
      function loadRecords() {
        accountStore.load(function(err) {
          if (err) {
            throw err;
          }
          next();
        });

        settingStore.load(function(err) {
          if (err) {
            throw err;
          }
          next();
        });

        calendarStore.load(function(err) {
          if (err) {
            throw err;
          }
          next();
        });
      }

      if (!this.isOpen) {
        pending++;
        this.open(function(err) {
          if (err) {
            throw err;
          }
          loadRecords();
          next();
        });
      } else {
        loadRecords();
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
        } else if (curVersion === 9) {
          var icalComponents = db.createObjectStore(
            store.icalComponents, { keyPath: 'eventId', autoIncrement: false }
          );

          // only upgrade the events when this is an existing
          // database. When the value is 0 that indicates this
          // is the very first time the user is booting up calendar.
          if (this.oldVersion !== 0) {
            this._upgradeOperations.push(this._upgradeMoveICALComponents);
          }
        } else if (curVersion === 10) {
          if (this.oldVersion !== 0) {
            this._upgradeOperations.push(this._resetCaldavAccounts);
          }
        } else if (curVersion === 11) {
          if (this.oldVersion !== 0) {
            this._upgradeOperations.push(this._upgradeAccountUrls);
          }
        } else if (curVersion === 12) {
          db.deleteObjectStore(store.icalComponents);

          var icalComponents = db.createObjectStore(
            store.icalComponents, { keyPath: 'eventId', autoIncrement: false }
          );

          icalComponents.createIndex(
            'lastRecurrenceId',
            'lastRecurrenceId.utc',
            { unique: false, multiEntry: false }
          );

          if (this.oldVersion !== 0) {
            this._upgradeOperations.push(this._resetCaldavAccounts);
          }
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
    },

    /** private db upgrade methods **/

    /**
     * Reset all caldav accounts removing all events,
     * calendars, alarms and components.
     * Then triggering resync.
     *
     * @param {Function} callback fired on completion.
     */
    _resetCaldavAccounts: function(callback) {
      debug('enter reset caldav');

      var trans = this.transaction(
        [
          store.accounts, store.calendars,
          store.events, store.busytimes,
          store.alarms, store.icalComponents
        ],
        'readwrite'
      );

      this.once('loaded', function() {
        if ('syncController' in Calendar.App && navigator.onLine) {
          Calendar.App.syncController.all(function() {
            debug('begin resync after reset');
          });
        } else {
          debug('skipping resync');
        }
      });

      var accountObjectStore = trans.objectStore(store.accounts);
      var calendarObjectStore = trans.objectStore(store.calendars);
      var calendarStore = this.getStore('Calendar');

      trans.onerror = function(event) {
        debug('ERROR', event.target.error.name);
        callback(event.target.error);
      };

      trans.oncomplete = function() {
        callback();
      };

      var caldavAccounts = Object.create(null);

      function fetchCalendars() {
        calendarObjectStore.mozGetAll().onsuccess = function(event) {
          var result = event.target.result;
          var i = 0;
          var len = result.length;

          for (; i < len; i++) {
            var calendar = result[i];

            if (calendar.accountId in caldavAccounts) {
              debug('reset calendar:', calendar);
              calendarStore.remove(calendar._id, trans);
            }
          }
        };
      }

      accountObjectStore.mozGetAll().onsuccess = function(event) {
        var result = event.target.result;
        var i = 0;
        var len = result.length;
        var hasCaldav = false;

        for (; i < len; i++) {
          var account = result[i];

          if (account.providerType === 'Caldav') {
            hasCaldav = true;
            debug('reset account', account);
            caldavAccounts[account._id] = true;
          }

          if (hasCaldav) {
            fetchCalendars();
          }
        }
      };
    },

    _upgradeAccountUrls: function(callback) {
      var trans = this.transaction(store.accounts, 'readwrite');

      trans.oncomplete = function() {
        callback();
      };

      trans.onerror = function(event) {
        console.error('Error updating account urls');
        callback(event.error.name);
      };

      var accountStore = trans.objectStore(store.accounts);
      var req = accountStore.openCursor();

      req.onsuccess = function upgradeUrls(e) {
        var cursor = e.target.result;
        if (cursor) {
          var value = cursor.value;
          var preset = value.preset;

          value.calendarHome = value.url;

          // url is removed we have two urls now so
          // it would be unnecessarily confusing.
          delete value.url;

          // when possible we calculate the correct
          // entrypoint (from our presets) if the preset
          // is missing then we fallback to the original url.
          if (preset in Calendar.Presets) {
            var presetData = Calendar.Presets[preset].options;

            // not using "in" intentionally.
            if (presetData && presetData.entrypoint) {
              value.entrypoint = presetData.entrypoint;
            }
          }

          if (!value.entrypoint) {
            value.entrypoint = value.calendarHome;
          }
          cursor.update(value);
          cursor.continue();
        }
      };
    },

    _upgradeMoveICALComponents: function(callback) {
      var trans = this.transaction(
        [store.events, store.icalComponents],
        'readwrite'
      );

      trans.onerror = function() {
        console.error('Error while upgrading ical components');
        callback();
      };

      trans.oncomplete = function() {
        callback();
      };

      var eventStore = trans.objectStore(store.events);
      var componentStore = trans.objectStore(store.icalComponents);

      var req = eventStore.openCursor();

      req.onsuccess = function upgradeCursor(e) {
        var cursor = e.target.result;
        if (cursor) {
          var value = cursor.value;

          if (value && value.remote.icalComponent && !value.parentId) {
            var component = value.remote.icalComponent;
            delete value.remote.icalComponent;

            componentStore.add({ eventId: value._id, data: component });
            cursor.update(value);
          }

          cursor.continue();
        }
      };
    }
  };

  Calendar.Db = Db;

}(this));
