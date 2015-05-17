'use strict';
/**
 * @fileoverview Simple tool to notify listeners when a Firefox OS instance
 *     finishes booting.
 */
var EventEmitter = require('events').EventEmitter;


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function BootWatcher(client) {
  EventEmitter.call(this, arguments);
  this._client = client;
}
module.exports = BootWatcher;


/**
 * Initialize the BootWatcher plugin!
 * @param {Marionette.Client} client Marionette client to use.
 * @param {Object} options Optional map of attributes for MarionetteApps.
 * @param {Function} cb Optional callback function to call after setup.
 * @return {BootWatcher} instance of bootwatcher.
 */
BootWatcher.setup = function(client, options, cb) {
  var bootwatcher = new BootWatcher(client);
  if (arguments.length === 2 && typeof(options) === 'function') {
    cb = options;
    options = undefined;
  }


  // wait until client is booted up
  if (cb) {
    bootwatcher.once(
      BootWatcher.EventType.BOOT, cb.bind(null, null, bootwatcher)
    );
  }

  bootwatcher.start();

  return bootwatcher;
};


/**
 * The maximum amount of time we'll wait for startup.
 * @const {number}
 */
BootWatcher.WAIT_TIME = 50000;


BootWatcher.prototype = {
  __proto__: EventEmitter.prototype,


  /**
   * @type {Marionette.Client}
   * @private
   */
  _client: undefined,


  /**
   * Start watching for when we're booted.
   * Initially we were watching the window for the 'applicationready'
   * event. However, some javascript exceptions in the system app may
   * keep 'applicationready' from being fired, so poll instead. Also,
   * an error may be thrown while we're executing. In that case, retry.
   */
  start: function() {
    var client = this._client.scope({ scriptTimeout: BootWatcher.WAIT_TIME });
    client.waitFor(function() {
      return client.executeScript(function() {
        try {
          var sessionStorage = window.wrappedJSObject.sessionStorage;
          var item = sessionStorage.getItem('webapps-registry-ready');
          return item === 'yes';
        } catch (error) {
          return false;
        }
      }, { timeout: BootWatcher.WAIT_TIME });
    });

    this.emit(BootWatcher.EventType.BOOT);
  }
};


/**
 * @enum {string}
 */
BootWatcher.EventType = {
  BOOT: 'boot'
};
