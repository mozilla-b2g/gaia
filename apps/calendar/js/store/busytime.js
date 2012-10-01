Calendar.ns('Store').Busytime = (function() {

  var binsearch = Calendar.binsearch.find;
  var bsearchForInsert = Calendar.binsearch.insert;

  function Busytime() {
    Calendar.Store.Abstract.apply(this, arguments);

    /*
    this._times = [
      time,
      time,
      time
    ]
    */

    /*
    this._eventTimes = {
      eventId: [200, 100]
    }
    */

    /*
    this._timeRecords = {
      //time: [result, result]
      20122: [result]
    }
    */
    this._setupCache();
  }

  Busytime.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,

    _store: 'busytimes',

    _dependentStores: ['alarms', 'busytimes'],

    _parseId: function(id) {
      return id;
    },

    _setupCache: function() {
      // reset time observers
      Calendar.TimeObserver.call(this);

      this._byEventId = Object.create(null);
      this._tree = new Calendar.IntervalTree();
    },

    _removeDependents: function(id, trans) {
      this.db.getStore('Alarm').removeByIndex('busytimeId', id, trans);
    },

    addEvent: function(event, trans, callback) {
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

      var id = event._id;
      this.removeEvent(id, trans);

      var records = this._addEventTimes(event);

      // to add we also must remove
      // an previous references to event...

      records.forEach(function(item) {
        this.persist(item, trans);
      }, this);

      this._transactionCallback(trans, callback);
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

      this._removeEventTimes(id);
      this.removeByIndex('eventId', id, trans);
      this._transactionCallback(trans, callback);
    },

    _startCompare: function(aObj, bObj) {
      var a = aObj.start;
      var b = bObj.start;

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

      // XXX: we need to implement busytime chunking
      // to make this efficient.
      var keyRange = IDBKeyRange.lowerBound(span.start);

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
          { start: (span.end + 1) },
          self._startCompare
        );

        // remove unrelated timespan...
        data = data.slice(0, idx);

        // add records to the cache
        data.forEach(function(item) {
          //XXX: Maybe we want to seperate
          //set of events for persist vs load?
          self._addTime(item);
        });

        // fire callback
        if (callback)
          callback(null, data);

      };
    },

    /**
     * Creates a record for an time/event
     *
     * @param {Date} time position of event.
     * @param {Object} event associated event.
     */
    _eventToRecord: function(event) {

      var id = this.db.getStore('Event').busytimeIdFor(event);

      var result = {
        _id: id,
        start: event.remote.start,
        end: event.remote.end,
        eventId: event._id,
        calendarId: event.calendarId
      };

      return result;
    },

    /* we don't use id based caching for busytimes */

    _addToCache: function() {},
    _removeFromCache: function() {},

    _onLoadCache: function(object) {
      this._addTime(
        object
      );
    },

    /**
     * Adds a busytime to the cache.
     * Emits an add time event when item
     * is added newly or loaded.
     *
     * @param {Object} record busytime record.
     */
    _addTime: function(record) {
      if (!(record.eventId in this._byEventId)) {
        this._byEventId[record.eventId] = [];
      }

      this._byEventId[record.eventId].push(record);
      this._tree.add(record);

      this.emit('add time', record);
    },

    _addEventTimes: function(event) {
      var i = 0;
      var len = event.remote.occurs.length;
      var time;
      var record;
      var results = [];

      if (!(event._id in this._byEventId)) {
        this._byEventId[event._id] = [];
      }

      for (; i < len; i++) {
        time = event.remote.occurs[i];
        record = this._eventToRecord(time, event);
        this._addTime(record);
        results.push(record);
      }

      return results;
    },

    _removeEventTimes: function(id) {
      var records = this._byEventId[id];
      delete this._byEventId[id];

      // if its not in memory we are fine.
      // by contract its in memory if you
      // care about it and events will be fired.
      if (!records)
        return;

      records.forEach(function(record) {
        this._tree.remove(record);
        this.emit('remove time', record);
      }, this);
    }
  };

  return Busytime;

}(this));
