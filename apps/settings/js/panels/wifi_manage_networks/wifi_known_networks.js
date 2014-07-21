/**
 * WifiKnownNetworks is a singleton that you can use it to
 * get known network list.
 *
 * @module wifi_manage_networks/wifi_known_networks
 */
define(function(require) {
  'use strict';

  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();

  /**
   * @alias module:wifi_manage_networks/wifi_known_networks
   * @class WifiKnownNetworks
   * @requires module:shared/wifi_helper
   */
  var WifiKnownNetworks = {

    /**
     * We would keep cache known networks list here.
     * @memberof WifiKnownNetworks
     * @type {Object}
     */
    _networks: {},

    /**
     * We will use this flag to make sure whether we are scanning or not.
     * @memberof WifiKnownNetworks
     * @type {Boolean}
     */
    _scanning: false,

    /**
     * We will keep users' callbacks here when we are scanning. And after that,
     * these callbacks will be called with _networks as parameters.
     *
     * @memberof WifiKnownNetworks
     * @type {Array}
     */
    _cachedCallbacks: [],

    /**
     * You can call this to get _networks directly. If we are scanning when you
     * call this method, we will queue your callbacks and they will be called
     * later when scanning is done.
     *
     * @memberof WifiKnownNetworks
     * @param {Function} callback
     */
    get: function(callback) {
      // cache callbacks
      if (this._scanning) {
        this._cachedCallbacks.push(callback);
      } else {
        callback(this._networks);
      }
    },

    /**
     * You can call this method to scan known networks directly and we will
     * return found networks as a parameter to your callback.
     *
     * @memberof WifiKnownNetworks
     * @parameter {Function} callback
     */
    scan: function(callback) {
      var i;
      var req = wifiManager.getKnownNetworks();
      this._scanning = true;

      req.onsuccess = function() {
        // clean them first
        this._networks = {};
        this._scanning = false;

        var allNetworks = req.result;

        for (i = 0; i < allNetworks.length; ++i) {
          var network = allNetworks[i];
          // use ssid + capabilities as a composited key
          var key = network.ssid + '+' +
            WifiHelper.getSecurity(network).join('+');
          this._networks[key] = network;
        }

        var cachedCb;
        while (this._cachedCallbacks.length > 0) {
          cachedCb = this._cachedCallbacks.pop();
          cachedCb(this._networks);
        }

        // we can call an additional callback after scanning
        if (callback) {
          callback(this._networks);
        }
      }.bind(this);

      req.onerror = function(error) {
        this._scanning = false;
        console.warn('Error : ', error);
        console.warn('could not retrieve any known network.');
      }.bind(this);
    }
  };

  // let's try to scan for the first time
  WifiKnownNetworks.scan();

  return WifiKnownNetworks;
});
