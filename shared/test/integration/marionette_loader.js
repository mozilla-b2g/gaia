'use strict';

var MockManager = require('./manager_mock.js');

var COMMS_APPS = ['dialer', 'contacts'];
/**
 * @param {Marionette.Client} client Marionette client to use.
 * @constructor
 */
function MarionetteLoader(client) {
  this.client = client;
}
module.exports = MarionetteLoader;


/**
 * Make a new helper.
 * @param {Marionette.Client} client Marionette client to use.
 * @param {Object} options Optional map of attributes for Apps.
 * @return {Apps} instance.
 */
MarionetteLoader.setup = function(client, options) {
  return new MarionetteLoader(client);
};


MarionetteLoader.prototype = {
  /**
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * Includes the main entry point for an application.
   * @param {String} app
   * @param {String} region
   * @param {String} [baseFolder=apps] base folder of app.
   */
  getAppClass: function(app, region, baseFolder) {
    region = region || app;
    app = COMMS_APPS.indexOf(app) === -1 ? app : 'communications/' + app;
    baseFolder = baseFolder || 'apps';
    var AppClass = require(
      __dirname + '/../../../' +
      baseFolder + '/' + app + '/test/marionette/lib/' + region);
    return new AppClass(this.client);
  },

  /**
  * Returns an instance of MockManager that will look into the given app and the
  * shared folder.
  * @param {String} app
  */
  getMockManager: function(app) {
    return new MockManager(this.client, app);
  },

  /**
   * Gets the marionette-client Actions class and instantiates it.
   * @param {String} helper.
   */
  getActions: function() {
    var Actions = require('marionette-client').Actions;
    return new Actions(this.client);
  }
};
