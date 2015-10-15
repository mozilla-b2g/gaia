'use strict';
var Apps = require('./lib/apps');

/**
 * @constructor
 * @param {Apps} apps private marionette apps api.
 */
function MarionetteApps(apps) {
  for (var key in MarionetteApps.ModuleToFunction) {
    var methodName = MarionetteApps.ModuleToFunction[key];
    var module = require('./lib/' + key);
    // bind the public interface to the object
    this[methodName] = module[methodName].bind(null, apps);
  }
}

/**
 * Map of public modules to expose to the main interface.
 * Key is module, value is function on the module.
 */
MarionetteApps.ModuleToFunction = {
  close: 'close',
  launch: 'launch',
  list: 'list',
  switchtoapp: 'switchToApp',
  getapp: 'getApp',
  getself: 'getSelf'
};


/**
 * Create a new marionette apps plugin.
 * @param {Marionette.Client} client marionette client to use.
 * @param {Objects} options optional configuration.
 * @return {MarionetteApps} new marionette apps.
 */
function setup(client, options) {
  var apps = Apps.setup(client, options);
  return new MarionetteApps(apps);
}

exports.setup = setup;
