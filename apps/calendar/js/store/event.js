(function(window) {
  function Events() {
    Calendar.Store.Abstract.apply(this, arguments);

    this._timeObservers = [];

    //XXX: Experiment with tree data-types
    this._eventsByTime = Object.create(null);
    this._times = [];
    this._cachedSpan = null;
  }

  Events.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,
    _store: 'events',
    _dependentStores: ['events'],

    _assignId: function(obj) {
      var id = obj.calendarId + '-' + obj.remote.id;
      return obj._id = id;
    },

    _freeCachedRange: function(range) {
      // also need to optimize here...
      var i = 0;
      var len = this._times.length;
      var matchStart = null;
      var time;
      var timeEvents;

      function checkEventSpan(e) {
        if (e._id in this._cached) {
          var occurs = e.remote.occurs;
          var start = occurs[0];
          var end = occurs[occurs.length - 1];

          if (range.start <= start &&
              range.end >= end) {

            delete this._cached[e._id];
          }
        }
      }

      for (; i < this._times.length; i++) {
        time = this._times[i];

        // check for a match
        if (range.containsNumeric(time)) {

          if (matchStart === null) {
            matchStart = i;
          }

          timeEvents = this._eventsByTime[time];
          timeEvents.forEach(checkEventSpan, this);

          delete this._eventsByTime[time];
        } else if (time > range.end) {
          break;
        } else {
          // everything after the first
          // match should be in range
          // when we have hit a point
          // where there are no more matches
          // we are done since time is always
          // in order.
          if (matchStart !== null) {
            break;
          }
        }
      }

      if (matchStart !== null) {
        this._times.splice(
          matchStart,
          i - matchStart
        );
        this.fireTimeEvent(range, 'free cache');
      }
    },

    _addToCache: function(event) {
      var remote = event.remote;
      var id = event._id;

      this._cached[id] = event;

      remote.occurs.forEach(function(time) {
        this._addCachedTime(time.valueOf(), event);
      }, this);
    },

    _addCachedTime: function(time, event) {
      if (!(time in this._eventsByTime)) {
        var i = 0;
        var len = this._times.length;
        var current;
        var added = false;

        //TODO: make this faster
        for (; i < len; i++) {
          current = this._times[i];
          if (current > time) {
            added = true;
            this._times.splice(i, 0, time);
            break;
          }
        }

        if (!added)
          this._times.push(time);

        this._eventsByTime[time] = [event];
      } else {
        this._eventsByTime[time].push(event);
      }
    },

    _removeFromCache: function(id) {

      // remove from cache
      var event = this._cached[id];
      var occurs = event.remote.occurs;

      delete this._cached[id];

      // now remove associated times

      var i = 0;
      var len = occurs.length;

      for (; i < len; i++) {
        this._removeCachedTime(
          occurs[i].valueOf(),
          event
        );
      }
    },

    _removeCachedTime: function(time, event) {
      var byTime = this._eventsByTime[time];

      var intimeIdx = byTime.indexOf(event);
      byTime.splice(intimeIdx, 1);

      if (byTime.length === 0) {
        this._times.splice(
          this._times.indexOf(time),
          1
        );
      }
    },

    /**
     * Returns new spans and drops
     * old caches of the old ones.
     */
    _handleSpanChange: function(newSpan) {
      if (this._cachedSpan) {

        var oldSpan = this._cachedSpan;

        if (oldSpan.contains(newSpan)) {
          return false;
        }

        if (newSpan.start > oldSpan.start) {
          // clear cache
          this._freeCachedRange(
            new Calendar.Timespan(
              oldSpan.start,
              newSpan.start - 1
            )
          );
        }

        var start = (newSpan.start > oldSpan.end) ?
                      newSpan.start :
                      oldSpan.end + 1;

        return new Calendar.Timespan(
          start,
          newSpan.end
        );
      } else {
        return new Calendar.Timespan(
          newSpan.start,
          newSpan.end
        );
      }
    },

    _parseId: function(id) {
      return id;
    },

    /**
     * Gets all events in timespan that
     * are currently cached in order
     * of when they occur.
     *
     * Events that occur multiple times
     * in the span will be included.
     */
    cachedSpan: function(span) {
      var results = [];

      //XXX: We can *greatly* optimize this
      var i = 0;
      var len = this._times.length;
      var time;
      var hasMatched;
      var events;

      function pushToResults(event) {
        results.push(event);
      }

      for (; i < len; i++) {
        time = this._times[i];

        if (span.contains(time)) {
          hasMatched = true;

          this._eventsByTime[time].forEach(
            pushToResults
          );

        } else if (hasMatched) {
          // we have completed the search.
          break;
        }
      }

      return results;
    },

    /**
     * Loads a range of events.
     *
     * @param {Calendar.Timespan} span timespan.
     * @param {Function} callback node style.
     */
    loadSpan: function(span, trans, callback) {
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._store
        );
      }

      span = this._handleSpanChange(span);

      if (!span) {
        return callback(null);
      }

      var store = trans.objectStore(this._store);
      var self = this;

      var keyRange = IDBKeyRange.bound(
        new Date(span.start),
        new Date(span.end)
      );

      var cursor = store.index('occurs').openCursor(
        keyRange
      );

      cursor.onsuccess = function(e) {
        var cursor = e.target.result;

        if (cursor) {
          var id = cursor.value._id;
          var time = cursor.key.valueOf();

          if (!(id in self._cached)) {
            self._cached[id] = cursor.value;
          }

          var model = self._cached[id];

          self._addCachedTime(
            time,
            model
          );

          self.fireTimeEvent(
            'load',
            time,
            model
          );

          cursor.continue();
        }
      };

      trans.addEventListener('error', function(e) {
        callback(e);
      });

      trans.addEventListener('complete', function() {
        callback(null);
      });
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
     * Removes all events by their calendarId and removes
     * them from the cache. 'remove' events are *not* emitted
     * when removing in this manner for performance reasons.
     * The frontend should listen to a calendar remove event
     * as this method should really only be used in conjunction
     * with that event.
     *
     * This method is automatically called downstream of a calendar
     * removal as part of the _removeDependents step.
     *
     * @param {Numeric} calendarId should match index.
     * @param {IDBTransation} [trans] optional transaction to reuse.
     * @param {Function} [callback] optional callback to use.
     *                   When called without a transaction chances
     *                   are you should pass a callback.
     */
    removeByCalendarId: function(calendarId, trans, callback) {
      var self = this;
      if (typeof(trans) === 'function') {
        callback = trans;
        trans = undefined;
      }

      if (typeof(trans) === 'undefined') {
        trans = this.db.transaction(
          this._dependentStores || this._store,
          'readwrite'
        );
      }
      if (callback) {
        trans.addEventListener('complete', function() {
          callback(null);
        }, false);

        trans.addEventListener('error', function(event) {
          callback(event);
        });
      }

      var index = trans.objectStore('events').index('calendarId');
      var req = index.openCursor(
        IDBKeyRange.only(calendarId)
      );

      req.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          //XXX: We need to trigger a remove dependants
          //     action here? Events are not tied
          //     directly to anything else right now but they
          //     may be in the future...
          self._removeFromCache(cursor.primaryKey);
          cursor.delete();
          cursor.continue();
        }
      };
    }
  };

  Calendar.ns('Store').Event = Events;

}(this));
