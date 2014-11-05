/**
 * WifiWps is a module that can help you manipulate wps related stuffs easily.
 *
 * @module WifiWps
 */
define(function(require) {
  'use strict';

  var WifiContext = require('modules/wifi_context');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();
  var _ = navigator.mozL10n.get;

  var WifiWps = function() {
    var wifiWps = {
      /**
       * A flag to make sure whether we are manipulating wps.
       *
       * @type {Boolean}
       * @default false
       */
      inProgress: false,
      /**
       * An array used to keep registered listeners for statusReset event.
       *
       * @type {Array}
       * @default []
       */
      _statusResetEventListeners: [],
      /**
       * A method to trigger all registered handlers
       *
       * @type {Function}
       */
      statusReset: function() {
        this._statusResetEventListeners.forEach(function(handler) {
          handler();
        });
      },
      /**
       * Put necessary information about wps (ssid, method, pin) to connect
       * to specific wps.
       *
       * @param {Object} options
       */
      connect: function(options) {
        var self = this;
        var req;

        var onSuccess = options.onSuccess || function() {};
        var onError = options.onError || function() {};
        var bssid = WifiContext.wpsOptions.selectedAp;
        var method = WifiContext.wpsOptions.selectedMethod;
        var pin = WifiContext.wpsOptions.pin;

        if (method === 'pbc') {
          req = wifiManager.wps({
            method: 'pbc'
          });
        } else if (method === 'myPin') {
          req = wifiManager.wps({
            method: 'pin',
            bssid: bssid
          });
        } else {
          req = wifiManager.wps({
            method: 'pin',
            bssid: bssid,
            pin: pin
          });
        }

        req.onsuccess = function() {
          if (method === 'myPin') {
            alert(_('wpsPinInput', { pin: req.result }));
          }
          self.inProgress = true;
          onSuccess();
        };

        req.onerror = function() {
          onError(req.error);
        };
      },
      /**
       * Cancel current wps operation and will call your onSuccess / onError
       * callback when operation is done.
       *
       * @memberOf WifiWps
       * @param {Object} options
       */
      cancel: function(options) {
        var self = this;
        var onError = options.onError || function() {};
        var onSuccess = options.onSuccess || function() {};

        var req = wifiManager.wps({
          method: 'cancel'
        });

        req.onsuccess = function() {
          self.inProgress = false;
          self.statusReset();
          onSuccess();
        };

        req.onerror = function() {
          onError(req.error);
        };
      },
      /**
       * You can add your listeners when `statusreset` event is triggered.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      addEventListener: function(eventName, callback) {
        if (eventName === 'statusreset') {
          this._statusResetEventListeners.push(callback);
        }
      },
      /**
       * Remove catched listener about `statusreset` event.
       *
       * @memberOf WifiWps
       * @param {String} eventName
       * @param {Function} callback
       */
      removeEventListener: function(eventName, callback) {
        if (eventName === 'statusreset') {
          var index = this._statusResetEventListeners.indexOf(callback);
          if (index >= 0) {
            this._statusResetEventListeners.splice(index, 1);
          }
        }
      }
    };
    return wifiWps;
  };

  return WifiWps;
});
