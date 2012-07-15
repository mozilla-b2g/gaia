(function(window) {

  /**
   * Abstract remote calendar object.
   * intended to be the general purpose API
   * for the test of Calendar app to interact with.
   *
   * @param {Object} provider some kind of provider.
   * @param {Object} options sets values defined by proto.
   */
  function Cal(provider, options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.provider = provider;
  }

  Cal.prototype = {

    /**
     * Error codes for eventual i10n.
     */
    codes: {
      200: 'ok',
      404: 'not_found',
      500: 'server_error'
    },

    /* Calendar capabilities */

    /**
     * Can this calendar sync with
     * the remote?
     */
    remoteSync: false,

    /**
     * Can this calendar read the remote?
     */
    remoteRead: false,

    /**
     * Can this calendar write to the remote?
     */
    remoteWrite: false,

    /**
     * Can this calendar write to local?
     */
    localWrite: true,

    id: '',
    url: '',
    name: '',
    color: '',
    description: '',
    syncToken: '',
    updatedAt: '',
    createdAt: '',
    _calendarType: 'Abstract',

    get calendarType() {
      return this._calendarType;
    },

    toJSON: function() {
      return {
        id: this.id,
        url: this.url,
        name: this.name,
        color: this.color,
        description: this.description,
        syncToken: this.syncToken,
        updatedAt: this.updatedAt,
        createdAt: this.createdAt,
        calendarType: this.calendarType
      };
    },

    /**
     * Returns a localized error.
     *
     * @param {Numeric} error code see .codes.
     * @param {String} message additional message (not localized).
     */
    localizeError: function(error, message) {
      //XXX: Actually localize.
      var localized = this.codes[error] || error;

      //TODO?: might make sense to have a subclass
      //       of provider errors.
      return new Error(localized + ' (' + message + ')');
    },

    /**
     * Reload the details of the calendar.
     * *WARN* this will mutate the calendar
     * directly when successful you should
     * *never* write to calendar objects directly.
     *
     * @param {Function} callback node style.
     */
    refresh: function(callback) {},

    /**
     * Finds all events in this calendar.
     */
    findEvents: function() {},

    /**
     * Adds a group of events to the remote
     * calendar.
     */
    addEvents: function() {},

    /**
     * Removes a group of events in the calendar
     * by their UUID.
     */
    removeEvents: function() {}

  };

  Calendar.ns('Provider.Calendar').Abstract = Cal;

}(this));

