'use strict';
define(function(require) {

  var sounds = require('./sounds');

  /**
   * The AlarmDatabase stores a list of alarms in IndexedDB. All
   * mutation operations return Promises, for easy chaining and state
   * management. This module returns the one-and-only instance of
   * AlarmDatabase.
   */
  function AlarmDatabase(dbName, storeName, version) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;

    this.withDatabase = new Promise((resolve, reject) => {
      var request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        var db = event.target.result;
        // Ensure the object store exists.
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onerror = (() => reject(request.errorCode));
      request.onsuccess = ((event) => resolve(event.target.result));
    }).then((db) => {
      // Only return when all of the alarms have been upgraded.
      return new Promise((resolve, reject) => {
        // Go through existing alarms here, and make sure they conform
        // to the latest spec (upgrade old versions, etc.).
        var transaction = db.transaction(this.storeName, 'readwrite');
        var store = transaction.objectStore(this.storeName);
        var cursor = store.openCursor();
        cursor.onsuccess = (event) => {
          var cursor = event.target.result;
          if (cursor) {
            store.put(this.normalizeAlarmRecord(cursor.value));
            cursor.continue();
          }
        };

        transaction.oncomplete = (() => resolve(db));
        transaction.onerror = ((evt) => reject(evt.target.errorCode));
      });
    }).catch(function(err) {
      // Explicit err.toString() coercion needed to see a message.
      console.error('AlarmDatabase Fatal Error:', err.toString());
    });
  }

  AlarmDatabase.prototype = {

    /**
     * Given an Alarm's JSON data (as returned by IndexedDB),
     * normalize any properties to ensure it conforms to the most
     * current Alarm specification.
     */
    normalizeAlarmRecord: function(alarm) {
      if (!alarm.registeredAlarms) {
        alarm.registeredAlarms = {};
      }

      if (typeof alarm.enabled !== 'undefined') {
        delete alarm.enabled;
      }

      if (typeof alarm.normalAlarmId !== 'undefined') {
        alarm.registeredAlarms.normal = alarm.normalAlarmId;
        delete alarm.normalAlarmId;
      }

      if (typeof alarm.snoozeAlarmId !== 'undefined') {
        alarm.registeredAlarms.snooze = alarm.snoozeAlarmId;
        delete alarm.snoozeAlarmId;
      }

      var newRepeat = {};
      var i;

      // Map '1111100' string bitmap to a repeat object with day properties.
      if (typeof alarm.repeat === 'string') {
        for (i = 0; i < alarm.repeat.length; i++) {
          if (alarm.repeat[i.toString()] === '1') {
            newRepeat[i.toString()] = true;
          }
        }
        alarm.repeat = newRepeat;
      } else if (typeof alarm.repeat === 'object') {
        var keys = Object.keys(alarm.repeat);
        if (keys.length !== 0 && Number.isNaN(parseInt(keys[0]))) {
          var oldKeys = ['sunday', 'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday'];

          for (i = 0; i < keys.length; i++) {
            var index = oldKeys.indexOf(keys[i]);
            if (index !== -1) {
              newRepeat[index] = alarm.repeat[keys[i]];
            }
          }
          alarm.repeat = newRepeat;
        }
      } else {
        alarm.repeat = newRepeat;
      }

      // Pre-April-2014 code may have stored 'vibrate' and 'sound' as
      // the string "0", and hour/minute as strings.
      alarm.sound = sounds.normalizeSound(
        alarm.sound !== '0' ? alarm.sound : null);
      alarm.vibrate = (alarm.vibrate && alarm.vibrate !== '0') || false;
      alarm.hour = parseInt(alarm.hour, 10);
      alarm.minute = parseInt(alarm.minute, 10);

      return alarm;
    },

    /**
     * Execute a database store request with the given method and
     * arguments, returning a Promise that will be fulfilled with the
     * Store's result.
     */
    withStoreRequest: function(method /*, args... */) {
      var args = Array.slice(arguments, 1);
      var readmode = (/get/.test(method) ? 'readonly' : 'readwrite');
      return this.withDatabase.then((database) => {
        var store = database
              .transaction(this.storeName, readmode)
              .objectStore(this.storeName);
        if (method === 'getAll') {
          return objectStoreGetAll(store);
        } else {
          return new Promise((resolve, reject) => {
            var request = store[method].apply(store, args);
            request.onsuccess = (() => resolve(request.result));
            request.onerror = (() => reject(request.errorCode));
          });
        }
      });
    },

    put: function(alarm) {
      var data = alarm.toJSON();
      if (!data.id) {
        delete data.id; // IndexedDB requires _no_ ID key, not null/undefined.
      }
      return this.withStoreRequest('put', data).then((id) => {
        alarm.id = id;
      });
    },

    getAll: function() {
      var Alarm = require('alarm'); // Circular dependency.
      return this.withStoreRequest('getAll').then((alarms) => {
        return alarms.map((data) => new Alarm(data));
      });
    },

    get: function(id) {
      var Alarm = require('alarm'); // Circular dependency.
      return this.withStoreRequest('get', id).then((data) => {
        return new Alarm(data);
      });
    },

    delete: function(id) {
      return this.withStoreRequest('delete', id);
    }
  };


  /**
   * Return all records from an ObjectStore. This function is
   * non-standard, but is such a common pattern that it has actually
   * been included in certain implementations of IndexedDB. It is
   * extracted here for clarity.
   */
  function objectStoreGetAll(objectStore) {
    return new Promise((resolve, reject) => {
      var items = [];
      var cursor = objectStore.openCursor();
      cursor.onerror = reject;
      cursor.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        }
        else {
          resolve(items);
        }
      };
    });
  }

  // For Clock, we only use one database and store, both named 'alarms'.
  // Right now, we're on version 7.
  return new AlarmDatabase('alarms', 'alarms', 7);
});
