(function(window) {
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
    url: '',

    /**
     * username for authentication
     */
    user: '',

    /**
     * password for authentication
     */
    password: '',

    get fullUrl() {
      return this.domain + this.url;
    },

    set fullUrl(value) {
      var protocolIdx = value.indexOf('://');

      this.domain = value;
      this.url = '/';

      if (protocolIdx !== -1) {
        protocolIdx += 3;
        // next chunk
        var domainChunk = value.substr(protocolIdx);
        var pathIdx = domainChunk.indexOf('/');


        if (pathIdx !== -1) {
          pathIdx = pathIdx + protocolIdx;

          this.url = value.substr(pathIdx);
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
        'url',
        'domain',
        'password',
        'user',
        'providerType',
        'preset'
      ];

      fields.forEach(function(key) {
        output[key] = this[key];
      }, this);

      return output;
    }

  };

  Calendar.ns('Models').Account = Account;

}(this));
