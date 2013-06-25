(function(window) {

  function Events() {
    Calendar.Store.Abstract.apply(this, arguments);
  }

  Events.prototype = {
    __proto__: Calendar.Store.Abstract.prototype,
    _store: 'events',
    _dependentStores: ['events', 'busytimes', 'alarms', 'icalComponents'],

    /** disable caching */
    _addToCache: function() {},
    _removeFromCache: function() {},

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

      var component = this.db.getStore('IcalComponent');
      component.remove(id, trans);
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
     * Shortcut finds provider for given event.
     *
     * @param {Object} event full event record from db.
     */
    providerFor: function(event, callback) {
      this.ownersOf(event, function(err, owners) {
        callback(null, Calendar.App.provider(
          owners.account.providerType
        ));
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
      var self = this;

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
          results[item._id] = self._createModel(item);
        }

        next();
      }

      function error() {
        // can't find it or something
        // skip!
        next();
      }

      ids.forEach(function(id) {
        var trans = this.db.transaction('events');
        var store = trans.objectStore('events');
        var req = store.get(id);

        req.onsuccess = success;
        req.onerror = error;
      }, this);
    },

    /**
     * Finds calendar/account for a given event.
     *
     * @param {Object} event must contain .calendarId.
     * @param {Function} callback [err, { ... }].
     */
    ownersOf: Calendar.Store.Calendar.prototype.ownersOf,
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
    }

  };

  Calendar.ns('Store').Event = Events;

}(this));
