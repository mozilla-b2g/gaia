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
     * Opens an event stream expected
     * to return a responder that
     * will emit to "data" and "error"
     * events.
     *
     * account: (same as getAccount)
     * calendar:
     *  - url: (String) Url/URI based on .useUrl
     *  - syncToken: (String)
     *  - ...: additional options based on provider
     *
     * @param {Object} account user credentials.
     * @param {Object} calendar calendar location and last sync state.
     * @param {Function} callback node style (err, result).
     */
    streamEvents: function(account, calendar, callback) {}
  };

  return Abstract;

}());
