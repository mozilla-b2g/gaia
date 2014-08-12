/* exported MockGeolocation */

'use strict';

var MockGeolocation = {
  mSetup: function() {
    this.fakeCoords = {
      latitude: 37.388590,
      longitude: -122.061704,
      accuracy: 5.0
    };

    this.fakePosition = {
      timestamp: 1404756850457,
      coords: this.fakeCoords
    };

    this.activeWatches = [];

    this.realGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = (function(onsuccess, onerror) {
      if (onsuccess) {
        onsuccess(this.fakePosition);
      }
    }).bind(this);

    this.realWatchPosition = navigator.geolocation.watchPosition;
    navigator.geolocation.watchPosition = (function(onsuccess, onerror) {
      var watch = setInterval(function() {
        if (onsuccess) {
          onsuccess(this.fakePosition);
        }
      }.bind(this));

      this.activeWatches.push(watch);
      return watch;
    }).bind(this);

    this.realClearWatch = navigator.geolocation.clearWatch;
    navigator.geolocation.clearWatch = (function(watch) {
      var idx = this.activeWatches.indexOf(watch);

      if (idx >= 0) {
        this.activeWatches.splice(idx, 1);
        clearInterval(watch);
      }
    }).bind(this);
  },

  mTeardown: function() {
    for (var i = 0; i < this.activeWatches.length; i++) {
      clearInterval(this.activeWatches[i]);
    }

    this.activeWatches = [];
    navigator.geolocation.getCurrentPosition = this.realGetCurrentPosition;
    navigator.geolocation.watchPosition = this.realWatchPosition;
    navigator.geolocation.clearWatch = this.realClearWatch;
  }
};
