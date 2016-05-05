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

const DEPTH = __dirname + '/../../../';
const PROFILE_DIR = 'profile-test/';
const APPS_DIR = 'apps/';
const FULL_APPS_DIR_PATH = DEPTH + PROFILE_DIR + APPS_DIR;

const BASE_URL = 'chrome://gaia/content/';

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

    var client = this._client.scope({ context: 'content' });
    var format = this._formatApp.bind(this, client);

    var apps = [];
    try {
      var dirs = fs.readdirSync(FULL_APPS_DIR_PATH);
      dirs.forEach(function(dir) {
        var stats = fs.statSync(FULL_APPS_DIR_PATH + dir);
        if (stats.isDirectory()) {
          var manifestFile = FULL_APPS_DIR_PATH + dir + '/' + 'manifest.webapp';
          try {
            var manifestStats = fs.statSync(manifestFile);
            if (manifestStats && manifestStats.isFile(manifestFile)) {
              var contents = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
              var app = {
                manifest: contents,
                manifestURL: BASE_URL + dir + '/' + 'manifest.webapp',
                origin: BASE_URL + dir
              };
              apps.push(format(app));
            }
          }
          catch(e) {
            // Don't care about errors here.
          }
        }
      });

      return callback(null, apps);
    }
    catch(err) {
      return callback(new Error(err));
    }
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
  }
};
