Calendar.ns('Provider').Abstract = (function() {

  function Abstract(options) {
    var key;
    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Abstract.prototype = {

    defaultColor: '#D2642A',

    /**
     * Does this provider require credentials.
     */
    useCredentials: false,

    /**
     * Does this provider require a url.
     */
    useUrl: false,

    /**
     * Can provider sync with remote server?
     */
    canSync: false,

    /**
     * Can expand recurring events?
     */
    canExpandRecurringEvents: false,

    /**
     *  - domain: (String)
     *  - password: (String)
     *  - user: (String)
     *
     * @param {Object} account user credentials.
     * @param {Function} callback node style (err, result).
     */
    getAccount: function(account, callback) {},

    /**
     * Attempts to find all calendars
     * for a given account.
     *
     *
     * account: (same as getAccount)
     *
     * @param {Object} account user credentials.
     * @param {Function} callback node style (err, result).
     */
    findCalendars: function() {},

    /**
     * Sync remote and local events.
     *
     */
    syncEvents: function(account, calendar, callback) {},

    /**
     * Ensures recurring events are expanded up to the given date.
     *
     * Its very important to correctly return the second callback arg
     * in the subclasses callback. When requiredExpansion is returned as true a
     * second call will likely be made to ensureRecurrencesExpanded to verify
     * there are no more pending events for the date (controller handles this).
     *
     * @param {Date} date to expand recurring events to.
     * @param {Function} callback [err, requiredExpansion].
     *  first argument is error, second indicates if any expansion was done.
     */
    ensureRecurrencesExpanded: function(date, callback) {},

    /**
     * Update an event
     *
     * @param {Object} event record from event store.
     *
     * @param {Object} [busytime] optional busytime instance
     *                 when a busytime is passed the edit is treated
     *                 as an "exception" and will only edit the one recurrence
     *                 related to the busytime. This may result in the creation
     *                 of a new "event" related to the busytime.
     */
    updateEvent: function(event, busytime, callback) {},

    /**
     * Delete event
     *
     * @param {Object} event record from the event store.
     * @param {Object} [busytime] optional busytime instance
     *                 when given it will only remove this occurence/exception
     *                 of the event rather then the entire sequence of events.
     */
    deleteEvent: function(event, busytime, callback) {},

    /**
     * Create an event
     */
    createEvent: function(event, callback) {},

    /**
     * Returns an object with three keys used to
     * determine the capabilities of a given calendar.
     *
     * - canCreate (Boolean)
     * - canUpdate (Boolean)
     * - canDelete (Boolean)
     *
     * @param {Object} calendar full calendar details.
     */
    calendarCapabilities: function(calendar) {
      return {
        canCreateEvent: true,
        canUpdateEvent: true,
        canDeleteEvent: true
      };
    },

    /**
     * Returns the capabilities of a single event.
     *
     * @param {Object} event object.
     * @param {Function} callback [err, caps].
     */
    eventCapabilities: function(event, callback) {
      var caps = this.calendarCapabilities();

      Calendar.nextTick(function() {
        callback(null, {
          canCreate: caps.canCreateEvent,
          canUpdate: caps.canUpdateEvent,
          canDelete: caps.canDeleteEvent
        });
      });
    }

  };

  return Abstract;

}());
