'use strict';
/* global Promise */

(function(eme) {

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

      // Return a successful promise for back-compat.
      return Promise.resolve();
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
    }
  };

  eme.device = new Device();

})(window.eme);
