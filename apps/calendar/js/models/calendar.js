Calendar.ns('Models').Calendar = (function() {

  function Cal(options) {
    var key;
    if (typeof(options) === 'undefined') {
      options = {};
    }

    this.remote = {};

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }
  }

  Cal.prototype = {

    /**
     * Local copy of calendars remote state.
     * Taken from a calendar providers .toJSON method.
     *
     * @type {Object}
     */
    remote: null,

    /**
     * The date at which this calendar's events
     * where synchronized.
     *
     * @type {Date}
     */
    firstEventSyncDate: null,

    /**
     * Last sync token used in previous
     * event synchronization.
     *
     * @type {String}
     */
    lastEventSyncToken: '',

    /**
     * Last date of event synchronization.
     * This is not going to be used
     * for any kind of serious operation
     * right now this is just for the UI.
     *
     * @type {Date}
     */
    lastEventSyncDate: '',

    /**
     * Indicates if calendar is displayed
     * locally in the ui.
     *
     * @type {Boolean}
     */
    localDisplayed: true,

    /**
     * Id of account this record
     * is associated with.
     */
    accountId: '',

    /**
     * Updates remote with data from a calendar provider.
     *
     * @param {Calendar.Provider.Calendar.Abstract} provider remote.
     */
    updateRemote: function(provider) {
      var data = provider;
      if ('toJSON' in provider) {
          data = provider.toJSON();
      }

      this.remote = data;
    },

    /**
     * Checks if local and remote state differ
     * via sync tokens. Returns true when
     * local sync token and remote do not match.
     * Does not account for local changes only
     * when the server state has changed
     * and we have not yet synchronized.
     *
     * @return {Boolean} true when sync needed.
     */
    eventSyncNeeded: function() {
      var local = this.lastEventSyncToken;
      var remote = this.remote.syncToken;

      return local != remote;
    },

    get name() {
      return this.remote.name;
    },

    get color() {
      var color = this.remote.color;
      if (color) {
        if (color.substr(0, 1) === '#') {
          return color.substr(0, 7);
        }
      }
      return this.remote.color;
    },

    get description() {
      return this.remote.description;
    },

    toJSON: function() {
      var result = {
        error: this.error,
        remote: this.remote,
        accountId: this.accountId,
        localDisplayed: this.localDisplayed,
        lastEventSyncDate: this.lastEventSyncDate,
        lastEventSyncToken: this.lastEventSyncToken,
        firstEventSyncDate: this.firstEventSyncDate
      };

      if (this._id || this._id === 0) {
        result._id = this._id;
      }

      return result;
    }

  };

  return Cal;

}(this));
