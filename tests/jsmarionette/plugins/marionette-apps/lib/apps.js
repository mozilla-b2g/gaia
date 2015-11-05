'use strict';
var BootWatcher = require('./bootwatcher');
var Mgmt = require('./mgmt');


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Apps(client) {
  this.mgmt = new Mgmt(client);
  this._client = client;
}
module.exports = Apps;


/**
 * Make a new apps and register a client hook to startSession that triggers
 *     the BootWatcher.
 * @param {Marionette.Client} client Marionette client to use.
 * @param {Object} options Optional map of attributes for Apps.
 * @return {Apps} instance.
 */
Apps.setup = function(client, options) {
  var apps = new Apps(client);

  client.addHook('startSession', function(done) {
    BootWatcher.setup(client, function(err) {
      if (err) return done && done(err);
      apps.mgmt.prepareClient(done);
    });
  });

  return apps;
};


Apps.prototype = {
  /**
   * A mgmt object that exposes functions that let dashboards
   * manage and launch apps on a user's behalf.
   * @type {Mgmt}
   */
  mgmt: undefined,


  /**
   * @type {Marionette.Client}
   * @private
   */
  _client: undefined,


  /**
   * Returns information about the current app, which means
   * an installed app whose domain matches the domain of the calling app.
   * Note: Multiple apps per origin are not supported.
   * To host several apps from one domain, set up a subdomain for each app;
   * for example: myapp.mydomain.com, otherapp.mydomain.com, and so forth.
   * @return {DOMRequest} Request that supports onsuccess, onerror callbacks.
   */
  getSelf: function(callback) {
    return this.mgmt.getSelf(callback);
  },


  /**
   * Get a list of all installed apps from this origin.
   * For example, if you call this on the Firefox Marketplace,
   * you will get the list of apps installed by the Firefox Marketplace.
   * @return {DOMRequest} Request that supports onsuccess, onerror callbacks.
   */
  getInstalled: function() {
    throw 'Not yet implemented';
  },


  /**
   * Triggers the installation of an app. During the installation process,
   * the app is validated and the user is prompted to approve the installation.
   * If the app has previously been installed from the same domain,
   * calling install() again may silently overwrite the existing install data.
   * This can be used to modify the purchase receipt, for example,
   * when a user upgrades from a free app to a premium app.
   * @param {string} url A string URL containing the location of the manifest
   *     to be installed. In the case of self distribution
   *     (where the installing origin is the same as the app origin),
   *      the installing site may omit the origin part of the URL
   *      and provide an absolute path (beginning with /).
   * @param {Object} receipts (Optional) A JSON object containing an array
   *      of one or more receipts.
   * @return {DOMRequest} Request that supports onsuccess, onerror callbacks.
   */
  install: function(url, receipts) {
    throw 'Not yet implemented';
  }
};
