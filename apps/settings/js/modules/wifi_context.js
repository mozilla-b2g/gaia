/**
 * WifiContext is a singleton that you can easily use it to fetch
 * some shared data across different panels
 *
 * @module WifiContext
 */
define(function(require) {
  'use strict';

  // modules / helpers
  var SettingsCache = require('modules/settings_cache');
  var WifiHelper = require('shared/wifi_helper');
  var wifiManager = WifiHelper.getWifiManager();
  var settings = Settings.mozSettings;

  // observed objects
  var _currentNetwork =
    wifiManager && wifiManager.connection && wifiManager.connection.network;

  var _wpsOptions = {
    selectedAp: '',
    selectedMethod: '',
    pin: ''
  };

  var _authOptions = {};

  var WifiContext = {
    /**
     * These listeners would be called when wifi is enabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiEnabledListeners: [],

    /**
     * These listeners would be called when wifi is disabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiDisabledListeners: [],

    /**
     * These listeners would be called when wifi is changed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiStatusChangeListeners: [],

    /**
     * These listeners would be called when
     *   1. localized
     *   2. wifi is enabled
     *   3. wifi is changed
     *   4. wifi is disabled
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiStatusTextChangeListeners: [],

    /**
     * These listeners would be called when
     *   1. wifi connection failed
     *
     * @memberOf WifiContext
     * @type {Array}
     */
    _wifiWrongPasswordListeners: [],

    /**
     * Desc about customized wifi status
     *
     * @memberOf WifiContext
     * @type {String}
     */
    _wifiStatusText: { id: null },

    /**
     * Mac address
     *
     * @memberOf WifiContext
     * @type {String}
     */
    _macAddress: '',

    /**
     * Init is used to initialize some basic stuffs
     *
     * @memberOf WifiContext
     */
    _init: function() {
      if (!wifiManager) {
        return;
      }

      // Set wifi.enabled so that it mirrors the state of the hardware.
      // wifi.enabled is not an ordinary user setting because the system
      // turns it on and off when wifi goes up and down.
      settings.createLock().set({'wifi.enabled': wifiManager.enabled});

      this._bindEvents();

      // we would call _updateWifi() when init
      this._updateWifi();
    },

    /**
     * We will bind some default listeners here
     *
     * @memberOf WifiContext
     */
    _bindEvents: function() {
      var self = this;

      var _updateWifi = this._updateWifi.bind(this);
      var _updateNetworkStatus = this._updateNetworkStatus.bind(this);

      // make sure we would update anything when wifi got changed
      this._wifiEnabledListeners.push(_updateWifi, _updateNetworkStatus);
      this._wifiDisabledListeners.push(_updateWifi);
      this._wifiStatusChangeListeners.push(_updateWifi, _updateNetworkStatus);

      // Now register callbacks to track the state of the wifi hardware
      if (wifiManager) {
        wifiManager.onenabled = function() {
          self._wifiEnabled();
          self._wifiStatusTextChange();
        };

        wifiManager.ondisabled = function() {
          self._wifiDisabled();
          self._wifiStatusTextChange();
        };

        wifiManager.onstatuschange = function(event) {
          self._wifiStatusChange.call(self, event);
          self._wifiStatusTextChange();
        };
      }
    },

    /**
     * We will update mac address, wifiStatus when wifi is updated
     *
     * @memberOf WifiContext
     */
    _updateWifi: function() {
      var self = this;

      if (!wifiManager) {
        return;
      }

      // If the MAC address is in the Settings database, it's already
      // displayed in all `MAC address' fields; if not, it will be set as soon
      // as the Wi-Fi is enabled (see `storeMacAddress').
      if (!this._macAddress && settings) {
        SettingsCache.getSettings(function(results) {
          self._macAddress = results['deviceinfo.mac'];
        });
      }

      if (wifiManager.enabled) {
        this._storeMacAddress();
      }

      // reflect latest value of wifiStatus
      this._updateWifiStatusText();
    },

    /**
     * We will update mac address, wifiStatus when wifi is updated
     *
     * @memberOf WifiContext
     */
    _updateWifiStatusText: function() {
      if (wifiManager.enabled) {
        var networkProp = wifiManager.connection.network ?
          { ssid: wifiManager.connection.network.ssid } : null;
        this._wifiStatusText =
          { id: 'fullStatus-' + wifiManager.connection.status,
            args: networkProp };
      } else {
        this._wifiStatusText =
          { id: 'disabled' };
      }
    },

    /**
     * We need to handle network status when wifi is enabled / wifistatus
     * is changed.
     *
     * _currentNetwork: user activated current network
     * wifiManager.connection.network: system activated current network
     *
     * Main difference between |_currentNetwork| and |wifiManager.connection.
     * network| is that we can't tell if network is known while connecting by
     * |wifiManager.connectiohn.network.known| because it will always be true.
     *
     * Instead, we use |_currentNetwork| to indicate if current connecting
     * network is new or known network.
     *
     * When system connect to network by user's tap on UI, |_currentNetwork|
     * will point to same network as |wifiManager.connection.network|.
     *
     * On the other hand, if system connect to network automatically under
     * conditions like wifi enable, move into AP's range, or reconnect to
     * other network after delete current connected network, |_currentNetwork|
     * will be null, while |wifiManager.connection.network| contains
     * information about current network.
     *
     * @memberOf WifiContext
     */
    _updateNetworkStatus: function() {
      var networkStatus = wifiManager.connection.status;
      if (networkStatus === 'connectingfailed' && _currentNetwork) {
        if (_currentNetwork.known === false) {
          // Connection fail on user-activated unknown network, should be wrong
          // password, delete network and force a new authentication dialog.
          delete(_currentNetwork.password);
          this.forgetNetwork(_currentNetwork);
          this._wifiWrongPassword();
        }
      }
    },

    /**
     * When wifi is enabled, we will make sure the mozSettings is sync
     * with hardward status and call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiEnabled: function() {
      var self = this;
      this._syncWifiEnabled(true, function() {
        self._wifiEnabledListeners.forEach(function(listener) {
          listener();
        });
      });
    },

    /**
     * When wifi is disabled, we will make sure the mozSettings is sync
     * with hardward status and call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiDisabled: function() {
      var self = this;
      this._syncWifiEnabled(false, function() {
        self._wifiDisabledListeners.forEach(function(listener) {
          listener();
        });
      });
    },

    /**
     * When wifi's status is changed, we will call all registered listeners.
     *
     * @memberOf WifiContext
     */
    _wifiStatusChange: function(event) {
      this._wifiStatusChangeListeners.forEach(function(listener) {
        listener(event);
      });
    },

    /**
     * When text of wifiStatus is changed, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiStatusTextChange: function() {
      this._wifiStatusTextChangeListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * When wifi connection fails, we will call all registered
     * listeners.
     *
     * @memberOf WifiContext
     */
    _wifiWrongPassword: function() {
      this._wifiWrongPasswordListeners.forEach(function(listener) {
        listener();
      });
    },

    /**
     * Keep mac address in mozSettings
     *
     * @memberOf WifiContext
     */
    _storeMacAddress: function() {
      if (!wifiManager) {
        return;
      }
      // Store the MAC address in the Settings database.  Note: the wifiManager
      // sets macAddress to the string `undefined' when it is not available.
      if (settings && wifiManager.macAddress &&
        wifiManager.macAddress !== this._macAddress &&
          wifiManager.macAddress !== 'undefined') {
            this._macAddress = wifiManager.macAddress;
            settings.createLock().set({ 'deviceinfo.mac': this._macAddress });
      }
    },

    /**
     * Keep the setting in sync with the hardware state.  We need to do this
     * because b2g/dom/wifi/WifiWorker.js can turn the hardware on and off.
     *
     * @memberOf WifiContext
     * @param {Boolean} enabled
     * @param {Function} callback
     */
    _syncWifiEnabled: function(enabled, callback) {
      SettingsCache.getSettings(function(results) {
        var wifiEnabled = results['wifi.enabled'];
        if (wifiEnabled !== enabled) {
          settings.createLock().set({'wifi.enabled': enabled});
        }
        callback();
      });
    },
    /**
     * This is an internal function that can help us find out the matched
     * callback from catched listeners and remove it
     *
     * @memberOf WifiContext
     * @param {Array} listeners
     * @param {Function} callback
     */
    _removeEventListener: function(listeners, callback) {
      var index = listeners.indexOf(callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    },
    /**
     * This is a wrapper of WifiManger.associate to make sure we can handle
     * our internal status at the same time.
     *
     * @memberOf WifiContext
     * @param {Object} network
     * @param {Function} callback
     */
    associateNetwork: function(network, cb) {
      cb = cb || function() {};
      var request = wifiManager.associate(network);
      var done = function() {
        if (!request.error) {
          _currentNetwork = network;
        }
        cb(request.error);
      };
      request.onsuccess = done;
      request.onerror = done;
    },
    /**
     * This is a wrapper of WifiManger.forget to make sure we can handle
     * our internal status at the same time.
     *
     * @memberOf WifiContext
     * @param {Object} network
     * @param {Function} callback
     */
    forgetNetwork: function(network, cb) {
      cb = cb || function() {};
      var request = wifiManager.forget(network);
      var done = function() {
        if (!request.error) {
          _currentNetwork = null;
        }
        cb(request.error);
      };
      request.onsuccess = done;
      request.onerror = done;
    }
  };

  WifiContext._init();

  return {
    addEventListener: function(eventName, callback) {
      if (eventName === 'wifiEnabled') {
        WifiContext._wifiEnabledListeners.push(callback);
      } else if (eventName === 'wifiDisabled') {
        WifiContext._wifiDisabledListeners.push(callback);
      } else if (eventName === 'wifiStatusChange') {
        WifiContext._wifiStatusChangeListeners.push(callback);
      } else if (eventName === 'wifiStatusTextChange') {
        WifiContext._wifiStatusTextChangeListeners.push(callback);
      } else if (eventName === 'wifiWrongPassword') {
        WifiContext._wifiWrongPasswordListeners.push(callback);
      }
    },
    removeEventListener: function(eventName, callback) {
      if (eventName === 'wifiEnabled') {
        WifiContext._removeEventListener(
          WifiContext._wifiEnabledListeners, callback);
      } else if (eventName === 'wifiDisabled') {
        WifiContext._removeEventListener(
          WifiContext._wifiDisabledListeners, callback);
      } else if (eventName === 'wifiStatusChange') {
        WifiContext._removeEventListener(
          WifiContext._wifiStatusChangeListeners, callback);
      } else if (eventName === 'wifiStatusTextChange') {
        WifiContext._removeEventListener(
          WifiContext._wifiStatusTextChangeListeners, callback);
      } else if (eventName === 'wifiWrongPassword') {
        WifiContext._removeEventListener(
          WifiContext._wifiWrongPasswordListeners, callback);
      }
    },
    get wifiStatusText() {
      return WifiContext._wifiStatusText;
    },
    get currentNetwork() {
      return _currentNetwork;
    },
    forgetNetwork: WifiContext.forgetNetwork,
    associateNetwork: WifiContext.associateNetwork,
    wpsOptions: _wpsOptions,
    set authOptions(object) {
      _authOptions = {};
      var keys = ['password', 'identity', 'eap', 'authPhase2', 'certificate'];
      keys.forEach(function(key) {
        _authOptions[key] = object[key];
      });
    },
    get authOptions() {
      return _authOptions;
    }
  };
});
