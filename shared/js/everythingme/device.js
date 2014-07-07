'use strict';
/* global Promise */

(function(eme) {

  const geolocation = navigator.geolocation;
  const mozSettings = navigator.mozSettings;
  const mozWifiManager = navigator.mozWifiManager;
  const mozMobileConnections = navigator.mozMobileConnections;

  const dataConnectionNames = {
    'hspa+': 'H+',
    'lte': '4G', 'ehrpd': '4G',
    'hsdpa': '3G', 'hsupa': '3G', 'hspa': '3G', 'evdo0': '3G', 'evdoa': '3G',
    'evdob': '3G', '1xrtt': '3G', 'umts': '3G',
    'edge': '2G', 'is95a': '2G', 'is95b': '2G', 'gprs': '2G'
  };

  // geolocation
  var position = null;
  var positionPromise = null;

  const positionTTL = 10 * 60 * 1000;
  const geoOptions = {
    timeout: 4000,
    maximumAge: positionTTL
  };

  /**
   * Caches geolocation information for use during the next API call.
   */
  function cacheGeolocation() {
    // TODO
    // it looks like getCurrentPosition never returns cached position
    // even though we are passing a maximumAge > 0
    // I would assume that on second launch of the collection app there should
    // already be a cached location and that a new position request will not
    // be fired.
    // this does not seem to work on an unagi.
    // for now, we defer the init() until the position request is done.
    geolocation.getCurrentPosition(
      (newPosition) => {
        eme.log('updating geolocation cache', newPosition.coords);
        if (newPosition && newPosition.coords) {
          position = newPosition;
        }
        eme.Cache.add('position', newPosition).then(() => {});
      },
      (error) => {
        eme.log('geolocation error', error.code, error.message);
      },
      geoOptions);
  }

  // returns a promise always resolved with current position or null
  // caller should check the resolved value
  function updatePosition() {
    if (positionPromise) {
      return positionPromise;
    }

    positionPromise = new Promise(function ready(resolve) {

      // Get or set geolocation from the cache.
      eme.Cache.get('position').then(
        (newPosition) => {
          eme.log('got geolocation cache', newPosition.coords);
          positionPromise = null;
          if (newPosition && newPosition.coords) {
            position = newPosition;
          }
          setTimeout(cacheGeolocation);
          resolve(position);
        },

        // If we do not have a position, we resolve the geolocation promise
        // anyway, and request geolocation to store for the next request.
        () => {
          positionPromise = null;
          setTimeout(cacheGeolocation);
          resolve(position);
        });
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
    init: function init(settings) {
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

      return updatePosition().then(function log() {
        eme.log('device init', JSON.stringify(this));
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

    // mobile connection
    get connection() {
      if (!this._connection) {
        this._connection = mozMobileConnections &&
            mozMobileConnections.length && mozMobileConnections[0];
      }
      return this._connection;
    },

    // voice network
    get voiceNet() {
      return (this.connection && this.connection.voice) ?
              this.connection.voice.network : null;
    },

    // data connection type
    get dataConnectionType() {
      if (mozWifiManager && mozWifiManager.enabled) {
        return 'wifi';
      }

      if (this.connection && this.connection.data) {
        var type = this.connection.data.type;
        return dataConnectionNames[type] || type;
      }

      return null;
    },

    get carrier() {
      return this.voiceNet ?
        (this.voiceNet.shortName || this.voiceNet.longName) : null;
    },

    get mcc() {
      return this.voiceNet ? this.voiceNet.mcc : null;
    },

    get mnc() {
      return this.voiceNet ? this.voiceNet.mnc : null;
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
