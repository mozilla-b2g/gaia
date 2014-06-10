'use strict';
/* global Promise */

(function(eme) {

  var geolocation = navigator.geolocation;
  var mozSettings = navigator.mozSettings;
  var mozMobileConnections = navigator.mozMobileConnections;

  // geolocation
  var position = null;
  var positionPromise = null;

  const positionTTL = 10 * 60 * 1000;
  const geoOptions = {
    timeout: 4000,
    maximumAge: positionTTL
  };


  // returns a promise always resolved with current position or null
  // caller should check the resolved value
  function updatePosition() {
    if (positionPromise) {
      return positionPromise;
    }

    positionPromise = new Promise(function ready(resolve) {
      // TODO
      // it looks like getCurrentPosition never returns cached position
      // even though we are passing a maximumAge > 0
      // I would assume that on second launch of the collection app there should
      // already be a cached location and that a new position request will not
      // be fired.
      // this does not seem to work on an unagi.
      // for now, we defer the init() until the position request is done.
      geolocation.getCurrentPosition(
        function success(newPosition) {
          positionPromise = null;

          if (newPosition && newPosition.coords) {
            eme.log('new position', newPosition.coords.latitude,
                                    newPosition.coords.longitude,
                                    newPosition.timestamp);

            position = newPosition;
          }
          resolve(position);
        },
        function error(positionError) {
          positionPromise = null;
          eme.log('position error', positionError.code, positionError.message);
          resolve(position);
        },
        geoOptions);
    });

    return positionPromise;
  }

  function Device() {
    // set async. from settings when calling init()
    this.osVersion = null;
    this.deviceId = null;
    this.deviceName = null;

    this.screen = {
      width: window.screen.width * window.devicePixelRatio,
      height: window.screen.height * window.devicePixelRatio
    };
  }

  Device.prototype = {
    init: function init() {
      return Promise.all([this.readSettings(), updatePosition()]);
    },

    readSettings: function readSettings() {
      return new Promise(function ready(resolve, reject) {
        var lock = mozSettings.createLock();
        var request = lock.get('*');

        request.onsuccess = function onsuccess() {
          var settings = request.result;
          var deviceId = settings['search.deviceId'];

          if (!deviceId) {
            deviceId = this.generateDeviceId();
            mozSettings.createLock().set({
              'search.deviceId': deviceId
            });
          }

          this.deviceId = deviceId;
          this.deviceName = settings['deviceinfo.product_model'];
          this.osVersion = settings['deviceinfo.os'];

          resolve();
        }.bind(this);

        request.onerror = function onerror() {
          eme.log('fatal error accessing device settings', request.error);
          reject();
        };
      }.bind(this));
    },

    // see duplicate in homescreen/everything.me.js
    generateDeviceId: function generateDeviceId() {
      var url = window.URL.createObjectURL(new Blob());
      var id = url.replace('blob:', '');

      window.URL.revokeObjectURL(url);

      return 'fxos-' + id;
    },

    get language() {
      return navigator.language;
    },

    get timezone() {
      return (new Date().getTimezoneOffset() / -60).toString();
    },

    get carrier() {
      var network;
      var carrier;
      var connection = mozMobileConnections &&
                       mozMobileConnections.length && mozMobileConnections[0];

      if (connection && connection.voice) {
        network = connection.voice.network;
        carrier = network ? (network.shortName || network.longName) : null;
      }

      return carrier;
    },

    // returns last known position
    get position() {
      if (!position ||
          (Date.now() - position.timestamp > positionTTL)) {

        updatePosition();
      }

      return position;
    }
  };

  eme.device = new Device();

})(window.eme);
