'use strict';
var GeckoObject = require(__dirname + '/geckoobject');


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function App(client) {
  GeckoObject.apply(this, arguments);
  this._client = client;
}
module.exports = App;


App.prototype = {
  __proto__: GeckoObject.prototype,


  /**
   * @type {Marionette.Client}
   * @private
   */
  _client: undefined,


  /**
   * The origin of the site that triggered the installation of the app.
   * @type {string}
   */
  installOrigin: undefined,


  /**
   * The time that the app was installed.
   * This is generated using Date().getTime(),
   * represented as the number of milliseconds
   * since midnight of January 1st, 1970.
   * @type {number}
   */
  installTime: undefined,


  /**
   * The currently stored instance of the manifest of the app.
   * @type {Object}
   */
  manifest: undefined,


  /**
   * Where the manifest was found.
   * @type {string}
   */
  manifestURL: undefined,


  /**
   * The origin of the app (protocol, host, and optional port number).
   * For example: http://example.com.
   * @type {string}
   */
  origin: undefined,


  /**
   * An object containing an array of one or more receipts.
   * Each receipt is a string. If there are no receipts, this is null.
   * @type {Object}
   */
  receipts: undefined,


  checkForUpdate: function() {
    throw 'Not yet implemented';
  },


  /**
   * Launches the application. Does not return any value.
   *
   * @param {String} entrypoint for app.
   */
  launch: function(entrypoint) {
    var client = this._client.scope({ context: 'content' });
    client.executeAsyncScript(function(id, entrypoint) {
      var ObjectCache = window.wrappedJSObject.ObjectCache;
      var app = ObjectCache._inst.get(id);
      app.launch(entrypoint || null);
      marionetteScriptFinished();
    }, [this._id, entrypoint], function(err) {
      if (err) {
        throw err;
      }
    });
  }
};
