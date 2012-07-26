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

    if (this.providerType) {
      this._updateProvider();
    }
  }

  Account.prototype = {

    providerType: null,

    /**
     * Provider object
     */
    _provider: null,

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

    get provider() {
      if (!this._provider) {
        this._updateProvider();
      }

      return this._provider;
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

    _updateProvider: function() {
      var provider = this._provider;
      var type = this.providerType;

      if (!provider) {
        this._provider = provider = new Calendar.Provider[type]();
      }

      if (provider.useUrl) {
        provider.url = this.url;
        provider.domain = this.domain;
      }

      if (provider.useCredentials) {
        provider.user = this.user;
        provider.password = this.password;
      }
    },

    /**
     * Connects to server with new credentials
     * this operation will possibly update
     *
     * @param {Function} callback node style callback.
     */
    refresh: function(callback) {
      var self = this;

      self._updateProvider();

      this.provider.setupConnection(function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        if ('url' in data) {
          self.url = data.url;
        }

        if ('domain' in data) {
          self.domain = data.domain;
        }

        // update provider
        self._updateProvider();

        callback(null, self);
      });
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
