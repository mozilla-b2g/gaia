(function(window) {
  function Events() {
    Calendar.Store.Abstract.apply(this, arguments);
    this._timeObservers = [];
  }

  Events.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,
    _store: 'events',
    _dependentStores: ['events'],

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
          //     will be in the future...
          self._removeFromCache(cursor.primaryKey);
          cursor.delete();
          cursor.continue();
        }
      };
    }

  };

  Calendar.ns('Store').Event = Events;

}(this));
