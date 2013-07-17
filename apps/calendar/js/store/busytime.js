Calendar.ns('Store').Busytime = (function() {

  var binsearch = Calendar.binsearch.find;
  var bsearchForInsert = Calendar.binsearch.insert;

  /**
   * Objects saved in the busytime store:
   *
   *    {
   *      _id: (uuid),
   *      start: Calendar.Calc.dateToTransport(x),
   *      end: Calendar.Calc.dateToTransport(x),
   *      eventId: eventId,
   *      calendarId: calendarId
   *    }
   *
   */
  function Busytime() {
    Calendar.Store.Abstract.apply(this, arguments);
    this._setupCache();
  }

  Busytime.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'busytimes',

    _dependentStores: ['alarms', 'busytimes'],

    _setupCache: function() {
      // reset time observers
      Calendar.TimeObserver.call(this);

      this._byEventId = Object.create(null);
    },

    _createModel: function(input, id) {
      return this.initRecord(input, id);
    },

    initRecord: function(input, id) {
      var _super = Calendar.Store.Abstract.prototype._createModel;
      var model = _super.apply(this, arguments);

      model.startDate = Calendar.Calc.dateFromTransport(
        model.start
      );

      model.endDate = Calendar.Calc.dateFromTransport(
        model.end
      );

      return model;
    },

    _removeDependents: function(id, trans) {
      this.db.getStore('Alarm').removeByIndex('busytimeId', id, trans);
    },

    removeEvent: function(id, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._dependentStores,
          'readwrite'
        );
      }

      // build the request using the inherited method
      var req = this.removeByIndex('eventId', id, trans);

      // get the original method which handles the generic bit
      var success = req.onsuccess;

      // override the default .onsuccess to get the ids
      // so we can emit remove events.
      var self = this;
      req.onsuccess = function(e) {
        var cursor = e.target.result;

        if (cursor) {
          var id = cursor.primaryKey;
          self.emit('remove', id);
        }

        success(e);
      };

      this._transactionCallback(trans, callback);
    },

    _startCompare: function(aObj, bObj) {
      var a = aObj.start.utc;
      var b = bObj.start.utc;

      return Calendar.compare(a, b);
    },

    /**
     * Loads all busytimes in given timespan.
     *
     * @param {Calendar.Timespan} span timespan.
     * @param {Function} callback node style callback
     *                            where first argument is
     *                            an error (or null)
     *                            and the second argument
     *                            is a list of all loaded
     *                            busytimes in the timespan.
     */
    loadSpan: function(span, callback) {
      var trans = this.db.transaction(this._store);
      var store = trans.objectStore(this._store);

      var startPoint = Calendar.Calc.dateToTransport(
        new Date(span.start)
      );

      var endPoint = Calendar.Calc.dateToTransport(
        new Date(span.end)
      );

      // XXX: we need to implement busytime chunking
      // to make this efficient.
      var keyRange = IDBKeyRange.lowerBound(startPoint.utc);

      var index = store.index('end');
      var self = this;

      index.mozGetAll(keyRange).onsuccess = function(e) {
        var data = e.target.result;

        // sort data
        data = data.sort(self._startCompare);

        // attempt to find a start time that occurs
        // after the end time of the span
        var idx = Calendar.binsearch.insert(
          data,
          { start: { utc: endPoint.utc + 1 } },
          self._startCompare
        );

        // remove unrelated timespan...
        data = data.slice(0, idx);

        // fire callback
        if (callback)
          callback(null, data.map(function(item) {
            return self.initRecord(item);
          }));

      };
    },

    /* we don't use id based caching for busytimes */

    _addToCache: function() {},
    _removeFromCache: function() {}

  };

  return Busytime;

}(this));
