'use strict';

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
   */
  getAppClass: function(app, region) {
    region = region || app;
    var AppClass = require(
      __dirname + '/../../../apps/' + app + '/test/marionette/lib/' + region);
    return new AppClass(this.client);
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

