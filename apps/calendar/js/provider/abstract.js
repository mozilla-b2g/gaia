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
     * Can create events for this provider?
     */
    canCreateEvent: false,

    /**
     * Can edit events for this provider?
     */
    canUpdateEvent: false,

    /**
     * Can delete events from this provider?
     */
    canDeleteEvent: false,

    /**
     * Attempt to get account accepts
     * a single object and callback.
     * Required options vary based on
     * .useCredentials / .useUrl
     *
     * account:
     *  - url: (String)
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
     * Returns the capabilities of a single event.
     */
    eventCapabilities: function() {
      return {
        canUpdate: this.canUpdateEvent,
        canCreate: this.canUpdateEvent,
        canDelete: this.canUpdateEvent
      };
    }

  };

  return Abstract;

}());
