define(function(require, exports, module) {
'use strict';

var Abstract = require('./abstract');
var Calc = require('calc');
var denodeifyAll = require('promise').denodeifyAll;

function IcalComponent() {
  Abstract.apply(this, arguments);

  denodeifyAll(this, [
    'findRecurrencesBefore'
  ]);
}
module.exports = IcalComponent;

IcalComponent.prototype = {
  __proto__: Abstract.prototype,

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

    var time = Calc.dateToTransport(maxDate);
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

});
