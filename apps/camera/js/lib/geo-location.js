define(function(require, exports, module) {
'use strict';

/**
 * Locals
 */

var geolocation = navigator.geolocation;

/**
 * Module Dependencies
 */

var bindAll = require('lib/bind-all');
var model = require('vendor/model');

/**
 * Exports
 */

module.exports = GeoLocation;

// Mixin model methods (also events)
model(GeoLocation.prototype);

/**
 * Interface to the
 * geolocation API.
 *
 * @constructor
 */
function GeoLocation() {
  bindAll(this);
  this.watcher = null;
  this.position = null;
  this.setPosition = this.setPosition.bind(this);
  this.watch = this.watch.bind(this);
  this.stopWatching = this.stopWatching.bind(this);
}

/**
 * Watches device location.
 *
 */
GeoLocation.prototype.watch = function() {
  if (!this.watcher) {
    this.watcher = geolocation.watchPosition(this.setPosition);
  }
};

/**
 * Stops watching
 * device location.
 *
 */
GeoLocation.prototype.stopWatching = function() {
  geolocation.clearWatch(this.watcher);
  this.watcher = null;
  this.position = null;
  this.emit('geolocation', this.position);
};

/**
 * Updates the stored
 * position object.
 *
 */
GeoLocation.prototype.setPosition = function(position) {
  this.position = {
    timestamp: position.timestamp,
    altitude: position.coords.altitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
  this.emit('geolocation', this.position);
};

});
