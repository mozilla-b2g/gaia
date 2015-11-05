'use strict';
var App = require(__dirname + '/app'),
    fs = require('fs');

/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Mgmt(client) {
  this._client = client;
}
module.exports = Mgmt;


Mgmt.prototype = {
  /**
   * @type {Marionette.Client}
   * @private
   */
  _client: undefined,

  _formatApp: function(client, data) {
    var app = new App(client);
    for (var key in data) {
      app[key] = data[key];
    }
    return app;
  },

  /**
   * List all installed apps in the user's repository.
   *
   * @param {Function} callback [Error, Array<App>].
   */
  getAll: function(callback) {
    callback = callback || this._client.defaultCallback;

    var script = fs.readFileSync(
      __dirname + '/scripts/getallapps.js',
      'utf8'
    );

    var client = this._client.scope({ context: 'content' });
    var format = this._formatApp.bind(this, client);

    return client.executeAsyncScript(script, function(err, operation) {
      // handle scripting error
      if (err) {
        return callback(err);
      }

      // handle error from operation
      if (operation.error) {
        return callback(new Error(operation.error));
      }

      // success format the apps
      var apps = operation.result.map(format);
      return callback(null, apps);
    });
  },

  /**
   * Returns information about the calling app, if any.
   * @param {Function} callback [Error, Array<App>].
   */
  getSelf: function(callback) {
    callback = callback || this._client.defaultCallback;

    var script = fs.readFileSync(
      __dirname + '/scripts/getself.js',
      'utf8'
    );

    var client = this._client.scope({ context: 'content' });
    var format = this._formatApp.bind(this, client);

    return client.executeAsyncScript(script, function(err, operation) {
      // handle scripting error
      if (err) {
        return callback(err);
      }

      // handle error from operation
      if (operation.error) {
        return callback(new Error(operation.error));
      }

      // success format the app
      return callback(null, operation.result ? format(operation.result) : null);
    });
  },


  /**
   * Inject utility functions into gecko through the marionette client.
   * @param {Function} cb Optional callback function.
   */
  prepareClient: function(cb) {
    var script = fs.readFileSync(
      __dirname + '/scripts/objectcache.js',
      'utf8'
    );

    this._client.importScript(script, cb);
  }
};
