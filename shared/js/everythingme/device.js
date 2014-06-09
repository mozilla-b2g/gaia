'use strict';
/* global Promise */
/* global MobileOperator */

(function(eme) {

  var geolocation = navigator.geolocation;
  var mozSettings = navigator.mozSettings;
  var mozMobileConnections = navigator.mozMobileConnections;

  // geolocation
  var lastPosition = null;
  var positionPromise = null;

  const positionTTL = 10 * 60 * 1000;
  const geoOptions = {
    timeout: 4000,
    maximumAge: positionTTL
  };


  function updatePosition() {
    if (positionPromise) {
      return positionPromise;
    }

    // always resolves
    // caller should check the resolved value is not null
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
        function success(position) {
          positionPromise = null;

          if (position && position.coords) {
            eme.log('new position', position.coords.latitude,
                                    position.coords.longitude,
                                    position.timestamp);

            lastPosition = position;
          }
          resolve(lastPosition);
        },
        function error(positionError) {
          positionPromise = null;
          eme.log('position error', positionError.code, positionError.message);
          resolve(lastPosition);
        },
        geoOptions);
    });

    return positionPromise;
  }

  function getTimezoneOffset() {
    return (new Date().getTimezoneOffset() / -60).toString();
  }

  function getCarrier(mobileConnection) {
    if (MobileOperator && mobileConnection) {
      var info = MobileOperator.userFacingInfo(mobileConnection);
      return info.operator || null;
    }

    return null;
  }

  function Device() {
    // device info
    // set async. when calling init()
    this.lc = null;
    this.tz = null;
    this.osVersion = null;
    this.deviceId = null;
    this.deviceType = null;
    this.carrierName = null;
    this.screen = {
      width: window.screen.width * window.devicePixelRatio,
      height: window.screen.height * window.devicePixelRatio
    };

    // observe info that may change
    mozSettings.addObserver('language.current', function setLocale(e) {
      var current = this.lc;
      this.lc = e.settingValue || navigator.language || '';
      eme.log('lc changed', current, '->', this.lc);
    }.bind(this));

    mozSettings.addObserver('time.timezone', function setTimezone(e) {
      var current = this.tz;
      this.tz = getTimezoneOffset();
      eme.log('tz changed', current, '->', this.tz);
    }.bind(this));
  }

  Device.prototype = {
    init: function init() {
      return Promise.all([this.updateDeviceInfo(), updatePosition()]);
    },

    updateDeviceInfo: function updateDeviceInfo() {
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

          this.lc = settings['language.current'];
          this.tz = getTimezoneOffset();
          this.osVersion = settings['deviceinfo.os'];
          this.deviceId = deviceId;
          this.deviceType = settings['deviceinfo.product_model'];
          this.carrierName = getCarrier(this.mobileConnection);

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

    get mobileConnection() {
      if (mozMobileConnections && mozMobileConnections.length) {
        return mozMobileConnections[0];
      }

      return null;
    },

    // returns last known position
    get position() {
      if (!lastPosition ||
          (Date.now() - lastPosition.timestamp > positionTTL)) {

        updatePosition();
      }

      return lastPosition;
    }
  };

  eme.device = new Device();

})(window.eme);
