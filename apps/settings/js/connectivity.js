/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the connectivity status in the main panel without
 * requiring the full `wifi.js' + `carrier.js' + `bluetooth.js' libraries.
 */

// create a fake mozMobileConnection if required (e.g. desktop browser)
var gMobileConnection = (function newMobileConnection(window) {
  var navigator = window.navigator;
  if (('mozMobileConnection' in navigator) &&
      navigator.mozMobileConnection &&
      navigator.mozMobileConnection.data)
    return navigator.mozMobileConnection;

  var initialized = false;
  var fakeICCInfo = { shortName: 'Fake Free-Mobile', mcc: 208, mnc: 15 };
  var fakeNetwork = { shortName: 'Fake Orange F', mcc: 208, mnc: 1 };

  function fakeEventListener(type, callback, bubble) {
    if (initialized)
      return;

    // simulates a connection to a data network;
    setTimeout(function fakeCallback() {
      initialized = true;
      callback();
    }, 5000);
  }

  //var automaticNetworkSelection = true;

  return {
    addEventListener: fakeEventListener,
    iccInfo: fakeICCInfo,
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    }
  };
})(this);

// create a fake mozWifiManager if required (e.g. desktop browser)
var gWifiManager = (function(window) {
  var navigator = window.navigator;
  if ('mozWifiManager' in navigator)
    return navigator.mozWifiManager;

  /**
   * fake network list, where each network object looks like:
   * {
   *   ssid              : SSID string (human-readable name)
   *   bssid             : network identifier string
   *   capabilities      : array of strings (supported authentication methods)
   *   relSignalStrength : 0-100 signal level (integer)
   *   connected         : boolean state
   * }
   */

  var fakeNetworks = {
    'Mozilla-G': {
      ssid: 'Mozilla-G',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA-EAP'],
      relSignalStrength: 67,
      connected: false
    },
    'Livebox 6752': {
      ssid: 'Livebox 6752',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WEP'],
      relSignalStrength: 32,
      connected: false
    },
    'Mozilla Guest': {
      ssid: 'Mozilla Guest',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: [],
      relSignalStrength: 98,
      connected: false
    },
    'Freebox 8953': {
      ssid: 'Freebox 8953',
      bssid: 'xx:xx:xx:xx:xx:xx',
      capabilities: ['WPA2-PSK'],
      relSignalStrength: 89,
      connected: false
    }
  };

  function getFakeNetworks() {
    var request = { result: fakeNetworks };

    setTimeout(function() {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 1000);

    return request;
  }

  return {
    // true if the wifi is enabled
    enabled: false,

    // enables/disables the wifi
    setEnabled: function fakeSetEnabled(bool) {
      var self = this;
      var request = { result: bool };

      setTimeout(function() {
        if (request.onsuccess) {
          request.onsuccess();
        }
        if (bool) {
          self.onenabled();
        } else {
          self.ondisabled();
        }
      });

      self.enabled = bool;
      return request;
    },

    // returns a list of visible/known networks
    getNetworks: getFakeNetworks,
    getKnownNetworks: getFakeNetworks,

    // selects a network
    associate: function fakeAssociate(network) {
      var self = this;
      var connection = { result: network };
      var networkEvent = { network: network };

      setTimeout(function fakeConnecting() {
        self.connection.network = network;
        self.connection.status = 'connecting';
        self.onstatuschange(networkEvent);
      }, 0);

      setTimeout(function fakeAssociated() {
        self.connection.network = network;
        self.connection.status = 'associated';
        self.onstatuschange(networkEvent);
      }, 1000);

      setTimeout(function fakeConnected() {
        network.connected = true;
        self.connected = network;
        self.connection.network = network;
        self.connection.status = 'connected';
        self.onstatuschange(networkEvent);
      }, 2000);

      return connection;
    },

    // forgets a network (disconnect)
    forget: function fakeForget(network) {
      var self = this;
      var networkEvent = { network: network };

      setTimeout(function() {
        network.connected = false;
        self.connected = null;
        self.connection.network = null;
        self.connection.status = 'disconnected';
        self.onstatuschange(networkEvent);
      }, 0);
    },

    // event listeners
    onenabled: function(event) {},
    ondisabled: function(event) {},
    onstatuschange: function(event) {},

    // returns a network object for the currently connected network (if any)
    connected: null,

    connection: {
      status: 'disconnected',
      network: null
    }
  };
})(this);

// TODO: create a fake mozBluetooth if required
// TODO: handle hotspot status

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _ = navigator.mozL10n.get;

  function init() {
    // these listeners are replaced when wifi.js is loaded
    gWifiManager.onenabled = updateWifi;
    gWifiManager.ondisabled = updateWifi;
    gWifiManager.onstatuschange = updateWifi;
    updateWifi();

    // this event listener is not cleared by carrier.js
    gMobileConnection.addEventListener('datachange', updateCarrier);
    updateCarrier();

    // report bluetooth enabled/disabled state
    addBluetoothObserver();
  }

  function updateWifi() {
    // network.connection.status has one of the following values:
    // connecting, associated, connected, connectingfailed, disconnected.
    document.getElementById('wifi-desc').textContent = _('fullStatus-' +
        gWifiManager.connection.status,
        gWifiManager.connection.network);
  }

  function updateCarrier() {
    var data = gMobileConnection.data ? gMobileConnection.data.network : null;
    var name = data ? (data.shortName || data.longName) : '';
    document.getElementById('data-desc').textContent = name;
  }

  // XXX this should be replaced by a real event handler ASAP
  var lastBluetoothSettingValue = false;
  function addBluetoothObserver() {
    var settings = Settings.mozSettings;
    if (!settings)
      return;

    function updateBluetoothState(enabled) {
      document.getElementById('bluetooth-desc').textContent =
        enabled ? _('enabled') : _('disabled');
    }

    // for now, we just display if bluetooth is enabled or disabled
    // TODO: full bluetooth status (including paired devices)
    settings.addObserver('bluetooth.enabled', function(event) {
      var enabled = event.settingValue;
      if (lastBluetoothSettingValue == enabled)
        return;
      updateBluetoothState(enabled);
    });

    // startup, update status
    var req = settings.createLock().get('bluetooth.enabled');
    req.onsuccess = function bt_getSettingsSuccess() {
      lastBluetoothSettingValue = req.result['bluetooth.enabled'];
      updateBluetoothState(lastBluetoothSettingValue);
    };
  }

  return {
    init: init,
    updateWifi: updateWifi,
    updateCarrier: updateCarrier,
    get statusText() {
      return {
        wifi: document.getElementById('wifi-desc').textContent,
        carrier: document.getElementById('data-desc').textContent,
        hotspot: document.getElementById('hotspot-desc').textContent,
        bluetooth: document.getElementById('bluetooth-desc').textContent
      };
    }
  };
})(this, document);

// startup
onLocalized(Connectivity.init.bind(Connectivity));

