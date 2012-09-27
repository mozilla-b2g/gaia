(function(window) {

  function Events() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Events.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,
    _store: 'events',
    _dependentStores: ['events', 'busytimes'],

    _createModel: function(input, id) {
      var _super = Calendar.Store.Abstract.prototype._createModel;
      var model = _super.apply(this, arguments);

      model.remote.startDate = Calendar.Calc.dateFromTransport(
        model.remote.start
      );

      model.remote.endDate = Calendar.Calc.dateFromTransport(
        model.remote.end
      );

      return model;
    },

    /**
     * Link busytime dependants see _addDependents.
     */
    _removeDependents: function(id, trans) {
      this.removeByIndex('parentId', id, trans);

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
     * Finds associated events with a given
     * list of records that have a eventId property.
     * Results are returned in the same order
     * as the given records.
     *
     * Results are paired [associated, event].
     * Commonly used for busytime to event lookups...
     *
     * @param {Array} records array of associated records.
     * @param {Function} callback node style.
     */
    findByAssociated: function(records, callback) {
      records = (Array.isArray(records)) ? records : [records];

      var results = [];
      var idTable = Object.create(null);

      records.forEach(function(item) {
        idTable[item.eventId] = true;
      });

      // create unique list of event ids...
      var ids = Object.keys(idTable);
      idTable = undefined;

      this.findByIds(ids, function(err, list) {
        if (err) {
          callback(err);
          return;
        }

        var i = 0;
        var len = records.length;
        var record;
        var event;

        for (; i < len; i++) {
          record = records[i];
          event = list[record.eventId];
          if (event) {
            results.push([record, event]);
          }
        }

        callback(null, results);
      });

    },

    /**
     * Finds a list of events by id.
     *
     * @param {Array} ids list of ids.
     * @param {Function} callback node style second argument
     *                            is an object of _id/event.
     */
    findByIds: function(ids, callback) {
      var results = {};
      var pending = ids.length;

      function next() {
        if (!(--pending)) {
          // fatal errors should break
          // and so we are not handling them
          // here...
          callback(null, results);
        }
      }

      function success(e) {
        var item = e.target.result;

        if (item) {
          results[item._id] = item;
        }

        next();
      }

      function error() {
        // can't find it or something
        // skip!
        next();
      }

      ids.forEach(function(id) {
        if (id in this.cached) {
          results[id] = this.cached[id];
          next();
        } else {
          var trans = this.db.transaction('events');
          var store = trans.objectStore('events');
          var req = store.get(id);

          req.onsuccess = success;
          req.onerror = error;
        }
      }, this);
    },

    /**
     * Loads all events for given calendarId
     * and returns results. Does not cache.
     *
     * @param {String} calendarId calendar to find.
     * @param {Function} callback node style [err, array of events].
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
     * @param {String} indexName name of event index.
     * @param {Numeric} indexValue should match index.
     * @param {IDBTransation} [trans] optional transaction to reuse.
     * @param {Function} [callback] optional callback to use.
     *                   When called without a transaction chances
     *                   are you should pass a callback.
     */
    removeByIndex: function(indexName, indexValue, trans, callback) {
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

      var index = trans.objectStore('events').index(indexName);
      var req = index.openCursor(
        IDBKeyRange.only(indexValue)
      );

      req.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
          //XXX: We need to trigger a remove dependants
          //     action here? Events are not tied
          //     directly to anything else right now but they
          //     may be in the future...

          // remove deps first intentionally to mimic, removes normal behaviour
          self._removeDependents(cursor.primaryKey, trans);
          self._removeFromCache(cursor.primaryKey);
          cursor.delete();
          cursor.continue();
        }
      };
    }
  };

  Calendar.ns('Store').Event = Events;

}(this));
