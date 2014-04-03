/* exported MockGeolocation */

'use strict';

var MockGeolocation = {
  mSetup: function() {
    this.latitude = 37.388590;
    this.longitude = -122.061704;
    this.activeWatches = [];

    var self = this;
    this.realWatchPosition = navigator.geolocation.watchPosition;
    navigator.geolocation.watchPosition = function(onsuccess, onerror) {
      var watch = setInterval(function() {
        if (onsuccess) {
          onsuccess({
            coords: {
              latitude: self.latitude,
              longitude: self.longitude
            }
          });
        }
      });

      self.activeWatches.push(watch);
      return watch;
    };

    this.realClearWatch = navigator.geolocation.clearWatch;
    navigator.geolocation.clearWatch = function(watch) {
      var idx = self.activeWatches.indexOf(watch);

      if (idx >= 0) {
        self.activeWatches.splice(idx, 1);
        clearInterval(watch);
      }
    };
  },

  mTeardown: function() {
    for (var i = 0; i < this.activeWatches.length; i++) {
      clearInterval(this.activeWatches[i]);
    }

    this.activeWatches = [];
    navigator.geolocation.watchPosition = this.realWatchPosition;
    navigator.geolocation.clearWatch = this.realClearWatch;
  }
};
