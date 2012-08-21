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

    _setupCache: function() {
      this._cached = Object.create(null);
      this._timeObservers = [];

      this._byEventId = Object.create(null);
      this._tree = new Calendar.IntervalTree();
    },

    addEvent: function(event, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._store,
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
          this._store,
          'readwrite'
        );
      }

      this._removeEventTimes(id);

      var store = trans.objectStore('busytimes');
      var index = store.index('eventId');
      var range = IDBKeyRange.only(id);
      var req = index.openCursor(range);

      req.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          var req = cursor.delete();
          cursor.continue();
        }
      };

      this._transactionCallback(trans, callback);
    },

   /**
     * Adds observer for timespan.
     *
     * Object example:
     *
     *    object.handleEvent = function(e) {
     *      // e.type
     *      // e.data
     *      // e.time
     *    }
     *
     *    // when given an object
     *    EventStore.observe(timespan, object)
     *
     *
     * Callback example:
     *
     *    EventStore.observe(timespan, function(event) {
     *      // e.type
     *      // e.data
     *      // e.time
     *    });
     *
     * @param {Calendar.Timespan} timespan span to observe.
     * @param {Function|Object} callback function or object follows
     *                                   EventTarget pattern.
     */
    observeTime: function(timespan, callback) {
      if (!(timespan instanceof Calendar.Timespan)) {
        throw new Error(
          'must pass an instance of Calendar.Timespan as first argument'
        );
      }
      this._timeObservers.push([timespan, callback]);
    },

    /**
     * Finds index of timespan/object|callback pair.
     *
     * Used internally and in tests has little practical use
     * unless you have the original timespan object.
     *
     * @param {Calendar.Timespan} timespan original (===) timespan used.
     * @param {Function|Object} callback original callback/object.
     * @return {Numeric} -1 when not found otherwise index.
     */
    findTimeObserver: function(timespan, callback) {
      var len = this._timeObservers.length;
      var idx = null;
      var field;
      var i = 0;

      for (; i < len; i++) {
        field = this._timeObservers[i];

        if (field[0] === timespan &&
            field[1] === callback) {

          return i;
        }
      }

      return -1;
    },

    /**
     * Removes a time observer you
     * must pass the same instance of both
     * the timespan and the callback/object
     *
     *
     * @param {Calendar.Timespan} timespan timespan object.
     * @param {Function|Object} callback original callback/object.
     * @return {Boolean} true when found & removed callback.
     */
    removeTimeObserver: function(timespan, callback) {
      var idx = this.findTimeObserver(timespan, callback);

      if (idx !== -1) {
        this._timeObservers.splice(idx, 1);
        return true;
      } else {
        return false;
      }
    },

    /**
     * Fires a time based event.
     *
     * @param {String} type name of event.
     * @param {Date|Numeric} start start position of time event.
     * @param {Date|Numeric} end end position of time event.
     * @param {Object} data data related to event.
     */
    fireTimeEvent: function(type, start, end, data) {
      var i = 0;
      var len = this._timeObservers.length;
      var observer;
      var event = {
        time: true,
        data: data,
        type: type
      };

      for (; i < len; i++) {
        observer = this._timeObservers[i];
        if (observer[0].overlaps(start, end)) {
          if (typeof(observer[1]) === 'object') {
            observer[1].handleEvent(event);
          } else {
            observer[1](event);
          }
        }
      }
    },

    /**
     * Creates a record for an time/event
     *
     * @param {Date} time position of event.
     * @param {Object} event associated event.
     */
    _eventToRecord: function(time, event) {
      var result = {
        startDate: time,
        //XXX Quick hack - we need to do a recurring lookup
        endDate: event.remote.endDate,
        eventId: event._id,
        calendarId: event.calendarId
      };

      result.start = result.startDate.valueOf();
      result.end = result.endDate.valueOf();

      // Knowing the ID ahead of time
      // lets us flush it to the UI before
      // it actually hits the database ( then later
      // if its removed we can find it by id )
      // That said I don't like this method of
      // assigning the id. Maybe use UUID?
      result._id = result.startDate.valueOf() + '-' +
                   result.endDate.valueOf() + '-' +
                   result.eventId;

      return result;
    },

    _onLoadCache: function(object) {
      this._addToCache(object);
      this._addTime(
        object
      );
    },

    _addTime: function(record) {
      if (!(record.eventId in this._byEventId)) {
        this._byEventId[record.eventId] = [];
      }

      this._byEventId[record.eventId].push(record);
      this._tree.add(record);

      this.fireTimeEvent(
        'add',
        record.startDate,
        record.endDate,
        record
      );
    },

    /**
     * Span returns an array of busytime / event pairs.
     *
     *    busytime.eventsInSpan(function(err, list) {
     *      list.forEach(function(item) {
     *        // item => [busytime, event]
     *      });
     *    });
     *
     * @param {Calendar.Timespan} timespan desired range.
     * @param {Function} callback node style.
     */
    eventsInCachedSpan: function(timespan, callback) {
      // XXX: speed this up we can probably
      // avoid the double array scan.

      var results = [];
      var eventStore = this.db.getStore('Event');
      var idTable = Object.create(null);

      // 1. build list of event ids & load them
      var times = this.busytimesInCachedSpan(timespan);

      times.forEach(function(item) {
        idTable[item.eventId] = true;
      });

      // create unique list of event ids...
      var ids = Object.keys(idTable);
      idTable = undefined;

      eventStore.findByIds(ids, function(err, list) {
        if (err) {
          callback(err);
          return;
        }

        var i = 0;
        var len = times.length;
        var record;
        var event;

        for (; i < len; i++) {
          record = times[i];
          event = list[record.eventId];
          if (event) {
            results.push([record, event]);
          }
        }

        callback(null, results);
      });
    },

    /**
     * Gets all records in span.
     */
    busytimesInCachedSpan: function(span) {
      return this._tree.query(span);
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
        this.fireTimeEvent(
          'remove',
          record.startDate,
          record.endDate,
          record
        );
      }, this);
    }
  };

  return Busytime;

}(this));
