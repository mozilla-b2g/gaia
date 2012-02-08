/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function () {
  var settingsHandler = {
    _db: null,
    handleEvent: function settings_handleEvent(event) {
      var data = event.data;
      if (typeof data !== 'string')
        return;

      data = data.split(':');
      if (data.length < 4 || data[0] != 'settings')
        return;

      var src = event.source;
      var method = data[1], id = data[2], key = data[3], value = data[4];
      switch (method) {
        case 'get':
          this._getSetting(key, function getSetting(value) {
            if (!value) {
              var msg = 'settings:error:' + id + ':' + key;
              src.postMessage(msg, event.origin);
              return;
            }

            var msg = 'settings:success:' + id + ':' + key + ':' + value;
            src.postMessage(msg, event.origin);
          });
          break;

        case 'set':
          this._setSetting(key, value, function setSetting(value) {
            if (!value) {
              var msg = 'settings:error:' + id + ':' + key;
              src.postMessage(msg, event.origin);
              return;
            }

            var msg = 'settings:success:' + id + ':' + key + ':' + value;
            src.postMessage(msg, event.origin);
          });
          break;
      }
    },

    initSettings: function settings_initSettings() {
      this._starting = true;

      const DB_NAME = 'settings';
      const DB_VERSION = 3;
      const stores = ['settings'];
      var request = window.mozIndexedDB.open(DB_NAME, 3);

      var empty = false;
      request.onupgradeneeded = (function onUpgradeNeeded(evt) {
        empty = true;

        var db = this._db = evt.target.result;
        stores.forEach(function createStore(store) {
          if (db.objectStoreNames.contains(store))
            db.deleteObjectStore(store);
          db.createObjectStore(store, { keyPath: 'id' });
        });
      }).bind(this);

      request.onsuccess = (function onDatabaseSuccess(evt) {
        var db = this._db = evt.target.result;

        if (!empty) {
          this._starting = false;
          this._runCallbacks();
          return;
        }

        stores.forEach(function createStore(store) {
          var transaction = db.transaction(stores, IDBTransaction.READ_WRITE);
          var objectStore = transaction.objectStore(store);

          var settings = [{
            id: 'lockscreen.enabled',
            value: 'true'
          }, {
            id: 'keyboard.layouts.english',
            value: 'true'
          }, {
            id: 'keyboard.layouts.dvorak',
            value: 'false'
          }, {
            id: 'keyboard.layouts.otherlatins',
            value: 'false'
          }, {
            id: 'keyboard.layouts.cyrillic',
            value: 'false'
          }, {
            id: 'keyboard.layouts.hebrew',
            value: 'false'
          }, {
            id: 'keyboard.layouts.zhuying',
            value: 'false'
          }, {
            id: 'keyboard.layouts.pinying',
            value: 'false'
          }, {
            id: 'keyboard.vibration',
            value: 'true'
          }, {
            id: 'keyboard.clicksound',
            value: 'true'
          }, {
            id: 'airplanemode.enabled',
            value: 'false'
          }, {
            id: 'locationservices.enabled',
            value: 'true'
          }, {
            id: 'wifi.enabled',
            value: 'true'
          }, {
            id: 'dnt.enabled',
            value: 'true'
          }];

          for (var setting in settings) {
            var request = objectStore.put(settings[setting]);

            request.onsuccess = function onsuccess(e) {
              console.log('Success to add a setting to: ' + store);
            }

            request.onerror = function onerror(e) {
              console.log('Failed to add a setting to: ' + store);
            }
          }
        });
        this._starting = false;
        this._runCallbacks();
      }).bind(this);

      request.onerror = (function onDatabaseError(error) {
        this._starting = false;
        this._runCallbacks();
      }).bind(this);
    },

    _getSetting: function settings_getSetting(name, callback) {
      if (this._starting || !this._db) {
        this._startCallbacks.push({
          type: 'get',
          name: name,
          callback: callback
        });
        return;
      }

      var transaction = this._db.transaction(['settings'],
                                             IDBTransaction.READ_ONLY);
      var request = transaction.objectStore('settings').get(name);
      request.onsuccess = function onsuccess(e) {
        var result = e.target.result;
        callback(result ? result.value : null);
      };

      request.onerror = function onerror(e) {
        callback(null);
      };
    },

    _setSetting: function settings_setSetting(name, value, callback) {
      if (this._starting || !this._db) {
        this._startCallbacks.push({
          type: 'set',
          name: name,
          value: value,
          callback: callback
        });
        return;
      }

      var transaction = this._db.transaction(['settings'],
                                           IDBTransaction.READ_WRITE);
      var request = transaction.objectStore('settings').put({
        id: name,
        value: value
      });

      request.onsuccess = function onsuccess(e) {
        callback(e.target.result.value);
      };

      request.onerror = function onerror(e) {
        callback(null);
      };
    },

    _startCallbacks: [],
    _runCallbacks: function settings_runCallbacks() {
      this._startCallbacks.forEach((function startCallbacks(cb) {
        if (cb.type == 'get') {
          this._getSetting(cb.name, cb.callback);
        } else {
          this._setSetting(cb.name, cb.value, cb.callback);
        }
      }).bind(this));
    }
  }

  settingsHandler.initSettings();
  window.addEventListener('message', settingsHandler);
})()

