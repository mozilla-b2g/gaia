Calendar.ns('Provider').Local = (function() {

  const LOCAL_CALENDAR_ID = 'local-first';

  function Local() {
    Calendar.Provider.Abstract.apply(this, arguments);

    this.events = this.app.store('Event');
    this.busytimes = this.app.store('Busytime');
    this.alarms = this.app.store('Alarm');
  }

  Local.calendarId = LOCAL_CALENDAR_ID;

  /**
   * Returns the details for the default calendars.
   */
  Local.defaultCalendar = function() {
    //XXX: Make async
    var l10nId = 'calendar-local';
    var list = {};
    var name;

    if ('mozL10n' in window.navigator) {
      name = window.navigator.mozL10n.get(l10nId);
      if (name === l10nId) {
        name = null;
      }
    }

    if (!name) {
      name = 'Offline calendar';
    }

    return {
      // XXX localize this name somewhere
      name: name,
      id: LOCAL_CALENDAR_ID,
      color: Local.prototype.defaultColor
    };

  };

  Local.prototype = {
    __proto__: Calendar.Provider.Abstract.prototype,

    getAccount: function(account, callback) {
      callback(null, {});
    },

    findCalendars: function(account, callback) {
      var list = {};
      list[LOCAL_CALENDAR_ID] = Local.defaultCalendar();
      callback(null, list);
    },

    syncEvents: function(account, calendar, cb) {
      cb(null);
    },

    /**
     * See abstract for contract details...
     *
     * Finds all events that have not been expanded
     * beyond the given point and expands / persists them.
     *
     * @param {Date} maxDate maximum date to expand to.
     * @param {Function} callback [err, didExpand].
     */
    ensureRecurrencesExpanded: function(maxDate, callback) {
      dump('Local#ensureRecurrencesExpanded start\n');
      this.events.eventsForCalendar(LOCAL_CALENDAR_ID, function(err, events) {
        if (err) {
          return callback(err);
        }

        var count = events.length;
        if (count === 0) {
          return callback(null, false);
        }

        var self = this;
        var requiredExpansion = false;
        events.forEach(function(event) {
          this._expandEvent(event, maxDate, function(err, expansion) {
            requiredExpansion = requiredExpansion || expansion;
            return --count === 0 && callback(null, requiredExpansion);
          });
        }.bind(this));
      }.bind(this));
    },

    /**
     * @param {Event} event some event to expand.
     * @param {Function} callback [err, expansion].
     * @private
     */
    _expandEvent: function(event, maxDate, callback) {
      dump('Local#_expandEvent ' + JSON.stringify(event) + '\n');
      var remote = event.remote;
      if (!('recurrences' in remote) || remote.recurrences === 'never') {
        return callback(null, false);
      }

      if (!(event.expandedTo instanceof Date)) {
        event.expandedTo = remote.startDate;
      }

      var start = event.expandedTo,
          duration = remote.endDate.getTime() - remote.startDate.getTime(),
          expansion = false;

      // Iterate from the last expansion up to max date making busytimes.
      while (true) {
        var busytime = this._nextBusytime(
          event, start, duration, event.remote.recurrences
        );

        if (busytime.end > maxDate) {
          break;
        }

        var store = this.busytimes;
        var trans = store.db.transaction('busytimes', 'readwrite');
        store.persist(busytime, trans, function(err, id, model) {
          var controller = Calendar.App.timeController;
          controller.cacheBusytime(store.initRecord(busytime));
        });

        expansion = true;
        start = busytime.start;
      }

      // Save event.expandedTo for next expansion.
      remote.expandedTo = start;
      event.remote = remote;
      this.updateEvent(event, function(err) {
        return callback(err, expansion);
      });
    },

    /**
     * Given some recurrence rule, find the busytime that follows a certain
     * occurrence.
     *
     * @param {Event} event busytime event.
     * @param {Date} prevStart when the previous occurrence started.
     * @param {number} duration time difference between event start and end.
     * @param {string} rule recurrence rule.
     * @private
     */
    _nextBusytime: function(event, prevStart, duration, rule) {
      if (!event) {
        throw new Error('Cannot compute next busytime without event');
      }
      if (!prevStart) {
        throw new Error('Cannot compute next busytime without previous');
      }

      var startDate = moment(prevStart);
      switch (rule) {
        case 'everyDay':
          startDate.add('days', 1);
          break;
        case 'everyWeek':
          startDate.add('days', 7);
          break;
        case 'everyOtherWeek':
          startDate.add('days', 14);
          break;
        case 'everyMonth':
          startDate.add('months', 1);
          break;
        case 'everyYear':
          startDate.add('years', 1);
          break;
      }
      startDate = startDate.toDate();

      var endDate = new Date();
      endDate.setDate(startDate.getDate());
      endDate.setTime(startDate.getTime() + duration);
      return {
        _id: event._id + '-' + uuid.v4(),
        eventId: event._id,
        calendarId: LOCAL_CALENDAR_ID,
        start: startDate,
        end: endDate
      };
    },

    /**
     * @return {Calendar.EventMutations.Create} mutation object.
     */
    createEvent: function(event, callback) {
      // most providers come with their own built in
      // id system when creating a local event we need to generate
      // our own UUID.
      if (!event.remote.id) {
        // TOOD: uuid is provided by ext/uuid.js
        //       if/when platform supports a safe
        //       random number generator (values never conflict)
        //       we can use that instead of uuid.js
        event.remote.id = uuid();
      }

      var create = new Calendar.EventMutations.create({
        event: event
      });

      create.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, create.busytime, create.event);
      });

      return create;
    },

    deleteEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      this.app.store('Event').remove(event._id, callback);
    },

    /**
     * @return {Calendar.EventMutations.Update} mutation object.
     */
    updateEvent: function(event, busytime, callback) {
      if (typeof(busytime) === 'function') {
        callback = busytime;
        busytime = null;
      }

      var update = Calendar.EventMutations.update({
        event: event
      });

      update.commit(function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, update.busytime, update.event);
      });

      return update;
    }

  };

  return Local;

}());
