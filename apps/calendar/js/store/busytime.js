Calendar.ns('Store').Busytime = (function() {

  function binsearch(list, seekVal, cmpfunc, aLow, aHigh) {
    var low = ((aLow === undefined) ? 0 : aLow),
        high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
        mid, cmpval;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);
      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        return mid;
    }

    return null;
  }

  function bsearchForRange(list, seekVal, cmpfunc) {
    if (!list.length)
      return 0;

    var low = 0, high = list.length - 1,
        mid, cmpval;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);

      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }

    if (cmpval < 0)
      return mid; // insertion is displacing, so use mid outright.
    else if (cmpval > 0)
      return mid + 1;
    else
      return mid;
  };


  function bsearchForInsert(list, seekVal, cmpfunc) {
    if (!list.length)
      return 0;

    var low = 0, high = list.length - 1,
        mid, cmpval;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      cmpval = cmpfunc(seekVal, list[mid]);

      if (cmpval < 0)
        high = mid - 1;
      else if (cmpval > 0)
        low = mid + 1;
      else
        break;
    }

    if (cmpval < 0)
      return mid; // insertion is displacing, so use mid outright.
    else if (cmpval > 0)
      return mid + 1;
    else
      return mid;
  };

  Busytime.bsearchForInsert = bsearchForInsert;

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
      this._eventTimes = Object.create(null);
      this._timeRecords = Object.create(null);
      this._cached = Object.create(null);
      this._timeObservers = [];
      this._times = [];
    },

    _compareTimeIndex: function(value, target) {
      if (value < target) {
        return -1;
      } else if (value > target) {
        return 1;
      } else {
        return 0;
      }
    },

    _findClosest: function(time) {
      return bsearchForRange(
        this._times,
        time,
        this._compareTimeIndex
      );
    },

    _findTime: function(time) {
      return binsearch(
        this._times,
        time,
        this._compareTimeIndex
      );
    },

    _timeIndex: function(time) {
      return bsearchForInsert(
        this._times,
        time,
        this._compareTimeIndex
      );
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
      var i = 0;
      var len = this._timeObservers.length;
      var idx = null;
      var field;

      for (; i < len; i++) {
        field = this._timeObservers[i];
        if (field[0] === timespan &&
            field[1] === callback) {

          idx = i;
          break;
        }
      }

      if (idx !== null) {
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
     * @param {Date} time time the event is related to.
     * @param {Object} data data related to event.
     */
    fireTimeEvent: function(type, time, data) {
      var i = 0;
      var len = this._timeObservers.length;
      var observer;
      var event = {
        time: time,
        data: data,
        type: type
      };

      for (; i < len; i++) {
        observer = this._timeObservers[i];
        if (observer[0].contains(time)) {
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
        object.startDate.valueOf(),
        object
      );
    },

    _addTime: function(time, record) {
      if (!(record.eventId in this._eventTimes)) {
        this._eventTimes[record.eventId] = [];
      }

      this._eventTimes[record.eventId].push(time);

      if (!(time in this._timeRecords)) {
        var idx = this._timeIndex(time);
        this._times.splice(idx, 0, time);
        this._timeRecords[time] = [record];
      } else {
        this._timeRecords[time].push(record);
      }

      this.fireTimeEvent('add', time, record);
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

      // XXX we can do a significant
      // amount of optimization here I think

      var start = span.start;
      var end = span.end;

      var totalLen = this._times.length - 1;
      var startIdx = this._findClosest(start);
      var endIdx = this._findClosest(end);

      endIdx = (endIdx > totalLen) ? totalLen : endIdx;

      if (!span.contains(this._times[startIdx]))
        return [];

      var i = startIdx;
      var results = [];
      var time;

      function addResult(val) {
        results.push(val);
      }

      for (; i <= endIdx; i++) {
        time = this._times[i];
        this._timeRecords[time].forEach(addResult);
      }

      return results;
    },

    _addEventTimes: function(event) {
      var i = 0;
      var len = event.remote.occurs.length;
      var time;
      var record;
      var results = [];

      if (!(event._id in this._eventTimes)) {
        this._eventTimes[event._id] = [];
      }

      for (; i < len; i++) {
        time = event.remote.occurs[i];
        record = this._eventToRecord(time, event);
        this._addTime(time.valueOf(), record);
        results.push(record);
      }

      return results;
    },

    _removeEventTimes: function(id) {
      var times = this._eventTimes[id];
      delete this._eventTimes[id];

      // if its not in memory we are fine.
      // by contract its in memory if you
      // care about it and events will be fired.
      if (!times)
        return;

      times.forEach(function(time) {
        var timeset = this._timeRecords[time];
        timeset.forEach(function(record, idx) {
          if (record.eventId === id) {
            timeset.splice(idx, 1);
            this.fireTimeEvent('remove', time, record);
          }
        }, this);

        if (timeset.length === 0) {
          this._times.splice(this._findTime(time), 1);
          delete this._timeRecords[time];
        }
      }, this);
    }
  };

  return Busytime;

}(this));
