(function(window) {

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

    if (this.provider && !options.hasOwnProperty('remote')) {
      this.updateRemote(this.provider);
      delete this.provider;
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
     * Last sync token used in previous
     * event synchronization.
     *
     * @type {String}
     */
    lastEventSyncToken: null,

    /**
     * Last date of event synchronization.
     *
     * @type {Date}
     */
    lastEventSyncDate: null,

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
    accountId: null,

    /**
     * Updates remote with data from a calendar provider.
     *
     * @param {Calendar.Provider.Calendar.Abstract} provider remote.
     */
    updateRemote: function(provider) {
      this.remote = provider.toJSON();
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
      return this.remote.color;
    },

    get description() {
      return this.remote.description;
    },

    toJSON: function() {
      return {
        remote: this.remote,
        localDisplayed: this.localDisplayed,
        lastEventSyncDate: this.lastEventSyncDate,
        lastEventSyncToken: this.lastEventSyncToken
      };
    }

  };

  Calendar.ns('Models').Calendar = Cal;

}(this));
