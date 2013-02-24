/**
 * MozAlarm (https://wiki.mozilla.org/WebAPI/AlarmAPI).
 * Shim layer. Uses IndexedDB to store the records
 * and setInterval to poll for triggers.
 *
 * Will also override the existing 'mozSetMessageHandler' method
 * if available and catch all 'alarm' callbacks.
 */
(function() {

  // don't shim the phones
  if (navigator.mozAlarms && navigator.userAgent.indexOf('Mobile') !== -1)
    return;

  console.log('(Debug mode on) navigator.mozAlarm shim active');

  // check every 10 seconds
  const DEFAULT_INTERVAL = 10000;

  /** mozSetMessageHandler */

  var messageHandler;

  function fireMessageHandler(data) {
    if (messageHandler) {
      if (typeof(messageHandler) === 'object') {
        // not sure if alarm is correct?
        messageHandler.handleEvent({ type: 'alarm', data: data });
      } else {
        messageHandler({ data: data });
      }
    }
  }

  var realMsgHandler = navigator.mozSetMessageHandler;

  // do the override
  navigator.mozSetMessageHandler = function(type, callback) {
    if (type === 'alarm') {
      messageHandler = callback;
    } else if (realMsgHandler) {
      realMsgHandler.apply(navigator, arguments);
    }
  };

  /** alarm db */
  var idb = window.indexedDB;

  function Db(name) {
    var self = this;
    var req = idb.open(name);

    req.onupgradeneeded = function() {
      var db = req.result;

      /**
       * Create alarm store. It is expected each item
       * in the store has the following fields:
       *
       * trigger: (Date) user defined trigger
       * data: (Object) user defined
       * respectTimezone: (String) timezone settings.
       *
       */
      var alarms = db.createObjectStore('alarms', { autoIncrement: true });

      alarms.createIndex(
        'trigger', 'trigger',
        { unique: false, multiEntry: false }
      );
    };

    req.onsuccess = function(e) {
      self.open = true;
      self.connection = e.target.result;

      if (self.onsuccess)
        self.onsuccess.apply(self, arguments);
    };

    req.onerror = function() {
      if (self.onerror)
        self.onerror.apply(self, arguments);
    };

    req.onblocked = function() {
      throw new Error('Blocked');
    };
  }

  Db.prototype = {
    getAll: function() {
      var trans = this.connection.transaction('alarms');
      var store = trans.objectStore('alarms');
      return store.mozGetAll();
    },

    add: function(date, respectTimezone, data) {
      if (date < (new Date())) {
        var errorHandlers = [];
        var promise = {
          addEventListener: function(type, handler) {
            if (type === 'error') {
              errorHandlers.push(handler);
            }
          }
        };

        setTimeout(function() {
          if (promise.onerror) {
            errorHandlers.push(promise.onerror);
          }

          var event = {
            target: {
              error: new Error('alarm must come after now')
            }
          };

          errorHandlers.forEach(function(item) {
            item(event);
          });
        }, 0);

        return promise;
      }

      var record = {
        trigger: date,
        respectTimezone: respectTimezone,
        data: data
      };

      var trans = this.connection.transaction('alarms', 'readwrite');
      var store = trans.objectStore('alarms');

      var req = store.add(record);
      return req;
    },

    remove: function(id) {
      var trans = this.connection.transaction('alarms', 'readwrite');
      var store = trans.objectStore('alarms');

      return store.delete(id);
    }
  };

  /** mozAlarm */

  var db = new Db('_mozAlarmShim');

  /**
   * Each record in the queue is a 'promise'
   * in the form of an object (like a DOMRequest).
   * When the db is opened we copy the methods
   * defined on the promise over so they actually
   * do the right thing.
   */
  var queue = [];

  function QueueRequest() {
    this._events = Object.create(null);
  }

  QueueRequest.prototype = {
    addEventListener: function(type, callback) {
      if (!(type in this._events)) {
        this._events[type] = [];
      }

      // addEventListener by spec should not
      // accept duplicate callbacks. Check here...
      var list = this._events[type];
      var idx = list.indexOf(callback);

      if (idx === -1) {
        // only append new callbacks
        list.push(callback);
      }
    },

    removeEventListener: function(type, callback) {
      if ((type in this._events)) {
        var list = this._events[type];
        var idx = list.indexOf(callback);
        list.splice(idx, 1);
      }
    }
  };

  function queueMethod(name) {
    return function() {
      var promise = new QueueRequest();
      queue.push({
        method: name,
        arguments: arguments,
        promise: promise
      });

      return promise;
    }
  }

  /**
   * The initial api is a queue system because
   * we must wait until the database is opened.
   * There is no deterministic way we can do this
   * without having a queue api. So when the page
   * is initially loaded the queue api is exposed
   * then overriden with the actual api once the db
   * is fully opened.
   */
  var api = {
    getAll: queueMethod('getAll'),
    remove: queueMethod('remove'),
    add: queueMethod('add'),
    _interval: DEFAULT_INTERVAL
  };

  navigator.mozAlarms = api;

  db.onsuccess = function() {
    queue.forEach(function(item) {
      var method = item.method;
      var args = item.arguments;
      var promise = item.promise;

      var result = db[method].apply(db, args);

      // copy the 'addEventListener' callbacks over.
      if (promise._events) {
        for (var eventName in promise._events) {
          result.forEach(
            result.addEventListener.bind(result, eventName)
          );
        }
      }

      // copy the '.onerror' style callbacks over.
      for (var key in promise) {
        // promise has a prototype which contains the
        // shim for addEventListener, etc.. which we want
        // to ignore.
        if (promise.hasOwnProperty(key)) {
          result[key] = promise[key];
        }
      }
    });

    // override the queue api...
    api.getAll = db.getAll.bind(db);
    api.remove = db.remove.bind(db);
    api.add = db.add.bind(db);

    queue = null;
    watchAlarms();
  };

  /**
   * Check all available alarms when the trigger
   * data of an alarm is in the past fire the handler
   */
  function watchAlarms() {
    var now = new Date();
    var trans = db.connection.transaction('alarms', 'readwrite');
    var store = trans.objectStore('alarms');

    store.index('trigger').openCursor().onsuccess = function(e) {
      var cursor = e.target.result;
      if (cursor) {
        if (now > cursor.key) {
          cursor.delete();
          cursor.continue();
          fireMessageHandler(cursor.value.data);
        }
      }
    };

    trans.oncomplete = function() {
      var interval = api._interval || DEFAULT_INTERVAL;
      setTimeout(watchAlarms, interval);
    };
  }

}());
