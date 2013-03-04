'use strict';

var WifiManager = {
  init: function wn_init() {
    if ('mozWifiManager' in window.navigator) {
      this.api = window.navigator.mozWifiManager;
      this.changeStatus();
      // Ensure that wifi is on.
      var lock = window.navigator.mozSettings.createLock();
      this.enable(lock);
      this.enableDebugging(lock);

      this.gCurrentNetwork = this.api.connection.network;
      if (this.gCurrentNetwork !== null) {
        this.api.forget(this.gCurrentNetwork);
        this.gCurrentNetwork = null;
      }
    }
  },

  isConnectedTo: function wn_isConnectedTo(network) {
    /**
     * XXX the API should expose a 'connected' property on 'network',
     * and 'gWifiManager.connection.network' should be comparable to 'network'.
     * Until this is properly implemented, we just compare SSIDs and
     * capabilities to tell wether the network is already connected or not.
     */
    if (!this.api) {
      return false;
    }
    var currentNetwork = this.api.connection.network;
    if (!currentNetwork || this.api.connection.status != 'connected')
      return false;
    var key = network.ssid + '+' + network.capabilities.join('+');
    var curkey = currentNetwork.ssid + '+' +
        currentNetwork.capabilities.join('+');
    return (key == curkey);
  },

  scan: function wn_scan(callback) {
    if ('mozWifiManager' in window.navigator) {
      var req = WifiManager.api.getNetworks();
      var self = this;
      req.onsuccess = function onScanSuccess() {
        self.networks = req.result;
        callback(self.networks);
      };
      req.onerror = function onScanError() {
        console.log('Error reading networks: ' + req.error.name);
      };
    } else {
      var fakeNetworks = [
        {
          ssid: 'Mozilla-G',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WPA-EAP'],
          relSignalStrength: 67,
          connected: false
        },
        {
          ssid: 'Livebox 6752',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WEP'],
          relSignalStrength: 32,
          connected: false
        },
        {
          ssid: 'Mozilla Guest',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: [],
          relSignalStrength: 98,
          connected: false
        },
        {
          ssid: 'Freebox 8953',
          bssid: 'xx:xx:xx:xx:xx:xx',
          capabilities: ['WPA2-PSK'],
          relSignalStrength: 89,
          connected: false
        }
      ];
      this.networks = fakeNetworks;
      callback(fakeNetworks);
    }
  },
  enable: function wn_enable(lock) {
    lock.set({'wifi.enabled': true});
  },
  enableDebugging: function wn_enableDebugging(lock) {
    // For bug 819947: turn on wifi debugging output to help track down a bug
    // in wifi. We turn on wifi output only while the FTU app is active.
    this._prevDebuggingValue = false;
    var req = lock.get('wifi.debugging.enabled');
    req.onsuccess = function wn_getDebuggingSuccess() {
      this._prevDebuggingValue = req.result['wifi.debugging.enabled'];
    };
    lock.set({ 'wifi.debugging.enabled': true });
  },
  finish: function wn_finish() {
    if (!this._prevDebuggingValue) {
      var resetLock = window.navigator.mozSettings.createLock();
      resetLock.set({'wifi.debugging.enabled': false});
    }
  },
  getNetwork: function wm_gn(ssid) {
    var network;
    for (var i = 0; i < this.networks.length; i++) {
      if (this.networks[i].ssid == ssid) {
        network = this.networks[i];
        break;
      }
    }
    return network;
  },
  connect: function wn_connect(ssid, password, user, callback) {
    var network = this.getNetwork(ssid);
    this.ssid = ssid;
    var key = this.getSecurityType(network);
      if (key == 'WEP') {
        network.wep = password;
      } else if (key == 'WPA-PSK') {
        network.psk = password;
      } else if (key == 'WPA-EAP') {
          network.password = password;
          if (user && user.length) {
            network.identity = user;
          }
      } else {
        // Connect directly
        this.gCurrentNetwork = network;
        this.api.associate(network);
        return;
      }
    network.keyManagement = key;
    this.gCurrentNetwork = network;
    this.api.associate(network);
  },
  changeStatus: function wn_cs(callback) {
    /**
       * mozWifiManager status
       * see dom/wifi/nsIWifi.idl -- the 4 possible statuses are:
       *  - connecting:
       *        fires when we start the process of connecting to a network.
       *  - associated:
       *        fires when we have connected to an access point but do not yet
       *        have an IP address.
       *  - connected:
       *        fires once we are fully connected to an access point.
       *  - connectingfailed:
       *        fires when we fail to connect to an access point.
       *  - disconnected:
       *        fires when we were connected to a network but have been
       *        disconnected.
    */
    var self = this;
    WifiManager.api.onstatuschange = function(event) {
      UIManager.updateNetworkStatus(self.ssid, event.status);
      if (event.status == 'connected') {
        if (self.networks && self.networks.length) {
          UIManager.renderNetworks(self.networks);
        }
      }
    };

  },

  getSecurityType: function wn_gst(network) {
    var key = network.capabilities[0];
    if (/WEP$/.test(key))
      return 'WEP';
    if (/PSK$/.test(key))
      return 'WPA-PSK';
    if (/EAP$/.test(key))
      return 'WPA-EAP';
    return false;
  },
  isUserMandatory: function wn_ium(ssid) {
    var network = this.getNetwork(ssid);
    return (this.getSecurityType(network).indexOf('EAP') != -1);
  },
  isPasswordMandatory: function wn_ipm(ssid) {
    var network = this.getNetwork(ssid);
    if (!this.getSecurityType(network)) {
      return false;
    }
    return true;
  }
};

