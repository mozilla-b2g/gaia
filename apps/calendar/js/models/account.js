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

    this._setupProvider();
  }

  Account.prototype = {

    providerType: null,
    provider: null,

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
    passsword: '',

    get fullUrl() {
      return this.domain + this.url;
    },

    set fullUrl(value) {
      var idx = value.indexOf('/');
      if (idx !== -1) {
        this.domain = value.substr(0, idx);
        this.url = value.substr(idx);
      } else {
        this.domain = value;
        this.url = '/';
      }
    },

    _setupProvider: function() {
      var provider = this.provider;
      var type = this.providerType;

      if (!provider) {
        this.provider = provider = new Calendar.Provider[type]();
      }

      if (provider.useUrl) {
        provider.url = this.url;
        provider.domain = this.domain;
      }

      if (provider.useCredentials) {
        provider.user = this.user;
        provider.passsword = this.passsword;
      }
    },

    /**
     * Connects to server with new credentials
     * this operation will possibly update
     *
     * @param {Function} callback node style callback.
     */
    setup: function(callback) {
      var self = this;

      if (!this.provider) {
        self._setupProvider();
      }

      this.provider.setupConnection(function(err, data) {
        if (err) {
          return callback(err);
        }

        if ('url' in data) {
          self.url = data.url;
        }

        if ('domain' in data) {
          self.domain = data.domain;
        }

        // update provider
        self._setupProvider();

        callback(null, self);
      });
    },

    connect: function() {
      this._setupProvider();
    },

    /**
     * Data only version of this object.
     * Used for both passing data between
     * threads (workers) and persisting data
     * in indexeddb.
     */
    toJSON: function() {
      var output = Object.create(null);
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
