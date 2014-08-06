/* jshint loopfunc: true */
/* global uuid */
(function(window, exports) {
'use strict';

/**
 * Module dependencies
 */
var Account = Calendar.Models.Account,
    Responder = Calendar.Responder,
    Presets = Calendar.Presets,
    Store = Calendar.Store,
    local = Calendar.Provider.local,
    nextTick = Calendar.nextTick,
    probablyParseInt = Calendar.probablyParseInt,
    provider = Calendar.Provider.provider;

/**
 * Constants
 */
var idb = window.indexedDB;
const VERSION = 16;
var store = Object.freeze({
  events: 'events',
  accounts: 'accounts',
  calendars: 'calendars',
  busytimes: 'busytimes',
  settings: 'settings',
  alarms: 'alarms',
  icalComponents: 'icalComponents'
});

function Db(name) {
  Responder.call(this);
  this.name = name;
  this._stores = Object.create(null);
  this._upgradeOperations = [];
}
exports.Db = Db;

Db.prototype = {
  __proto__: Responder.prototype,

  /**
   * Database connection
   */
  connection: null,

  getStore: function(name) {
    if (!(name in this._stores)) {
      try {
        this._stores[name] = new Store[name](this);
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
        nextTick(callback);
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

    req.onsuccess = function() {
      self.isOpen = true;
      self.connection = req.result;

      // if we have pending upgrade operations
      if (self._upgradeOperations.length) {
        var pending = self._upgradeOperations.length;

        var operation;
        while ((operation = self._upgradeOperations.shift())) {
          operation.call(self, function next() {
            if (!(--pending)) {
              callback(null, self);
              self.emit('open', self);
            }
          });
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
    if (Array.isArray(list)) {
      names = list.map((name) => {
        return this.store[name] || name;
      });
    } else {
      names = [this.store[list] || list];
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

        // version 0-5 are not maintained increment to 6
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
      } else if (curVersion === 14) {
        // Bug 851003 - The database may have some busytimes and/or events
        // which have their calendarId field as a string rather than an int.
        // We need to fix the calendarIds and also remove any of the idb
        // objects that have deleted calendars.
        this.sanitizeEvents(transaction);
      } else if (curVersion === 15) {
        // Since we're now doing recurrences for bug 932258, local events
        // need ical components as well. Generate those here.
        // TODO(gareth): From a discussion with bent on 08-20-2014,
        //     there is no way to keep this idb transaction alive while
        //     we go to the worker to do ical magicks. Therefore, what we
        //     need to do is to (instead of opening the desired version and
        //     making use of onupgradeneeded
        //     (1) just call idb.open('b2g-calendar');
        //     (2) check the version once we're open
        //     (3) do the upgrading
        //     (4) close the db
        //     (5) then and only then open the new version
        //this.createICalComponentsForEvents(transaction);
      }
    }
  },

  /**
   * 1. Find all events with string calendar ids and index them.
   * 2. Check for each of the events whether the calendar
   *    they reference still exists.
   * 3. Fix the events' calendarIds if the calendar still exists else
   *    delete them.
   * @param {IDBTransaction} trans The active idb transaction during db
   *     upgrade.
   */
  sanitizeEvents: function(trans) {
    /**
     * Map from calendar ids to lists of event ids
     * which we've fixed with that id.
     * @type {Object.<number, Array.<number>>}
     */
    var badCalendarIdToEventIds = {};

    var objectStore = trans.objectStore(store.events);
    objectStore.openCursor().onsuccess = (evt) => {
      var cursor = evt.target.result;
      if (!cursor) {
        return this._updateXorDeleteEvents(badCalendarIdToEventIds, trans);
      }

      var calendarId = cursor.value.calendarId;
      if (typeof(calendarId) === 'number') {
        // Nothing to do here!
        return cursor.continue();
      }

      // Record the bad reference.
      var eventIds = badCalendarIdToEventIds[calendarId] || [];
      eventIds.push(cursor.key);
      badCalendarIdToEventIds[calendarId] = eventIds;
      cursor.continue();
    };
  },

  /**
   * 1. Check for each of the events whether the calendar
   *    they reference still exists.
   * 2. Fix the events' calendarIds if the calendar still exists else
   *    delete them.
   *
   * @param {Object.<number, Array.<number>>} badCalendarIdToEventIds Map
   *     from calendar ids to lists of event ids which we've fixed with
   *     that id.
   * @param {IDBTransaction} trans The active idb transaction during db
   *     upgrade.
   * @private
   */
  _updateXorDeleteEvents: function(badCalendarIdToEventIds, trans) {
    var calendarIds = Object.keys(badCalendarIdToEventIds);
    calendarIds.forEach((calendarId) => {
      //Bug 887698 cases for calendarIds of types strings or integers
      calendarId = probablyParseInt(calendarId);
      var eventIds = badCalendarIdToEventIds[calendarId];
      var calendars = trans.objectStore(store.calendars);
      calendars.get(calendarId).onsuccess = (evt) => {
        var result = evt.target.result;
        if (result) {
          this._updateEvents(eventIds, calendarId, trans);
        } else {
          this._deleteEvents(eventIds, trans);
        }
      };
    });
  },

  /**
   * Update a collection of events and the busytimes that depend on them.
   *
   * @param {Array.<number>>} eventIds An array of event ids for the events.
   * @param {number} calendarId A numerical id to set as calendarId.
   * @param {IDBTransaction} trans The active idb transaction during db
   *     upgrade.
   * @private
   */
  _updateEvents: function(eventIds, calendarId, trans) {
    var eventStore = trans.objectStore(store.events);
    var busytimeStore = trans.objectStore(store.busytimes);
    var busytimeStoreIndexedByEventId = busytimeStore.index('eventId');

    eventIds.forEach(function(eventId) {
      eventStore.get(eventId).onsuccess = function(evt) {
        var result = evt.target.result;
        result.calendarId = calendarId;
        eventStore.put(result);
      };

      busytimeStoreIndexedByEventId.get(eventId).onsuccess = function(evt) {
        var result = evt.target.result;
        result.calendarId = calendarId;
        busytimeStore.put(result);
      };
    });
  },

  /**
   * Delete a collection of events and the busytimes that depend on them.
   *
   * @param {Array.<number>>} eventIds An array of event ids for the events.
   * @param {IDBTransaction} trans The active idb transaction during db
   *     upgrade.
   * @private
   */
  _deleteEvents: function(eventIds, trans) {
    var events = this.getStore('Event');
    eventIds.forEach(function(eventId) {
      events.remove(eventId, trans);
    });
  },

  createICalComponentsForEvents: function(trans) {
    var objectStore = trans.objectStore(store.events);
    var promises = [];
    objectStore.openCursor().onsuccess = (evt) => {
      var cursor = evt.target.result;
      if (!cursor || !cursor.value) {
        return;
      }

      var event = cursor.value;
      // Create an ical component for this event.
      var create = provider.createICalComponentForEvent(event);
      promises.push(create);
      cursor.continue();
    };

    return Promise.all(promises);
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

    var account = new Account(Presets.local.options);
    account.preset = 'local';
    account._id = uuid();

    var calendar = {
      _id: local.calendarId,
      accountId: account._id,
      remote: local.localCalendar()
    };

    accountStore.persist(account, trans);
    calendarStore.persist(calendar, trans);
  },

  deleteDatabase: function(callback) {
    var req = idb.deleteDatabase(this.name);

    req.onblocked = function() {
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
};

}(this, Calendar));
