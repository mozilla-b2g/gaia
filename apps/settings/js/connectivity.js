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
  var fakeVoice = {
    state: 'notSearching',
    roaming: true,
    connected: true,
    emergencyCallsOnly: false
  };

  function fakeEventListener(type, callback, bubble) {
    if (initialized)
      return;

    // simulates a connection to a data network;
    setTimeout(function fakeCallback() {
      initialized = true;
      callback();
    }, 5000);
  }

  return {
    addEventListener: fakeEventListener,
    iccInfo: fakeICCInfo,
    get data() {
      return initialized ? { network: fakeNetwork } : null;
    },
    get voice() {
      return initialized ? fakeVoice : null;
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
    macAddress: 'xx:xx:xx:xx:xx:xx',

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

// create a fake mozWifiManager if required (e.g. desktop browser)
var gBluetooth = (function(window) {
  var navigator = window.navigator;
  if ('mozBluetooth' in navigator)
    return navigator.mozBluetooth;
  return null;
})(this);


// TODO: handle hotspot status

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _ = navigator.mozL10n.get;
  var wifiEnabledListeners = [updateWifi];
  var wifiDisabledListeners = [updateWifi];
  var wifiStatusChangeListeners = [updateWifi];
  var settings = Settings.mozSettings;

  //
  // Set wifi.enabled so that it mirrors the state of the hardware.
  // wifi.enabled is not an ordinary user setting because the system
  // turns it on and off when wifi goes up and down.
  //
  settings.createLock().set({'wifi.enabled': gWifiManager.enabled});

  //
  // Now register callbacks to track the state of the wifi hardware
  //
  gWifiManager.onenabled = function() {
    dispatchEvent(new CustomEvent('wifi-enabled'));
    wifiEnabled();
  };
  gWifiManager.ondisabled = function() {
    dispatchEvent(new CustomEvent('wifi-disabled'));
    wifiDisabled();
  };
  gWifiManager.onstatuschange = wifiStatusChange;

  function init() {
    updateWifi();

    // this event listener is not cleared by carrier.js
    kCardState = {
      'pinRequired' : _('simCardLockedMsg'),
      'pukRequired' : _('simCardLockedMsg'),
      'absent' : _('noSimCard')
    };
    gMobileConnection.addEventListener('datachange', updateCarrier);
    updateCarrier();

    // these listeners are replaced when bluetooth.js is loaded
    gBluetooth.onadapteradded = function() {
      dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
      updateBluetooth();
    };
    gBluetooth.ondisabled = function() {
      dispatchEvent(new CustomEvent('bluetooth-disabled'));
      updateBluetooth();
    };
    updateBluetooth();
    initSystemMessageHandler();
  }

  /**
   * Wifi Manager
   */

  var wifiDesc = document.getElementById('wifi-desc');

  function updateWifi() {
    // network.connection.status has one of the following values:
    // connecting, associated, connected, connectingfailed, disconnected.
    wifiDesc.textContent = _('fullStatus-' +
        gWifiManager.connection.status,
        gWifiManager.connection.network);

    // record the MAC address here because the "Device Information" panel
    // has to display it as well
    if (settings) {
      settings.createLock().set({ 'deviceinfo.mac': gWifiManager.macAddress });
    }
  }

  function wifiEnabled() {
    // Keep the setting in sync with the hardware state.
    // We need to do this because b2g/dom/wifi/WifiWorker.js can turn
    // the hardware on and off
    settings.createLock().set({'wifi.enabled': true});
    wifiEnabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiDisabled() {
    // Keep the setting in sync with the hardware state.
    settings.createLock().set({'wifi.enabled': false});
    wifiDisabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiStatusChange(event) {
    wifiStatusChangeListeners.forEach(function(listener) { listener(event); });
  }

  /**
   * Mobile Connection Manager
   */

  var kCardState; // see init()
  var kDataType = {
    'lte' : '4G LTE',
    'ehrpd': 'CDMA',
    'hspa+': '3.5G HSPA+',
    'hsdpa': '3.5G HSDPA',
    'hsupa': '3.5G HSDPA',
    'hspa' : '3.5G HSDPA',
    'evdo0': '3G CDMA',
    'evdoa': '3G CDMA',
    'evdob': '3G CDMA',
    '1xrtt': '3G CDMA',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '2G CDMA',
    'is95b': '2G CDMA',
    'gprs' : '2G GPRS'
  };

  var dataDesc = document.getElementById('data-desc');

  function updateCarrier() {
    var setCarrierStatus = function(msg) {
      var operator = msg.operator || '';
      var data = msg.data || '';
      var text = msg.error ||
        ((data && operator) ? (operator + ' - ' + data) : operator);
      dataDesc.textContent = text;

      /**
       * XXX italic style for specifying state change is not a ideal solution
       * for non-Latin alphabet scripts in terms of typography, e.g. Chinese,
       * Japanese, etc.
       * We might have to switch to labels with parenthesis for these languages.
       */
      dataDesc.style.fontStyle = msg.error ? 'italic' : 'normal';

      // in case the "Carrier & Data" panel is displayed...
      var dataNetwork = document.getElementById('dataNetwork-desc');
      var dataConnection = document.getElementById('dataConnection-desc');
      if (dataNetwork && dataConnection) {
        dataNetwork.textContent = operator;
        dataConnection.textContent = data;
      }
    }

    if (!gMobileConnection)
      return setCarrierStatus({});

    // ensure the SIM card is present and unlocked
    var cardState = kCardState[gMobileConnection.cardState];
    if (cardState)
      return setCarrierStatus({ error: cardState });

    // operator name & data connection type
    if (!gMobileConnection.data || !gMobileConnection.data.network)
      return setCarrierStatus({ error: '???'}); // XXX should never happen
    var operatorInfos = MobileOperator.userFacingInfo(gMobileConnection);
    var operator = operatorInfos.operator;
    if (operatorInfos.region) {
      operator += ' ' + operatorInfos.region;
    }
    var data = gMobileConnection.data;
    var dataType = (data.connected && data.type) ? kDataType[data.type] : '';
    setCarrierStatus({
      operator: operator,
      data: dataType
    });
  }

  /**
   * Bluetooth Manager
   */

  var bluetoothDesc = document.getElementById('bluetooth-desc');

  function updateBluetooth() {
    bluetoothDesc.textContent = gBluetooth.enabled ?
      _('bt-status-nopaired') : _('bt-status-turnoff');
    if (!gBluetooth.enabled) {
      return;
    }
    var req = gBluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      var defaultAdapter = req.result;
      var reqPaired = defaultAdapter.getPairedDevices();
      reqPaired.onsuccess = function bt_getPairedSuccess() {
        // copy for sorting
        var paired = reqPaired.result.slice();
        var length = paired.length;
        if (length == 0) {
          return;
        }
        paired.sort(function(a, b) {
          return a.name > b.name;
        });
        var text = _('bt-status-paired', {
          name: paired[0].name,
          n: length - 1
        });
        bluetoothDesc.textContent = text;
      };
    };
  }

  function initSystemMessageHandler() {
    var handlePairingRequest = function(message, method) {
      window.location.hash = '#bluetooth';
      setTimeout(function() {
        gDeviceList.onRequestPairing(message, method);
      }, 1500);
    }

    // Bind message handler for incoming pairing requests
    navigator.mozSetMessageHandler('bluetooth-requestconfirmation',
      function bt_gotConfirmationMessage(message) {
        handlePairingRequest(message, 'confirmation');
      }
    );

    navigator.mozSetMessageHandler('bluetooth-requestpincode',
      function bt_gotPincodeMessage(message) {
        handlePairingRequest(message, 'pincode');
      }
    );

    navigator.mozSetMessageHandler('bluetooth-requestpasskey',
      function bt_gotPasskeyMessage(message) {
        handlePairingRequest(message, 'passkey');
      }
    );
  }

  /**
   * Public API, in case a "Connectivity" sub-panel needs it
   */

  return {
    init: init,
    updateWifi: updateWifi,
    updateCarrier: updateCarrier,
    updateBluetooth: updateBluetooth,
    get statusText() {
      return {
        wifi: document.getElementById('wifi-desc').textContent,
        carrier: document.getElementById('data-desc').textContent,
        hotspot: document.getElementById('hotspot-desc').textContent,
        bluetooth: document.getElementById('bluetooth-desc').textContent
      };
    },
    set wifiEnabled(listener) { wifiEnabledListeners.push(listener) },
    set wifiDisabled(listener) { wifiDisabledListeners.push(listener); },
    set wifiStatusChange(listener) { wifiStatusChangeListeners.push(listener); }
  };
})(this, document);


// startup
navigator.mozL10n.ready(Connectivity.init.bind(Connectivity));

