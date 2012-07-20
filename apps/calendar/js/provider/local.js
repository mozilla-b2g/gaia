(function(window) {
  // this should never change
  const LOCAL_CALENDAR_ID = 'local-first';

  function Local(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Local.prototype = {
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
     * You may only use one of these providers.
     */
    singleUse: true,

    /**
     * Verify credentials with backend service.
     */
    setupConnection: function(callback) {
      var self = this;
      //XXX: Make async
      self._connection = true;
      callback(null, {});
    },

    /**
     * Check if connection has been resolved
     * recently.
     */
    isConnected: function() {
      return !!this._connection;
    },

    /**
     * Attempts to find calendars for
     * provider.
     *
     * @param {Function} callback node style callback
     *                            where second argument
     *                            returns an array of
     *                            Calendar.Provider.CalendarModel(s).
     */
    findCalendars: function(callback) {
      //XXX: Make async
      var l10nId = 'calendar-local';
      var list = {};
      var name;
      var calendarClass = Calendar.Provider.Calendar.Local;

      if ('mozL10n' in window.navigator) {
        name = window.navigator.mozL10n.get(l10nId);
        if (name === l10nId) {
          name = null;
        }
      }

      if (!name) {
        name = 'Offline Calendar';
      }

      var cal = new calendarClass(this, {
        // XXX localize this name somewhere
        name: name,
        id: LOCAL_CALENDAR_ID
      });

      list[LOCAL_CALENDAR_ID] = cal;
      callback(null, list);
    }

  };

  Calendar.ns('Provider').Local = Local;

}(this));
