'use strict';

var WifiManager = {

  init: function  wn_init() {

    if ('mozWifiManager' in window.navigator) {
      this.api = window.navigator.mozWifiManager;
      this.changeStatus();
      this.gCurrentNetwork = this.api.connection.network;
    }
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
        console.log('Error reading networks');
      };
    } else {
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
      this.networks = fakeNetworks;
      callback(fakeNetworks);
    }
  },
  enable: function wn_enable(firstTime) {
    var settings = window.navigator.mozSettings;
    settings.createLock().set({'wifi.enabled': true});
  },
  getNetwork: function wm_gn(ssid) {
    return this.networks[ssid];
  },
  connect: function wn_connect(ssid, password, user, callback) {
    var network = this.networks[ssid];
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
        self.isConnected = true;
      } else {
        self.isConnected = false;
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
    return (this.getSecurityType(this.networks[ssid]).indexOf('EAP') != -1);
  },
  isPasswordMandatory: function wn_ipm(ssid) {
    if (!this.getSecurityType(this.networks[ssid])) {
      return false;
    }
    return true;
  }

};
