(function(window) {

  function Events() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Events.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,
    _store: 'events',
    _dependentStores: ['events', 'busytimes'],

    /**
     * Link busytime dependants see _addDependents.
     */
    _removeDependents: function(id, trans) {
      var busy = this.db.getStore('Busytime');
      busy.removeEvent(id, trans);
    },

    /**
     * Link dependants (busytimes) into the
     * creation/removal process. This should
     * keep all deps in sync as such you
     * should _always_ use the persist/remove methods
     * and never directly touch the db.
     */
    _addDependents: function(obj, trans) {
      var busy = this.db.getStore('Busytime');
      busy.addEvent(obj, trans);
    },

    /**
     * Generate an id for a newly created record.
     * Based off of remote id (uuid) and calendar id.
     */
    _assignId: function(obj) {
      var id = obj.calendarId + '-' + obj.remote.id;
      return obj._id = id;
    },

    /**
     * Loads all events for given calendarId
     * and returns results. Does not cache.
     *
     * @param {String} calendarId calendar to find.
     * @param {Function} callback node style err, array of events.
     */
    eventsForCalendar: function(calendarId, callback) {
      var trans = this.db.transaction('events');
      var store = trans.objectStore('events');
      var index = store.index('calendarId');
      var key = IDBKeyRange.only(calendarId);

      var req = index.mozGetAll(key);

      req.onsuccess = function(e) {
        callback(null, e.target.result);
      };

      req.onerror = function(e) {
        callback(e);
      };
    },

    /**
     * Override default parse id which
     * does a parseInt operation.
     */
    _parseId: function(id) {
      return id;
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
          self._removeDependents(cursor.primaryKey, trans);
          cursor.delete();
          cursor.continue();
        }
      };
    }
  };

  Calendar.ns('Store').Event = Events;

}(this));
