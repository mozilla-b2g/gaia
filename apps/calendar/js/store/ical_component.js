define(function(require) {
  'use strict';

  var Parent = require('./abstract');
  var calc = require('calc');

  function IcalComponent() {
    Parent.apply(this, arguments);
  }

  IcalComponent.prototype = {
    __proto__: Parent.prototype,

    _store: 'icalComponents',

    /** disable caching */
    _addToCache: function() {},
    _removeFromCache: function() {},

    _createModel: function(object) {
      return object;
    },

    _detectPersistType: function(object) {
      // always fire update.
      return 'update';
    },

    /**
     * Finds all components which have recurrences
     * that are not expanded beyond the given date.
     *
     * @param {Date} maxDate max date to find.
     * @param {Function} callback results of search [err, [icalComp, ...]].
     */
    findRecurrencesBefore: function(maxDate, callback) {
      var trans = this.db.transaction(this._store, 'readwrite');

      trans.onerror = function(event) {
        callback(event.target.error.name);
      };

      var time = calc.dateToTransport(
        maxDate
      );

      var utc = time.utc;
      var range = IDBKeyRange.bound(0, utc);
      var store = trans.objectStore(this._store);
      var idx = store.index('lastRecurrenceId');

      var req = idx.mozGetAll(range);

      req.onsuccess = function(event) {
        callback(null, event.target.result);
      };
    }
  };

  return IcalComponent;
});

