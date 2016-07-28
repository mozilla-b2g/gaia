define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('geolocation');

/**
 * Exports
 */

module.exports = GeoLocation;

/**
 * Interface to the
 * geolocation API.
 *
 * @constructor
 */
function GeoLocation() {
  this.watcher = null;
  this.position = null;
  this.setPosition = this.setPosition.bind(this);
  this.watch = this.watch.bind(this);
}

/**
 * Watches device location.
 *
 * @public
 */
GeoLocation.prototype.watch = function() {
  if (!this.watcher) {
    this.watcher = navigator.geolocation.watchPosition(this.setPosition);
    debug('started watching');
  }
};

/**
 * Stops watching
 * device location.
 *
 * @public
 */
GeoLocation.prototype.stopWatching = function() {
  navigator.geolocation.clearWatch(this.watcher);
  this.watcher = null;
  debug('stopped watching');
};

/**
 * Updates the stored
 * position object.
 *
 * @private
 */
GeoLocation.prototype.setPosition = function(position) {
  this.position = {
    timestamp: position.timestamp,
    altitude: position.coords.altitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
};

});
