Calendar.ns('Models').Account = (function() {

  function Account(options) {
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

  Account.prototype = {

    /**
     * Type of provider this
     * account requires.
     */
    providerType: null,

    /**
     * ID for this model always set
     * by the store when hydrating
     */
    id: null,

    /**
     * Which preset this model came from.
     */
    preset: null,

    /**
     * Domain for account
     */
    domain: '',

    /**
     * url/path for account
     */
    entrypoint: '',

    /**
     * Location where calendars can be found.
     * May be the same as entrypoint.
     */
    calendarHome: '',

    /**
     * username for authentication
     */
    user: '',

    /**
     * password for authentication
     */
    password: '',

    get fullUrl() {
      return this.domain + this.entrypoint;
    },

    set fullUrl(value) {
      var protocolIdx = value.indexOf('://');

      this.domain = value;
      this.entrypoint = '/';

      if (protocolIdx !== -1) {
        protocolIdx += 3;
        // next chunk
        var domainChunk = value.substr(protocolIdx);
        var pathIdx = domainChunk.indexOf('/');


        if (pathIdx !== -1) {
          pathIdx = pathIdx + protocolIdx;

          this.entrypoint = value.substr(pathIdx);
          this.domain = value.substr(0, pathIdx);
        }

      }
    },

    /**
     * Data only version of this object.
     * Used for both passing data between
     * threads (workers) and persisting data
     * in indexeddb.
     */
    toJSON: function() {
      var output = {};
      var fields = [
        'entrypoint',
        'calendarHome',
        'domain',
        'password',
        'user',
        'providerType',
        'preset',
        'oauth',
        'error'
      ];

      fields.forEach(function(key) {
        output[key] = this[key];
      }, this);

      if (this._id || this._id === 0) {
        output._id = this._id;
      }

      return output;
    }

  };


  return Account;

}(this));
