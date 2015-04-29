/* jshint loopfunc: true */
define(function(require, exports, module) {
'use strict';

var Account = require('models/account');
var Presets = require('common/presets');
var Local = require('provider/local');
var Responder = require('common/responder');
var Store = require('store/store');
var debug = require('common/debug')('db');
var denodeifyAll = require('common/promise').denodeifyAll;
var nextTick = require('common/next_tick');
var probablyParseInt = require('common/probably_parse_int');
var uuid = require('ext/uuid');

var idb = self.indexedDB;

const VERSION = 15;

var store = Object.freeze({
  events: 'events',
  accounts: 'accounts',
  calendars: 'calendars',
  busytimes: 'busytimes',
  settings: 'settings',
  alarms: 'alarms',
  icalComponents: 'icalComponents'
});

function Db(name, app) {
  this.app = app;
  this.name = name;
  this._stores = Object.create(null);
  Responder.call(this);
  this._upgradeOperations = [];

  denodeifyAll(this, ['load']);
}
module.exports = Db;

Db.prototype = {
  __proto__: Responder.prototype,

  /**
   * Database connection
   */
  connection: null,

  getStore: function(name) {
    if (!(name in this._stores)) {
      try {
        this._stores[name] = new Store[name](this, this.app);
      } catch (e) {
        console.error('Error', e.name, e.message);
        console.error('Failed to load store', name, e.stack);
      }
    }

    return this._stores[name];
  },

  load: function(callback) {
    debug('Will load b2g-calendar db.');

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

    this.open(VERSION, setupDefaults);
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
      } else if (curVersion === 14) {
        // Bug 851003 - The database may have some busytimes and/or events
        // which have their calendarId field as a string rather than an int.
        // We need to fix the calendarIds and also remove any of the idb
        // objects that have deleted calendars.
        this.sanitizeEvents(transaction);
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
    objectStore.openCursor().onsuccess = (function(evt) {
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
    }).bind(this);
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
    calendarIds.forEach(function(calendarId) {
      //Bug 887698 cases for calendarIds of types strings or integers
      calendarId = probablyParseInt(calendarId);
      var eventIds = badCalendarIdToEventIds[calendarId];
      var calendars = trans.objectStore(store.calendars);
      calendars.get(calendarId).onsuccess = (function(evt) {
        var result = evt.target.result;
        if (result) {
          this._updateEvents(eventIds, calendarId, trans);
        } else {
          this._deleteEvents(eventIds, trans);
        }
      }).bind(this);
    }, this);
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
    debug('Will setup defaults.');
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

    var options = Presets.local.options;
    debug('Creating local calendar with options:', options);
    var account = new Account(options);
    account.preset = 'local';
    account._id = uuid();

    var calendar = {
      _id: Local.calendarId,
      accountId: account._id,
      remote: Local.defaultCalendar()
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

});
